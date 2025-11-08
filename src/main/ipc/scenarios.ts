import { BrowserWindow, ipcMain, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { ScenariosRunner } from '../services/scenarios/runner'
import { listTSFlows, getTSFlow } from '../services/scenarios/ts_catalog'
import { getDb } from '../db/connection'
import * as execQueries from '../../shared/db/queries/executions'
import { createLogger } from '../services/logger'

const logger = createLogger('IPC:Scenarios')

const runner = new ScenariosRunner()

export function registerScenariosIpc() {
  ipcMain.handle('scenarios:run', async (e, payload: any) => {
    const wnd = BrowserWindow.fromWebContents(e.sender)
    if (!wnd) throw new Error('Fenêtre introuvable')
    return runner.run(payload, wnd)
  })

  ipcMain.handle('scenarios:openPath', async (_e, p: unknown) => {
    const target = typeof p === 'string' ? p : ''
    if (!target) throw new Error('Chemin manquant')
    return shell.openPath(path.resolve(target))
  })

  ipcMain.handle('scenarios:exists', async (_e, p: unknown) => {
    const target = typeof p === 'string' ? p : ''
    if (!target) return false
    try { return fs.existsSync(target) } catch { return false }
  })

  ipcMain.handle('scenarios:listFlows', async () => {
    try {
      const projectRoot = process.cwd()
      const allFlows = listTSFlows()

      const db = getDb()
      const platformsMap = new Map<string, string>()
      const platforms = db.prepare('SELECT slug, name FROM platforms_catalog').all() as Array<{ slug: string; name: string }>
      platforms.forEach(p => platformsMap.set(p.slug, p.name))

      const flowsByPlatform = new Map<string, any[]>()

      for (const f of allFlows) {
        if (!flowsByPlatform.has(f.platform)) flowsByPlatform.set(f.platform, [])
        const stepsCount = Array.isArray(f.flow?.steps) ? f.flow.steps.length : 0
        // We expose 'file' as a slug token (platform/slug) for compatibility with readFlowFile
        const fileToken = `${f.platform}/${f.slug}`
        flowsByPlatform.get(f.platform)!.push({ slug: f.slug, name: f.name, file: fileToken, stepsCount })
      }

      const result = Array.from(flowsByPlatform.entries()).map(([platform, flows]) => ({
        platform,
        platformName: platformsMap.get(platform) || platform,
        flows
      }))

      return { success: true, data: result }
    } catch (error) {
      logger.error('Error listing flows:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to list flows' }
    }
  })

  ipcMain.handle('scenarios:getHistory', async (_e, filters?: execQueries.HistoryFilters) => {
    try {
      const db = getDb()
      const runs = execQueries.getRunHistory(db, filters)
      return { success: true, data: runs }
    } catch (error) {
      logger.error('Error getting history:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get history' }
    }
  })

  ipcMain.handle('scenarios:repairFinalize', async () => {
    try {
      const db = getDb()
      const stuckRuns = db.prepare(`
        SELECT * FROM execution_runs r
        WHERE r.status = 'running'
      `).all() as any[]

      let repaired = 0
      for (const run of stuckRuns) {
        const counts = db.prepare(`
          SELECT
            SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status='running' THEN 1 ELSE 0 END) as running,
            SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) as error_cnt,
            SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) as success_cnt,
            SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) as cancelled_cnt
          FROM execution_items WHERE run_id = ?
        `).get(run.id) as { pending:number; running:number; error_cnt:number; success_cnt:number; cancelled_cnt:number }

        const pending = counts?.pending || 0
        const running = counts?.running || 0
        if (pending === 0 && running === 0) {
          const finalStatus = (counts?.error_cnt || 0) > 0 ? 'failed' : 'completed'
          const completedAt = new Date().toISOString()
          const durationMs = run.started_at ? Date.now() - Date.parse(run.started_at) : null
          execQueries.updateRun(db as any, run.id, {
            status: finalStatus,
            completed_at: completedAt,
            duration_ms: durationMs
          })
          repaired++
        }
      }

      return { success: true, repaired }
    } catch (error) {
      logger.error('scenarios:repairFinalize - Error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to repair finalize' }
    }
  })

  ipcMain.handle('scenarios:getActiveRun', async (_e, runId: string) => {
    try {
      if (!runId) {
        return { success: false, error: 'Run ID required' }
      }

      const db = getDb()
      const run = execQueries.getActiveRun(db, runId)

      if (!run) {
        return { success: false, error: 'Run not found' }
      }

      return { success: true, data: run }
    } catch (error) {
      logger.error('Error getting active run:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get active run' }
    }
  })

  ipcMain.handle('scenarios:getRunItems', async (_e, runId: string) => {
    try {
      if (!runId) {
        return { success: false, error: 'Run ID required' }
      }

      const db = getDb()
      const items = execQueries.getRunItems(db, runId)

      return { success: true, data: items }
    } catch (error) {
      logger.error('Error getting run items:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get run items' }
    }
  })

  ipcMain.handle('scenarios:getRunSteps', async (_e, itemId: string) => {
    try {
      if (!itemId) {
        return { success: false, error: 'Item ID required' }
      }

      const db = getDb()
      const steps = execQueries.getItemSteps(db, itemId)

      return { success: true, data: steps }
    } catch (error) {
      logger.error('Error getting run steps:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get run steps' }
    }
  })

  ipcMain.handle('scenarios:deleteRun', async (_e, runId: string) => {
    try {
      if (!runId) {
        return { success: false, error: 'Run ID required' }
      }

      const db = getDb()

      // Get run details to find run_dir for filesystem cleanup
      const run = execQueries.getRunById(db, runId)
      if (!run) {
        return { success: false, error: 'Run not found' }
      }

      const items = execQueries.getRunItems(db, runId)
      const runDirs = new Set(items.map(item => item.run_dir).filter(Boolean))

      execQueries.deleteRun(db, runId)

      for (const runDir of runDirs) {
        if (runDir && fs.existsSync(runDir)) {
          try {
            fs.rmSync(runDir, { recursive: true, force: true })
          } catch (err) {
            logger.error(`Failed to delete run directory ${runDir}:`, err)
          }
        }
      }

      return { success: true, message: 'Run deleted successfully' }
    } catch (error) {
      logger.error('Error deleting run:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete run' }
    }
  })

  ipcMain.handle('scenarios:deleteAllRuns', async () => {
    try {
      const db = getDb()

      // Collect all run directories before deleting from database
      const allRunDirs = new Set<string>()
      const completedRuns = execQueries.getRunHistory(db, { status: undefined })

      for (const run of completedRuns) {
        const items = execQueries.getRunItems(db, run.id)
        items.forEach((item) => {
          if (item.run_dir) allRunDirs.add(item.run_dir)
        })
      }

      // Delete all completed runs from database (CASCADE handles related tables)
      const runIds = execQueries.deleteAllCompletedRuns(db)

      if (runIds.length === 0) {
        return {
          success: true,
          message: 'Aucun historique à supprimer',
          deletedCount: 0
        }
      }

      // Clean up filesystem
      let cleanedDirs = 0
      for (const runDir of allRunDirs) {
        if (runDir && fs.existsSync(runDir)) {
          try {
            fs.rmSync(runDir, { recursive: true, force: true })
            cleanedDirs++
          } catch (err) {
            logger.error(`Failed to delete run directory ${runDir}:`, err)
          }
        }
      }

      logger.info(`Deleted ${runIds.length} runs and cleaned ${cleanedDirs} directories`)

      return {
        success: true,
        message: `${runIds.length} run(s) supprimé(s)`,
        deletedCount: runIds.length
      }
    } catch (error) {
      logger.error('Error deleting all runs:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete all runs'
      }
    }
  })

  ipcMain.handle('scenarios:getRunDetails', async (_e, runId: unknown) => {
    try {
      if (typeof runId !== 'string') {
        throw new Error('Invalid runId')
      }

      const db = getDb()
      const run = execQueries.getActiveRun(db, runId)

      if (!run) {
        throw new Error('Run not found')
      }

      const items = execQueries.getRunItems(db, runId)

      const itemsWithDetails = items.map((item: any) => ({
        ...item,
        steps: execQueries.getItemSteps(db, item.id),
        attempts: execQueries.getItemAttempts(db, item.id)
      }))

      return {
        success: true,
        data: {
          run,
          items: itemsWithDetails
        }
      }
    } catch (error) {
      logger.error('Error getting run details:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get run details' }
    }
  })

  ipcMain.handle('scenarios:getItemDetails', async (_e, itemId: unknown) => {
    try {
      if (typeof itemId !== 'string') {
        throw new Error('Invalid itemId')
      }

      const db = getDb()
      const item = execQueries.getItemById(db, itemId)

      if (!item) {
        throw new Error('Item not found')
      }

      const steps = execQueries.getItemSteps(db, itemId)
      const attempts = execQueries.getItemAttempts(db, itemId)

      return {
        success: true,
        data: {
          item,
          steps,
          attempts
        }
      }
    } catch (error) {
      logger.error('Error getting item details:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get item details' }
    }
  })

  ipcMain.handle('scenarios:readScreenshot', async (_e, screenshotPath: unknown) => {
    try {
      if (typeof screenshotPath !== 'string') {
        throw new Error('Invalid screenshot path')
      }

      if (!fs.existsSync(screenshotPath)) {
        throw new Error('Screenshot file not found')
      }

      const imageBuffer = fs.readFileSync(screenshotPath)
      const base64 = imageBuffer.toString('base64')
      const ext = path.extname(screenshotPath).toLowerCase()
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg'

      return { success: true, data: `data:${mimeType};base64,${base64}` }
    } catch (error) {
      logger.error('Error reading screenshot:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to read screenshot' }
    }
  })

  ipcMain.handle('scenarios:stop', async (_e, runId: string) => {
    try {
      if (!runId) {
        return {
          success: false,
          message: 'Run ID manquant'
        }
      }

      const result = await runner.stop(runId)
      return result
    } catch (error) {
      logger.error('Error stopping execution:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to stop execution'
      }
    }
  })

  ipcMain.handle('scenarios:requeueItem', async (_e, runId: string, itemId: string) => {
    try {
      if (!runId || !itemId) {
        return {
          success: false,
          message: 'Run ID et Item ID requis'
        }
      }

      const result = runner.requeueItem(runId, itemId)
      return result
    } catch (error) {
      logger.error('Error requeueing item:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to requeue item'
      }
    }
  })

  ipcMain.handle('scenarios:stopItem', async (_e, runId: string, itemId: string) => {
    try {
      if (!runId || !itemId) {
        return {
          success: false,
          message: 'Run ID et Item ID requis'
        }
      }

      const result = await runner.stopItem(runId, itemId)
      return result
    } catch (error) {
      logger.error('Error stopping item:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to stop item'
      }
    }
  })

  ipcMain.handle('scenarios:pauseItem', async (_e, runId: string, itemId: string) => {
    try {
      if (!runId || !itemId) {
        return {
          success: false,
          message: 'Run ID et Item ID requis'
        }
      }
      const result = await runner.pauseItem(runId, itemId)
      return result
    } catch (error) {
      logger.error('Error pausing item:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Failed to pause item' }
    }
  })

  ipcMain.handle('scenarios:resumeItem', async (_e, runId: string, itemId: string) => {
    try {
      if (!runId || !itemId) {
        return {
          success: false,
          message: 'Run ID et Item ID requis'
        }
      }
      const result = await runner.resumeItem(runId, itemId)
      return result
    } catch (error) {
      logger.error('Error resuming item:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Failed to resume item' }
    }
  })

  ipcMain.handle('scenarios:window:getState', async (_e, runId: string, itemId: string) => {
    try { return await runner.getItemWindowState(runId, itemId) }
    catch (error) { return { success: false, message: error instanceof Error ? error.message : 'Failed to get window state' } }
  })
  ipcMain.handle('scenarios:window:minimize', async (_e, runId: string, itemId: string) => {
    try { return await runner.minimizeItemWindow(runId, itemId) }
    catch (error) { return { success: false, message: 'Failed to minimize' } }
  })
  ipcMain.handle('scenarios:window:restore', async (_e, runId: string, itemId: string) => {
    try { return await runner.restoreItemWindow(runId, itemId) }
    catch (error) { return { success: false, message: 'Failed to restore' } }
  })

  ipcMain.handle('scenarios:requeueItems', async (_e, runId: string, itemIds: string[]) => {
    try {
      if (!runId || !itemIds || !Array.isArray(itemIds)) {
        return {
          success: false,
          message: 'Run ID et tableau d\'Item IDs requis'
        }
      }

      const result = runner.requeueItems(runId, itemIds)
      return result
    } catch (error) {
      logger.error('Error requeueing items:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to requeue items'
      }
    }
  })

  ipcMain.handle('scenarios:readFlowFile', async (_e, filePath: unknown) => {
    try {
      if (typeof filePath !== 'string' || !filePath) {
        return { success: false, error: 'File path required' }
      }

      // New behavior: if filePath looks like 'platform/slug', load TS flow and serialize
      if (!fs.existsSync(filePath)) {
        const parts = filePath.split('/')
        if (parts.length === 2) {
          const [platform, slug] = parts
          const flow = getTSFlow(platform, slug)
          if (!flow) return { success: false, error: `Flow not found: ${filePath}` }
          const data = {
            platform,
            slug,
            name: flow.name,
            description: flow.description,
            trace: flow.trace,
            steps: flow.steps.map(s => ({ ...s })),
          }
          return { success: true, data }
        }
        return { success: false, error: 'Flow not found' }
      }

      // Fallback (legacy JSON files if any still around)
      const flowData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      return { success: true, data: flowData }
    } catch (error) {
      logger.error('Error reading flow file:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to read flow file' }
    }
  })

}

