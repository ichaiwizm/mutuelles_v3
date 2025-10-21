import path from 'node:path'
import fs from 'node:fs'
import { BrowserWindow } from 'electron'
import { getDb } from '../../db/connection'
import { revealPassword } from '../platform_credentials'
import { LeadsService } from '../leads'
import { RunnerQueue } from './runner_queue'
import { listHLFlows, pickDefaultFlowForPlatform } from './hl_catalog'

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

    setTimeout(() => {
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
        executeWithRetry: null as any  // Will be set below
      }

      // Helper function to check if run is complete
      const checkCompletion = () => {
        if (runContext.activeTasks === 0 && !queue.isRunning) {
          console.log('[Runner] All tasks completed, sending run-done')
          this.activeRuns.delete(runId)
          send({ type:'run-done', runId, message:'Terminé' })
        }
      }

      // Helper function to execute with retry logic
      const executeWithRetry = async (def: TaskDef, attempt: number = 0): Promise<void> => {
        const isRetry = attempt > 0
        if (isRetry) {
          send({ type:'item-start', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform, flowSlug: def.flowSlug, message: `Tentative ${attempt + 1}/${maxRetries + 1}` })
        } else {
          send({ type:'item-start', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform, flowSlug: def.flowSlug })
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
          }

          const result = await this.execHL({ ...def, mode, leadData: lead.data, keepOpen, onProgress: progressCallback })
          runDir = result.runDir

          // Emit final progress before success
          if (totalSteps > 0) {
            send({ type:'item-progress', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform, flowSlug: def.flowSlug, currentStep: totalSteps, totalSteps })
          }

          send({ type:'item-success', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform, flowSlug: def.flowSlug, runDir })

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
            // Wait with exponential backoff: 2s, 5s, 10s
            const delay = attempt === 0 ? 2000 : attempt === 1 ? 5000 : 10000
            await new Promise(resolve => setTimeout(resolve, delay))
            // Retry
            return executeWithRetry(def, attempt + 1)
          } else {
            // Final error (no retry or max retries reached)
            const finalMsg = attempt > 0 ? `${errorMsg} (après ${attempt + 1} tentative(s))` : errorMsg
            send({ type:'item-error', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform, flowSlug: def.flowSlug, message: finalMsg, runDir })

            // Task failed - decrement counter
            runContext.activeTasks--
            checkCompletion()
          }
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

  stop(runId: string): { success: boolean; message: string; cancelledCount?: number } {
    const runContext = this.activeRuns.get(runId)
    if (!runContext) {
      return { success: false, message: 'Run introuvable ou déjà terminé' }
    }

    const cancelledCount = runContext.queue.stop()

    // Send cancellation event
    if (runContext.sender) {
      try {
        runContext.sender.webContents.send(`scenarios:progress:${runId}`, {
          type: 'run-cancelled',
          runId,
          message: `Arrêté (${cancelledCount} tâches annulées)`
        } as RunProgressEvent)
      } catch (err) {
        console.error('Failed to send cancellation event:', err)
      }
    }

    return {
      success: true,
      message: `Run arrêté avec succès (${cancelledCount} tâches annulées)`,
      cancelledCount
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

  private async execHL(args: {
    flowFile: string
    fieldsFile: string
    leadData: any
    username: string
    password: string
    mode: Mode
    keepOpen?: boolean
    onProgress?: (progress: any) => void
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
      onProgress: args.onProgress  // Pass the progress callback to the engine
    })
  }
}
