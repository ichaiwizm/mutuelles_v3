import path from 'node:path'
import fs from 'node:fs'
import type { BrowserWindow } from 'electron'
import { LeadsService } from '../../leads'
import { makeProgressSender } from './Events'
import { RunnerQueue } from './TaskQueue'
import { Db } from './DbPersistence'
import { buildTasks } from './TaskBuilder'
import { createBrowserTracker } from './BrowserTracker'
import { makeFinalizer } from './Finalizer'
import { makeTaskExecutor } from './TaskExecutor'
import type { Mode, RunContext, RunProgressEvent, RunRequest } from './types'

function makeId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}` }

export class ScenariosRunner {
  private projectRoot = process.cwd()
  private activeRuns = new Map<string, RunContext>()

  async run(payload: RunRequest, sender?: BrowserWindow) {
    const runId = makeId('scn')
    const send = makeProgressSender(sender, runId)

    const leadsSvc = new LeadsService()
    const mode: Mode = payload.options?.mode || 'headless'
    const displayMode: 'headless' | 'headless-minimized' | 'visible' = (payload.options as any)?.displayMode || (mode === 'headless' ? 'headless' : 'visible')
    const concurrency = Math.max(1, Math.min(15, payload.options?.concurrency ?? 2))
    const keepOpen = payload.options?.keepBrowserOpen ?? false
    const retryFailed = payload.options?.retryFailed ?? false
    const maxRetries = Math.max(0, Math.min(5, payload.options?.maxRetries ?? 1))

    const db = Db.conn()
    const platformsSelected = db.prepare(`SELECT slug, id FROM platforms_catalog WHERE selected = 1 ORDER BY name`).all() as Array<{slug:string; id:number}>
    const allSlugs = payload.platformSlugs && payload.platformSlugs.length ? payload.platformSlugs : platformsSelected.map(p => p.slug)

    setTimeout(async () => {
      const { taskDefs, earlyErrors } = buildTasks(this.projectRoot, payload.leadIds, allSlugs, payload.flowOverrides)

      send({ type:'run-start', runId, message: `Démarrage (${taskDefs.length} items)` })

      try {
        Db.createRun({ id: runId, status: 'running', mode, concurrency, total_items: taskDefs.length + earlyErrors.length, started_at: new Date().toISOString(), settings_snapshot: JSON.stringify(payload.options || {}) })
      } catch (err) {
        console.error('[Runner] Failed to create run in DB:', err)
      }

      // items-queued
      send({ type:'items-queued', runId, items: taskDefs.map(def => ({ itemId: def.itemId, leadId: def.leadId, platform: def.platform, flowSlug: def.flowSlug })) })

      // Create pending items + early errors
      try {
        await Promise.all(taskDefs.map(async (def) => {
          const lead = await leadsSvc.getLead(def.leadId)
          const leadName = lead ? `${lead.data.subscriber?.firstName || ''} ${lead.data.subscriber?.lastName || ''}`.trim() : def.leadId
          const platformNameRow = db.prepare('SELECT name FROM platforms_catalog WHERE slug = ?').get(def.platform) as {name?:string}|undefined
          Db.createItem({ id: def.itemId, run_id: runId, lead_id: def.leadId, lead_name: leadName || def.leadId, platform: def.platform, platform_name: platformNameRow?.name || def.platform, flow_slug: def.flowSlug, flow_name: def.flowSlug, status: 'pending', run_dir: undefined, attempt_number: 1 })
          Db.incrementRunCounter(runId, 'pending_items')
        }))

        for (const evt of earlyErrors) {
          Db.createItem({ id: evt.itemId, run_id: runId, lead_id: evt.leadId || '', lead_name: evt.leadId || '', platform: evt.platform || '', platform_name: evt.platform || '', flow_slug: evt.flowSlug || '', flow_name: evt.flowSlug || '', status: 'error', run_dir: undefined, attempt_number: 1 })
          Db.updateItem(evt.itemId, { error_message: evt.message, completed_at: new Date().toISOString() })
          Db.incrementRunCounter(runId, 'error_items')
        }
      } catch (err) {
        console.error('[Runner] Failed to create items in DB:', err)
      }

      for (const evt of earlyErrors) send({ ...evt, runId })

      const queue = new RunnerQueue(concurrency)
      const taskDefsMap = new Map<string, any>()
      taskDefs.forEach(def => taskDefsMap.set(def.itemId, def))

      const runContext: RunContext = {
        queue,
        startedAt: new Date(),
        sender,
        taskDefs: taskDefsMap,
        activeTasks: taskDefs.length,
        mode,
        keepOpen,
        retryFailed,
        maxRetries,
        leadsSvc,
        runId,
        executeWithRetry: null as any,
        isStopped: false,
        activeBrowsers: new Map(),
        cancelledItems: new Set(),
        displayMode,
        windowInfos: new Map()
      }

      const browserTracker = createBrowserTracker(runContext)
      const { createWindowTracker } = await import('./WindowTracker')
      const windowTracker = createWindowTracker(runContext)
      const { finalizeRun, checkCompletion } = makeFinalizer(runContext, send)
      const { executeWithRetry } = makeTaskExecutor(runContext, {
        send,
        onTrackBrowser: (id, b, c) => { browserTracker.track(id, b, c); windowTracker.track(id, b, c) },
        onUntrackBrowser: (id) => browserTracker.untrack(id),
        checkCompletion
      })
      runContext.executeWithRetry = executeWithRetry
      this.activeRuns.set(runId, runContext)

      for (const def of taskDefs) {
        queue.add(() => executeWithRetry(def)).catch(err => console.error('[Runner] Task execution failed:', err))
      }
    }, 0)

    return { runId }
  }

  async stop(runId: string): Promise<{ success: boolean; message: string; cancelledCount?: number }> {
    const runContext = this.activeRuns.get(runId)
    if (!runContext) {
      return { success: false, message: 'Run introuvable ou déjà terminé' }
    }

    // silent
    runContext.isStopped = true
    // silent

    // Stop queue first to prevent new tasks from starting
    const queueCancelledCount = runContext.queue.stop()
    // silent

    // Force-close browsers (best-effort)
    const { createBrowserTracker } = await import('./BrowserTracker')
    const tracker = createBrowserTracker(runContext)
    await tracker.closeAll()
    // silent

    const { pending, running } = Db.getCountsForStop(runId)
    // silent
    const dbCancelledCount = Db.cancelPendingItems(runId)
    // silent

    try {
      const completedAt = new Date().toISOString()
      const durationMs = runContext.startedAt ? Date.now() - runContext.startedAt.getTime() : null
      Db.updateRun(runId, { status: 'stopped', completed_at: completedAt, duration_ms: durationMs })
      Db.incrementRunCounter(runId, 'pending_items', -pending)
      // Count cancelled separately
      Db.incrementRunCounter(runId, 'cancelled_items', dbCancelledCount)
      // silent
    } catch (err) {
      console.error('[Runner] Failed to update run status on stop:', err)
    }

    this.activeRuns.delete(runId)
    if (runContext.sender) {
      try {
        runContext.sender.webContents.send(`scenarios:progress:${runId}`, { type:'run-cancelled', runId, message: `Arrêté (${queueCancelledCount + dbCancelledCount} tâches annulées)` } as RunProgressEvent)
      } catch (err) { console.error('Failed to send cancellation event:', err) }
    }

    const totalCancelled = queueCancelledCount + dbCancelledCount
    return { success: true, message: `Run arrêté avec succès (${totalCancelled} tâches annulées)`, cancelledCount: totalCancelled }
  }

  async stopItem(runId: string, itemId: string): Promise<{ success: boolean; message: string }> {
    const runContext = this.activeRuns.get(runId)
    if (!runContext) {
      return { success: false, message: 'Run introuvable ou déjà terminée' }
    }
    if (!itemId) {
      return { success: false, message: 'Item ID manquant' }
    }

    // Mark item as cancelled-requested; executor will honor it even if pending
    runContext.cancelledItems.add(itemId)

    // If running, try to close its browser/context immediately
    try {
      const { createBrowserTracker } = await import('./BrowserTracker')
      const tracker = createBrowserTracker(runContext)
      await tracker.closeOne(itemId)
    } catch (err) {
      console.debug('[Runner] stopItem closeOne error:', err instanceof Error ? err.message : err)
    }

    return { success: true, message: 'Item en cours d\'annulation' }
  }

  async minimizeItemWindow(runId: string, itemId: string): Promise<{ success: boolean; message: string }> {
    const runContext = this.activeRuns.get(runId)
    if (!runContext) return { success: false, message: 'Run introuvable' }
    try {
      const { createWindowTracker } = await import('./WindowTracker')
      const w = createWindowTracker(runContext)
      const ok = await w.minimize(itemId)
      return { success: ok, message: ok ? 'Fenêtre minimisée' : 'Impossible de minimiser' }
    } catch (e:any) { return { success: false, message: e?.message || 'Erreur' } }
  }

  async restoreItemWindow(runId: string, itemId: string): Promise<{ success: boolean; message: string }> {
    const runContext = this.activeRuns.get(runId)
    if (!runContext) return { success: false, message: 'Run introuvable' }
    try {
      const { createWindowTracker } = await import('./WindowTracker')
      const w = createWindowTracker(runContext)
      const ok = await w.restore(itemId)
      return { success: ok, message: ok ? 'Fenêtre restaurée' : 'Impossible de restaurer' }
    } catch (e:any) { return { success: false, message: e?.message || 'Erreur' } }
  }

  async getItemWindowState(runId: string, itemId: string): Promise<{ success: boolean; state?: string; message?: string }> {
    const runContext = this.activeRuns.get(runId)
    if (!runContext) return { success: false, message: 'Run introuvable' }
    try {
      const { createWindowTracker } = await import('./WindowTracker')
      const w = createWindowTracker(runContext)
      const state = await w.getState(itemId)
      return { success: true, state: state || undefined }
    } catch (e:any) { return { success: false, message: e?.message || 'Erreur' } }
  }

  requeueItem(runId: string, itemId: string): { success: boolean; message: string } {
    const runContext = this.activeRuns.get(runId)
    if (!runContext) return { success: false, message: 'Run introuvable ou déjà terminée' }
    const taskDef = runContext.taskDefs.get(itemId)
    if (!taskDef) return { success: false, message: 'Item introuvable dans cette run' }

    runContext.activeTasks++
    try {
      Db.updateItem(itemId, { status: 'pending', error_message: null, started_at: null, completed_at: null, duration_ms: null, current_step: null })
      Db.incrementRunCounter(runId, 'error_items', -1)
      Db.incrementRunCounter(runId, 'pending_items')
    } catch (err) { console.error('[Runner] Failed to update requeue in DB:', err) }

    if (runContext.sender) {
      try { runContext.sender.webContents.send(`scenarios:progress:${runId}`, { type:'item-requeued', runId, itemId, leadId: taskDef.leadId, platform: taskDef.platform, flowSlug: taskDef.flowSlug } as RunProgressEvent) } catch (err) { console.error('Failed to send requeue event:', err) }
    }

    runContext.queue.add(() => runContext.executeWithRetry(taskDef)).catch(err => console.error('[Runner] Requeued task execution failed:', err))
    // silent
    return { success: true, message: 'Item remis en queue avec succès' }
  }

  requeueItems(runId: string, itemIds: string[]): { success: boolean; message: string; requeuedCount?: number } {
    const runContext = this.activeRuns.get(runId)
    if (!runContext) return { success: false, message: 'Run introuvable ou déjà terminée' }
    let requeuedCount = 0
    for (const itemId of itemIds) {
      const res = this.requeueItem(runId, itemId)
      if (res.success) requeuedCount++
    }
    return { success: true, message: `${requeuedCount} item(s) remis en queue`, requeuedCount }
  }
}
