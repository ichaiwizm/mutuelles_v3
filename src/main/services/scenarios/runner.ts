import path from 'node:path'
import fs from 'node:fs'
import { BrowserWindow } from 'electron'
import { getDb } from '../../db/connection'
import { revealPassword } from '../platform_credentials'
import { LeadsService } from '../leads'
import { RunnerQueue } from './runner_queue'
import { listHLFlows, pickDefaultFlowForPlatform } from './hl_catalog'
import * as execQueries from '../../../shared/db/queries/executions'

type Mode = 'headless'|'dev'|'dev_private'

export type RunRequest = {
  scenarioId?: string
  platformSlugs?: string[]
  leadIds: string[]
  flowOverrides?: Record<string, string> // platformSlug -> flowSlug mapping
  options?: {
    mode?: Mode
    concurrency?: number
    keepBrowserOpen?: boolean
    retryFailed?: boolean
    maxRetries?: number
  }
}

export type RunProgressEvent = {
  type: 'run-start'|'items-queued'|'item-start'|'item-progress'|'item-success'|'item-error'|'run-done'|'run-cancelled'|'item-requeued'
  runId: string
  itemId?: string
  leadId?: string
  platform?: string
  flowSlug?: string
  message?: string
  runDir?: string
  currentStep?: number
  totalSteps?: number
  stepMessage?: string
  items?: Array<{
    itemId: string
    leadId: string
    platform: string
    flowSlug: string
  }>
}

type TaskDef = {
  itemId: string
  leadId: string
  platform: string
  flowFile: string
  flowSlug: string
  fieldsFile: string
  username: string
  password: string
}

type RunContext = {
  queue: RunnerQueue
  startedAt: Date
  sender?: BrowserWindow
  // For requeue support
  taskDefs: Map<string, TaskDef>
  activeTasks: number
  mode: Mode
  keepOpen: boolean
  retryFailed: boolean
  maxRetries: number
  leadsSvc: LeadsService
  runId: string
  executeWithRetry: (def: TaskDef, attempt?: number) => Promise<void>
  // For stopping execution
  isStopped: boolean
  activeBrowsers: Map<string, { browser: any; context: any; itemId: string }>
}

