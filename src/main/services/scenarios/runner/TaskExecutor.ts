import fs from 'node:fs'
import path from 'node:path'
import { Db } from './DbPersistence'
import { execHL } from './ExecHL'
import type { RunContext, TaskDef } from './types'
import { createLogger } from '../../logger'

const logger = createLogger('TaskExecutor')

export function makeTaskExecutor(runContext: RunContext, deps: {
  send: (e:any)=>void
  onTrackBrowser: (itemId:string, browser:any, context:any)=>void
  onUntrackBrowser: (itemId:string)=>void
  checkCompletion: ()=>void
}) {
  const { runId, retryFailed, maxRetries, mode, keepOpen } = runContext

  const executeWithRetry = async (def: TaskDef, attempt: number = 0): Promise<void> => {
    if (runContext.isStopped || runContext.cancelledItems.has(def.itemId)) {
      // Run was stopped before this item started: mark as cancelled and fix counters
      const completedAt = new Date().toISOString()
      try {
        Db.updateItem(def.itemId, {
          status: 'cancelled',
          completed_at: completedAt,
          error_message: "Arrêté par l'utilisateur (avant démarrage)"
        })
        // Decrement pending if it was counted, and bump cancelled
        Db.incrementRunCounter(runId, 'pending_items', -1)
        Db.incrementRunCounter(runId, 'cancelled_items', 1)
      } catch (err) {
        logger.error('[Runner] Failed to mark item as cancelled (pre-start):', err)
      }
      return
    }

    const isRetry = attempt > 0
    // Cooperative pause gate (per item) – no DB status change
    const pauseGate = async (_where: 'begin' | 'before-step', _stepIndex?: number) => {
      while (runContext.pausedItems.has(def.itemId)) {
        if (runContext.isStopped || runContext.cancelledItems.has(def.itemId)) {
          throw new Error('Item cancelled by user')
        }
        await new Promise(r => setTimeout(r, 350))
      }
    }

    // Honor pause before any start/attempt creation
    await pauseGate('begin')

    const startedAt = new Date().toISOString()

    deps.send({ type:'item-start', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform, flowSlug: def.flowSlug, message: isRetry ? `Tentative ${attempt + 1}/${maxRetries + 1}` : undefined })

    // Defer attempt persistence until we know the final status for this attempt

    try {
      Db.updateItem(def.itemId, { status: 'running', started_at: startedAt, attempt_number: attempt + 1 })
      if (!isRetry) Db.incrementRunCounter(runId, 'pending_items', -1)
    } catch (err) {
      logger.error('[Runner] Failed to update item start in DB:', err)
    }

    // Flow step count for progress
    let totalSteps = 0
    try { const flowData = JSON.parse(fs.readFileSync(def.flowFile, 'utf-8')); totalSteps = flowData.steps?.length || 0 } catch {}
    if (totalSteps > 0) deps.send({ type:'item-progress', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform, flowSlug: def.flowSlug, currentStep: 0, totalSteps })

    let runDir: string | undefined = undefined
    try {
      const lead = await runContext.leadsSvc.getLead(def.leadId)
      if (!lead) throw new Error('Lead introuvable')

      const progressCallback = (p: any) => {
        deps.send({ type: 'item-progress', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform, flowSlug: def.flowSlug, currentStep: p.stepIndex + 1, totalSteps: p.totalSteps, stepMessage: p.stepMessage })
        try { Db.updateItem(def.itemId, { current_step: p.stepIndex + 1, total_steps: p.totalSteps }) } catch (err) { logger.error('[runner] Failed to persist step progress:', err) }
      }

      const browserCallback = (browser: any, context: any) => deps.onTrackBrowser(def.itemId, browser, context)

      const result = await execHL({ ...def, mode, leadData: lead.data, keepOpen, onProgress: progressCallback, sessionRunId: runId, onBrowserCreated: browserCallback, pauseGate })
      runDir = result.runDir

      deps.onUntrackBrowser(def.itemId)
      if (totalSteps > 0) deps.send({ type:'item-progress', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform, flowSlug: def.flowSlug, currentStep: totalSteps, totalSteps })
      deps.send({ type:'item-success', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform, flowSlug: def.flowSlug, runDir })

      const completedAt = new Date().toISOString()
      const durationMs = Date.parse(completedAt) - Date.parse(startedAt)
      Db.updateItem(def.itemId, { status: 'success', run_dir: runDir, completed_at: completedAt, duration_ms: durationMs })
      Db.incrementRunCounter(runId, 'success_items')
      try {
        Db.createAttempt({ item_id: def.itemId, attempt_number: attempt + 1, status: 'success', started_at: startedAt, completed_at: completedAt, duration_ms: durationMs })
      } catch (err) { logger.error('[Runner] Failed to persist success attempt:', err) }

      // Persist steps from manifest
      try {
        const manifestPath = path.join(runDir, 'index.json')
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
          if (Array.isArray(manifest.steps)) manifest.steps.forEach((s:any)=>Db.createStepFromManifest(def.itemId, s, runDir!))
        }
      } catch (err) {
        logger.error('[Runner] Failed to create step records:', err)
      }

      runContext.activeTasks--
      // First check (may still see queue as running)
      deps.checkCompletion()
      // Ensure a second check after the queue decremented its internal counter
      setTimeout(() => { try { deps.checkCompletion() } catch (e) { logger.error(e) } }, 0)
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : String(e)
      if (e && typeof e === 'object' && 'runDir' in e) runDir = (e as any).runDir

      // Detect user-initiated stop (run) or per-item cancellation
      const isRunStop = runContext.isStopped
      const isItemCancelled = runContext.cancelledItems.has(def.itemId)

      if (!isRunStop && !isItemCancelled && retryFailed && attempt < maxRetries) {
        try {
          const completedAt = new Date().toISOString()
          const durationMs = Date.parse(completedAt) - Date.parse(startedAt)
          Db.createAttempt({ item_id: def.itemId, attempt_number: attempt + 1, status: 'error', error_message: msg, started_at: startedAt, completed_at: completedAt, duration_ms: durationMs })
        } catch (err) { logger.error('[Runner] Failed to persist error attempt before retry:', err) }

        const delay = attempt === 0 ? 2000 : attempt === 1 ? 5000 : 10000
        await new Promise(r => setTimeout(r, delay))
        return executeWithRetry(def, attempt + 1)
      } else {
        const finalMsg = attempt > 0 ? `${msg} (après ${attempt + 1} tentative(s))` : msg
        const completedAt = new Date().toISOString()
        const durationMs = Date.parse(completedAt) - Date.parse(startedAt)

        if (isRunStop || isItemCancelled) {
          // Treat as user cancellation, not a real error
          deps.send({ type:'item-error', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform, flowSlug: def.flowSlug, message: 'Annulé par l’utilisateur', runDir })
          Db.updateItem(def.itemId, { status: 'cancelled', error_message: 'Annulé par l’utilisateur', run_dir: runDir || undefined, completed_at: completedAt, duration_ms: durationMs })
          // attempts: mark as cancelled if supported; ignore type mismatch silently
          try { Db.createAttempt({ item_id: def.itemId, attempt_number: attempt + 1, status: 'cancelled' as any, error_message: 'Annulé par l’utilisateur', started_at: startedAt, completed_at: completedAt, duration_ms: durationMs }) } catch {}
          Db.incrementRunCounter(runId, 'cancelled_items')
        } else {
          deps.send({ type:'item-error', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform, flowSlug: def.flowSlug, message: finalMsg, runDir })
          Db.updateItem(def.itemId, { status: 'error', error_message: finalMsg, run_dir: runDir || undefined, completed_at: completedAt, duration_ms: durationMs })
          Db.incrementRunCounter(runId, 'error_items')
          try { Db.createAttempt({ item_id: def.itemId, attempt_number: attempt + 1, status: 'error', error_message: finalMsg, started_at: startedAt, completed_at: completedAt, duration_ms: durationMs }) } catch {}
          if (runDir) {
            try {
              const manifestPath = path.join(runDir, 'index.json')
              if (fs.existsSync(manifestPath)) {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
                if (Array.isArray(manifest.steps)) manifest.steps.forEach((s:any)=>Db.createStepFromManifest(def.itemId, s, runDir!))
              }
            } catch (err) { logger.error('[Runner] Failed to create step records:', err) }
          }
        }
        deps.onUntrackBrowser(def.itemId)
        runContext.activeTasks--
        // First check (may still see queue as running)
        deps.checkCompletion()
        // Ensure a second check after the queue decremented its internal counter
        setTimeout(() => { try { deps.checkCompletion() } catch (e) { logger.error(e) } }, 0)
      }
    } finally {
      deps.onUntrackBrowser(def.itemId)
    }
  }

  return { executeWithRetry }
}