function makeId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}` }

export class ScenariosRunner {
  private projectRoot = process.cwd()
  private activeRuns = new Map<string, RunContext>()

  async run(payload: RunRequest, sender?: BrowserWindow) {
    const runId = makeId('scn')
    const send = (evt: RunProgressEvent) => {
      if (!sender) {
        console.warn('[Runner] ⚠️  No sender for event:', evt.type, evt.itemId || '')
        return
      }
      try {
        sender.webContents.send(`scenarios:progress:${runId}`, evt)
        console.log(`[Runner] ✅ Sent ${evt.type}${evt.itemId ? ' for ' + evt.itemId.slice(0, 8) : ''}${evt.currentStep !== undefined ? ` (step ${evt.currentStep}/${evt.totalSteps})` : ''}`)
      } catch (err) {
        console.error('[Runner] ❌ IPC send failed:', err, 'Event:', evt.type)
      }
    }

    const db = getDb()
    const leadsSvc = new LeadsService()
    const mode: Mode = payload.options?.mode || 'headless'
    const concurrency = Math.max(1, Math.min(15, payload.options?.concurrency ?? 2))
    const keepOpen = payload.options?.keepBrowserOpen ?? false
    const retryFailed = payload.options?.retryFailed ?? false
    const maxRetries = Math.max(0, Math.min(5, payload.options?.maxRetries ?? 1))

    // Plateformes ciblées: scenario explicite ou plateformes sélectionnées
    const platformsSelected = db.prepare(`SELECT slug, id FROM platforms_catalog WHERE selected = 1 ORDER BY name`).all() as Array<{slug:string; id:number}>
    const allSlugs = payload.platformSlugs && payload.platformSlugs.length ? payload.platformSlugs : platformsSelected.map(p => p.slug)
    const platformIdBySlug = Object.fromEntries(platformsSelected.map(p => [p.slug, p.id]))

    setTimeout(async () => {
      const hl = listHLFlows(this.projectRoot)
      const taskDefs: TaskDef[] = []
      const earlyErrors: RunProgressEvent[] = []

      for (const leadId of payload.leadIds) {
        for (const slug of allSlugs) {
          const itemId = makeId('itm')
          const platformId = platformIdBySlug[slug]
          if (!platformId) { earlyErrors.push({ type:'item-error', runId, itemId, leadId, platform: slug, message:'Plateforme non sélectionnée' }); continue }

          // Use explicit flow override if provided, otherwise use default heuristic
          let flow = null
          if (payload.flowOverrides?.[slug]) {
            flow = hl.find(f => f.slug === payload.flowOverrides![slug])
            if (!flow) { earlyErrors.push({ type:'item-error', runId, itemId, leadId, platform: slug, message:`Flow override '${payload.flowOverrides[slug]}' introuvable` }); continue }
          } else {
            flow = pickDefaultFlowForPlatform(hl, slug)
            if (!flow) { earlyErrors.push({ type:'item-error', runId, itemId, leadId, platform: slug, message:'Aucun flow HL trouvé' }); continue }
          }

          const fieldsFile = path.join(this.projectRoot, 'data', 'field-definitions', `${slug}.json`)
          if (!fs.existsSync(fieldsFile)) { earlyErrors.push({ type:'item-error', runId, itemId, leadId, platform: slug, message:'Field-definitions introuvables' }); continue }
          if (!fs.existsSync(flow.file)) { earlyErrors.push({ type:'item-error', runId, itemId, leadId, platform: slug, message:'Flow HL introuvable' }); continue }
          const credsRow = db.prepare('SELECT username FROM platform_credentials WHERE platform_id = ?').get(platformId) as {username?:string}|undefined
          if (!credsRow?.username) { earlyErrors.push({ type:'item-error', runId, itemId, leadId, platform: slug, message:'Identifiants manquants' }); continue }
          let password = ''
          try { password = revealPassword(platformId) } catch (e) { earlyErrors.push({ type:'item-error', runId, itemId, leadId, platform: slug, message: String(e) }); continue }
          taskDefs.push({ itemId, leadId, platform: slug, flowFile: flow.file, flowSlug: flow.slug, fieldsFile, username: credsRow.username, password })
        }
      }

      send({ type:'run-start', runId, message: `Démarrage (${taskDefs.length} items)` })

      // Create execution run in database
      try {
        execQueries.createRun(db, {
          id: runId,
          status: 'running',
          mode,
          concurrency,
          total_items: taskDefs.length + earlyErrors.length,
          started_at: new Date().toISOString(),
          settings_snapshot: JSON.stringify(payload.options || {})
        })
      } catch (err) {
        console.error('[Runner] Failed to create run in DB:', err)
      }

      // Emit items-queued event with all scheduled items
      send({
        type:'items-queued',
        runId,
        items: taskDefs.map(def => ({
          itemId: def.itemId,
          leadId: def.leadId,
          platform: def.platform,
          flowSlug: def.flowSlug
        }))
      })

      // Create execution items in database (pending)
      try {
        await Promise.all(taskDefs.map(async (def) => {
          const lead = await leadsSvc.getLead(def.leadId)
          const leadName = lead ? `${lead.data.subscriber?.firstName || ''} ${lead.data.subscriber?.lastName || ''}`.trim() : def.leadId
          const platformNameRow = db.prepare('SELECT name FROM platforms_catalog WHERE slug = ?').get(def.platform) as {name?:string}|undefined

          execQueries.createItem(db, {
            id: def.itemId,
            run_id: runId,
            lead_id: def.leadId,
            lead_name: leadName || def.leadId,
            platform: def.platform,
            platform_name: platformNameRow?.name || def.platform,
            flow_slug: def.flowSlug,
            flow_name: def.flowSlug, // Could be enhanced with flow name from catalog
            status: 'pending',
            run_dir: undefined, // Will be set when execution starts
            attempt_number: 1
          })

          // Increment pending counter
          execQueries.incrementRunCounter(db, runId, 'pending_items')
        }))

        // Create error items for early errors
        for (const evt of earlyErrors) {
          if (evt.itemId) {
            execQueries.createItem(db, {
              id: evt.itemId,
              run_id: runId,
              lead_id: evt.leadId || '',
              lead_name: evt.leadId || '',
              platform: evt.platform || '',
              platform_name: evt.platform || '',
              flow_slug: evt.flowSlug || '',
              flow_name: evt.flowSlug || '',
              status: 'error',
              run_dir: undefined,
              attempt_number: 1
            })

            execQueries.updateItem(db, evt.itemId, {
              error_message: evt.message,
              completed_at: new Date().toISOString()
            })

            // Increment error counter
            execQueries.incrementRunCounter(db, runId, 'error_items')
          }
        }
      } catch (err) {
        console.error('[Runner] Failed to create items in DB:', err)
      }

      for (const evt of earlyErrors) send(evt)

      const queue = new RunnerQueue(concurrency)

      // Convert taskDefs array to Map for quick lookup
      const taskDefsMap = new Map<string, TaskDef>()
      taskDefs.forEach(def => taskDefsMap.set(def.itemId, def))

      // Create run context (we'll update it with executeWithRetry later)
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
        executeWithRetry: null as any,  // Will be set below
        isStopped: false,  // Stop flag for graceful shutdown
        activeBrowsers: new Map()  // Track browser instances for force-close
      }

      // Helper function to finalize a run (mark as completed/failed in DB)
      const finalizeRun = (finalStatus: 'completed' | 'failed' | 'stopped') => {
        console.log(`[Runner] Finalizing run ${runId} with status: ${finalStatus}`)

        // Update run status in database
        try {
          const completedAt = new Date().toISOString()
          // Defensive check: ensure startedAt exists before calling getTime()
          const durationMs = runContext.startedAt ? Date.now() - runContext.startedAt.getTime() : null

          execQueries.updateRun(db, runId, {
            status: finalStatus,
            completed_at: completedAt,
            duration_ms: durationMs
          })

          console.log(`[Runner] ✅ Run ${runId.slice(0,8)} marked as ${finalStatus} in DB`)
        } catch (err) {
          console.error('[Runner] Failed to update run completion in DB:', err)
        }

        this.activeRuns.delete(runId)
        send({ type:'run-done', runId, message: finalStatus === 'completed' ? 'Terminé' : `Terminé (${finalStatus})` })
      }

      // Helper function to check if ALL items in DB are completed
      const checkDbCompletion = (): boolean => {
        try {
          const counts = db.prepare(`
            SELECT
              COUNT(*) as total,
              SUM(CASE WHEN status IN ('success', 'error') THEN 1 ELSE 0 END) as completed
            FROM execution_items
            WHERE run_id = ?
          `).get(runId) as { total: number; completed: number }

          console.log(`[Runner] DB check: ${counts.completed}/${counts.total} items completed`)

          return counts.total > 0 && counts.completed === counts.total
        } catch (err) {
          console.error('[Runner] Failed to check DB completion:', err)
          return false
        }
      }

      // Helper function to check if run is complete
      const checkCompletion = () => {
        console.log(`[Runner] checkCompletion: activeTasks=${runContext.activeTasks}, queueRunning=${queue.isRunning}`)

        // Primary check: activeTasks counter
        if (runContext.activeTasks === 0 && !queue.isRunning) {
          console.log('[Runner] All tasks completed (via counter), finalizing run')

          // Determine final status based on error count
          const hasErrors = db.prepare('SELECT COUNT(*) as count FROM execution_items WHERE run_id = ? AND status = ?')
            .get(runId, 'error') as { count: number }

          const finalStatus = hasErrors.count > 0 ? 'failed' : 'completed'
          finalizeRun(finalStatus)
          return
        }

        // Fallback check: Query DB to see if all items are actually completed
        // This handles cases where activeTasks counter got out of sync
        if (checkDbCompletion() && !queue.isRunning) {
          console.log('[Runner] ⚠️  All tasks completed in DB but activeTasks counter was wrong! Finalizing anyway.')

          const hasErrors = db.prepare('SELECT COUNT(*) as count FROM execution_items WHERE run_id = ? AND status = ?')
            .get(runId, 'error') as { count: number }

          const finalStatus = hasErrors.count > 0 ? 'failed' : 'completed'
          finalizeRun(finalStatus)
        }
      }

      // Helper function to execute with retry logic
      const executeWithRetry = async (def: TaskDef, attempt: number = 0): Promise<void> => {
        // CHECK 1: Early exit if run was stopped
        if (runContext.isStopped) {
          console.log(`[Runner] Skipping execution of ${def.itemId} - run was stopped`)

          // Mark item as cancelled in DB
          try {
            execQueries.updateItem(db, def.itemId, {
              status: 'cancelled',
              completed_at: new Date().toISOString(),
              error_message: 'Arrêté par l\'utilisateur'
            })
          } catch (err) {
            console.error('[Runner] Failed to mark item as cancelled:', err)
          }

          return // Exit early without executing
        }

        const isRetry = attempt > 0
        const startedAt = new Date().toISOString()

        if (isRetry) {
          send({ type:'item-start', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform, flowSlug: def.flowSlug, message: `Tentative ${attempt + 1}/${maxRetries + 1}` })
        } else {
          send({ type:'item-start', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform, flowSlug: def.flowSlug })
        }

        // Create attempt record in database
        try {
          execQueries.createAttempt(db, {
            item_id: def.itemId,
            attempt_number: attempt + 1,
            status: 'running',
            started_at: startedAt
          })
        } catch (err) {
          console.error('[Runner] Failed to create attempt record:', err)
        }

        // Update item status to 'running' in database
        try {
          execQueries.updateItem(db, def.itemId, {
            status: 'running',
            started_at: startedAt,
            attempt_number: attempt + 1
          })

          // Decrement pending, we're now running
          if (!isRetry) {
            execQueries.incrementRunCounter(db, runId, 'pending_items', -1)
          }
        } catch (err) {
          console.error('[Runner] Failed to update item start in DB:', err)
        }

        // Get flow step count for progress tracking
        let totalSteps = 0
        try {
          const flowContent = fs.readFileSync(def.flowFile, 'utf-8')
          const flowData = JSON.parse(flowContent)
          totalSteps = flowData.steps?.length || 0
        } catch (e) {
          // If we can't read flow, just continue without progress
        }

        // Emit initial progress
        if (totalSteps > 0) {
          send({ type:'item-progress', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform, flowSlug: def.flowSlug, currentStep: 0, totalSteps })
        }

        let runDir: string | undefined = undefined

        try {
          const lead = await leadsSvc.getLead(def.leadId)
          if (!lead) throw new Error('Lead introuvable')

          // Create progress callback for real-time step updates
          const progressCallback = (progress: any) => {
            send({
              type: 'item-progress',
              runId,
              itemId: def.itemId,
              leadId: def.leadId,
              platform: def.platform,
              flowSlug: def.flowSlug,
              currentStep: progress.stepIndex + 1,  // stepIndex is 0-based
              totalSteps: progress.totalSteps,
              stepMessage: progress.stepMessage
            })

            // Persist progress to DB
            try {
              execQueries.updateItem(db, def.itemId, {
                current_step: progress.stepIndex + 1,
                total_steps: progress.totalSteps
              })
            } catch (err) {
              console.error('[runner] Failed to persist step progress:', err)
            }
          }

          // Browser tracking callback - stores references for force-close on stop
          const browserCallback = (browser: any, context: any) => {
            console.log(`[Runner] Tracking browser for item ${def.itemId}`)
            runContext.activeBrowsers.set(def.itemId, { browser, context, itemId: def.itemId })
          }

          const result = await this.execHL({
            ...def,
            mode,
            leadData: lead.data,
            keepOpen,
            onProgress: progressCallback,
            sessionRunId: runId,
            onBrowserCreated: browserCallback
          })
          runDir = result.runDir

          // Clean up browser reference after successful execution
          runContext.activeBrowsers.delete(def.itemId)

          // Emit final progress before success
          if (totalSteps > 0) {
            send({ type:'item-progress', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform, flowSlug: def.flowSlug, currentStep: totalSteps, totalSteps })
          }

          send({ type:'item-success', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform, flowSlug: def.flowSlug, runDir })

          // Update item as success in database
          try {
            const completedAt = new Date().toISOString()
            const durationMs = Date.parse(completedAt) - Date.parse(startedAt)

            execQueries.updateItem(db, def.itemId, {
              status: 'success',
              run_dir: runDir,
              completed_at: completedAt,
              duration_ms: durationMs
            })

            // Increment success counter
            execQueries.incrementRunCounter(db, runId, 'success_items')

            // Update attempt record as successful
            execQueries.updateAttempt(db, def.itemId, attempt + 1, {
              status: 'success',
              completed_at: completedAt,
              duration_ms: durationMs
            })

            // Create step records from manifest
            this.createStepRecords(db, def.itemId, runDir)
          } catch (err) {
            console.error('[Runner] Failed to update item success in DB:', err)
          }

          // Task completed successfully - decrement counter
          runContext.activeTasks--
          checkCompletion()
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : String(e)

          // Extract runDir from error if available (enriched by engine)
          if (e instanceof Error && 'runDir' in e) {
            runDir = (e as any).runDir
          }

          // Check if we should retry
          if (retryFailed && attempt < maxRetries) {
            // Mark this attempt as failed before retrying
            try {
              const attemptCompletedAt = new Date().toISOString()
              const attemptDurationMs = Date.parse(attemptCompletedAt) - Date.parse(startedAt)

              execQueries.updateAttempt(db, def.itemId, attempt + 1, {
                status: 'error',
                error_message: errorMsg,
                completed_at: attemptCompletedAt,
                duration_ms: attemptDurationMs
              })
            } catch (err) {
              console.error('[Runner] Failed to update attempt error before retry:', err)
            }

            // Wait with exponential backoff: 2s, 5s, 10s
            const delay = attempt === 0 ? 2000 : attempt === 1 ? 5000 : 10000
            await new Promise(resolve => setTimeout(resolve, delay))
            // Retry
            return executeWithRetry(def, attempt + 1)
          } else {
            // Final error (no retry or max retries reached)
            const finalMsg = attempt > 0 ? `${errorMsg} (après ${attempt + 1} tentative(s))` : errorMsg
            send({ type:'item-error', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform, flowSlug: def.flowSlug, message: finalMsg, runDir })

            // Update item as error in database
            try {
              const completedAt = new Date().toISOString()
              const durationMs = Date.parse(completedAt) - Date.parse(startedAt)

              execQueries.updateItem(db, def.itemId, {
                status: 'error',
                error_message: finalMsg,
                run_dir: runDir || undefined,
                completed_at: completedAt,
                duration_ms: durationMs
              })

              // Increment error counter
              execQueries.incrementRunCounter(db, runId, 'error_items')

              // Mark final attempt as failed
              execQueries.updateAttempt(db, def.itemId, attempt + 1, {
                status: 'error',
                error_message: finalMsg,
                completed_at: completedAt,
                duration_ms: durationMs
              })

              // Create step records from manifest if available
              if (runDir) {
                this.createStepRecords(db, def.itemId, runDir)
              }
            } catch (err) {
              console.error('[Runner] Failed to update item error in DB:', err)
            }

            // Clean up browser reference after error
            runContext.activeBrowsers.delete(def.itemId)

            // Task failed - decrement counter
            runContext.activeTasks--
            checkCompletion()
          }
        } finally {
          // Ensure browser reference is cleaned up even if something unexpected happens
          runContext.activeBrowsers.delete(def.itemId)
        }
      }

      // Store executeWithRetry in context
      runContext.executeWithRetry = executeWithRetry

      // Store the run context for stop() and requeue functionality
      this.activeRuns.set(runId, runContext)

      // Queue all initial tasks
      for (const def of taskDefs) {
        queue.add(() => executeWithRetry(def)).catch(err => {
          console.error('[Runner] Task execution failed:', err)
        })
      }
    }, 0)
    return { runId }
  }

  async stop(runId: string): Promise<{ success: boolean; message: string; cancelledCount?: number }> {
    const runContext = this.activeRuns.get(runId)
    if (!runContext) {
      return { success: false, message: 'Run introuvable ou déjà terminé' }
    }

    console.log(`[Runner] Stopping run ${runId}`)

    const db = getDb()

    // 1. Mark run as stopped FIRST (prevents new tasks from executing)
    runContext.isStopped = true
    console.log(`[Runner] Marked run as stopped - new tasks will be skipped`)

    // 2. Force-close all active browsers to stop running tasks
    const browsersCount = runContext.activeBrowsers.size
    console.log(`[Runner] Force-closing ${browsersCount} active browser(s)...`)

    for (const [itemId, { browser, context }] of runContext.activeBrowsers.entries()) {
      try {
        console.log(`[Runner] Closing browser for item ${itemId}`)
        // Close context first, then browser
        if (context && typeof context.close === 'function') {
          await context.close().catch(err => console.debug('[Runner] Context close error:', err.message))
        }
        if (browser && typeof browser.close === 'function') {
          await browser.close().catch(err => console.debug('[Runner] Browser close error:', err.message))
        }
      } catch (err) {
        console.debug(`[Runner] Failed to close browser for ${itemId}:`, err instanceof Error ? err.message : err)
      }
    }

    // Clear the map after closing all browsers
    runContext.activeBrowsers.clear()
    console.log(`[Runner] All browsers force-closed`)

    // 3. Stop the queue (prevents new tasks from starting)
    const queueCancelledCount = runContext.queue.stop()
    console.log(`[Runner] ${queueCancelledCount} tasks cancelled from queue`)

    // 4. Get counts before cancellation to adjust counters properly
    const counts = db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running
      FROM execution_items
      WHERE run_id = ?
    `).get(runId) as { pending: number; running: number }

    const pendingCount = counts?.pending || 0
    const runningCount = counts?.running || 0

    console.log(`[Runner] Before stop: ${pendingCount} pending, ${runningCount} running`)

    // 5. Cancel pending AND running items in database
    const dbCancelledCount = execQueries.cancelPendingItems(db, runId)
    console.log(`[Runner] ${dbCancelledCount} items (pending + running) marked as cancelled in DB`)

    // 6. Update run status to 'stopped' in database
    try {
      const completedAt = new Date().toISOString()
      // Defensive check: ensure startedAt exists before calling getTime()
      const durationMs = runContext.startedAt ? Date.now() - runContext.startedAt.getTime() : null

      execQueries.updateRun(db, runId, {
        status: 'stopped',
        completed_at: completedAt,
        duration_ms: durationMs
      })

      // Update counters: move pending + running to cancelled
      execQueries.incrementRunCounter(db, runId, 'pending_items', -pendingCount)
      execQueries.incrementRunCounter(db, runId, 'cancelled_items', dbCancelledCount)

      console.log(`[Runner] Run ${runId.slice(0,8)} marked as 'stopped' in DB`)
    } catch (err) {
      console.error('[Runner] Failed to update run status on stop:', err)
    }

    // 7. Clean up run context
    this.activeRuns.delete(runId)
    console.log(`[Runner] Run context deleted for ${runId.slice(0,8)}`)

    // 8. Send cancellation event
    if (runContext.sender) {
      try {
        runContext.sender.webContents.send(`scenarios:progress:${runId}`, {
          type: 'run-cancelled',
          runId,
          message: `Arrêté (${queueCancelledCount + dbCancelledCount} tâches annulées)`
        } as RunProgressEvent)
      } catch (err) {
        console.error('Failed to send cancellation event:', err)
      }
    }

    const totalCancelled = queueCancelledCount + dbCancelledCount

    return {
      success: true,
      message: `Run arrêté avec succès (${totalCancelled} tâches annulées)`,
      cancelledCount: totalCancelled
    }
  }

  /**
   * Requeue a single failed item to be executed again
   */
  requeueItem(runId: string, itemId: string): { success: boolean; message: string } {
    const runContext = this.activeRuns.get(runId)
    if (!runContext) {
      return { success: false, message: 'Run introuvable ou déjà terminée' }
    }

    const taskDef = runContext.taskDefs.get(itemId)
    if (!taskDef) {
      return { success: false, message: 'Item introuvable dans cette run' }
    }

    // Increment active tasks counter
    runContext.activeTasks++

    // Reset item status to pending in database
    try {
      const db = getDb()
      execQueries.updateItem(db, itemId, {
        status: 'pending',
        error_message: null,
        started_at: null,
        completed_at: null,
        duration_ms: null,
        current_step: null
      })

      // Decrement error, increment pending
      execQueries.incrementRunCounter(db, runId, 'error_items', -1)
      execQueries.incrementRunCounter(db, runId, 'pending_items')
    } catch (err) {
      console.error('[Runner] Failed to update requeue in DB:', err)
    }

    // Send requeued event to notify frontend
    if (runContext.sender) {
      try {
        runContext.sender.webContents.send(`scenarios:progress:${runId}`, {
          type: 'item-requeued',
          runId,
          itemId,
          leadId: taskDef.leadId,
          platform: taskDef.platform,
          flowSlug: taskDef.flowSlug
        } as RunProgressEvent)
      } catch (err) {
        console.error('Failed to send requeue event:', err)
      }
    }

    // Add task back to queue
    runContext.queue.add(() => runContext.executeWithRetry(taskDef)).catch(err => {
      console.error('[Runner] Requeued task execution failed:', err)
    })

    console.log(`[Runner] Requeued item ${itemId.slice(0, 8)} for run ${runId.slice(0, 8)}`)

    return { success: true, message: 'Item remis en queue avec succès' }
  }

  /**
   * Requeue multiple failed items at once
   */
  requeueItems(runId: string, itemIds: string[]): { success: boolean; message: string; requeuedCount?: number } {
    const runContext = this.activeRuns.get(runId)
    if (!runContext) {
      return { success: false, message: 'Run introuvable ou déjà terminée' }
    }

    let requeuedCount = 0

    for (const itemId of itemIds) {
      const result = this.requeueItem(runId, itemId)
      if (result.success) {
        requeuedCount++
      }
    }

    return {
      success: true,
      message: `${requeuedCount} item(s) remis en queue`,
      requeuedCount
    }
  }

  /**
   * Create step records in DB from execution manifest
   */
  private createStepRecords(db: any, itemId: string, runDir: string): void {
    try {
      const manifestPath = path.join(runDir, 'index.json')
      if (!fs.existsSync(manifestPath)) {
        console.warn('[Runner] No manifest found for step tracking:', manifestPath)
        return
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

      if (!manifest.steps || !Array.isArray(manifest.steps)) {
        return
      }

      // Create a step record for each step in the manifest
      for (const step of manifest.steps) {
        execQueries.createStep(db, {
          item_id: itemId,
          step_index: step.index,
          step_type: step.type || 'unknown',
          step_label: step.label || null,
          status: step.ok ? 'success' : 'error',
          error_message: step.error?.message || null,
          duration_ms: step.ms || null,
          screenshot_path: step.screenshot ? path.join(runDir, step.screenshot) : null
        })
      }

      console.log(`[Runner] Created ${manifest.steps.length} step records for item ${itemId.slice(0, 8)}`)
    } catch (err) {
      console.error('[Runner] Failed to create step records:', err)
    }
  }

  private async execHL(args: {
    flowFile: string
    fieldsFile: string
    leadData: any
    username: string
    password: string
    mode: Mode
    keepOpen?: boolean
    onProgress?: (progress: any) => void
    sessionRunId?: string
    onBrowserCreated?: (browser: any, context: any) => void
  }): Promise<{ runDir: string }>{
    const { pathToFileURL } = await import('node:url')
    const enginePath = path.join(process.cwd(), 'automation', 'engine', 'engine.mjs')
    const mod = await import(pathToFileURL(enginePath).href)
    const fn = mod.runHighLevelFlow as (p:any)=>Promise<{runDir:string}>
    return fn({
      fieldsFile: args.fieldsFile,
      flowFile: args.flowFile,
      leadData: args.leadData,
      username: args.username,
      password: args.password,
      mode: args.mode,
      keepOpen: args.keepOpen ?? (args.mode !== 'headless'),
      outRoot: path.join(process.cwd(), 'data', 'runs'),
      dom: 'steps',
      onProgress: args.onProgress,  // Pass the progress callback to the engine
      sessionRunId: args.sessionRunId,  // Pass the global run ID to group executions
      onBrowserCreated: args.onBrowserCreated  // Pass browser tracking callback
    })
  }
}
