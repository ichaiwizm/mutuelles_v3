import { BrowserWindow, ipcMain, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { ScenariosRunner } from '../services/scenarios/runner'
import { listHLFlows } from '../services/scenarios/hl_catalog'
import { getDb } from '../db/connection'
import * as execQueries from '../../shared/db/queries/executions'

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

  // List all available flows grouped by platform
  ipcMain.handle('scenarios:listFlows', async () => {
    try {
      const projectRoot = process.cwd()
      const allFlows = listHLFlows(projectRoot)

      // Get platform names from database
      const db = getDb()
      const platformsMap = new Map<string, string>()
      const platforms = db.prepare('SELECT slug, name FROM platforms_catalog').all() as Array<{ slug: string; name: string }>
      platforms.forEach(p => platformsMap.set(p.slug, p.name))

      // Group flows by platform
      const flowsByPlatform = new Map<string, any[]>()

      for (const flow of allFlows) {
        if (!flowsByPlatform.has(flow.platform)) {
          flowsByPlatform.set(flow.platform, [])
        }

        // Count steps by reading the flow file
        let stepsCount = 0
        try {
          const flowData = JSON.parse(fs.readFileSync(flow.file, 'utf-8'))
          stepsCount = flowData.steps ? flowData.steps.length : 0
        } catch {}

        flowsByPlatform.get(flow.platform)!.push({
          slug: flow.slug,
          name: flow.name,
          file: flow.file,
          stepsCount
        })
      }

      // Convert to array format
      const result = Array.from(flowsByPlatform.entries()).map(([platform, flows]) => ({
        platform,
        platformName: platformsMap.get(platform) || platform,
        flows
      }))

      return { success: true, data: result }
    } catch (error) {
      console.error('Error listing flows:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to list flows' }
    }
  })

  // Get execution history from database
  ipcMain.handle('scenarios:getHistory', async (_e, filters?: execQueries.HistoryFilters) => {
    try {
      const db = getDb()
      const runs = execQueries.getRunHistory(db, filters)
      return { success: true, data: runs }
    } catch (error) {
      console.error('Error getting history:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get history' }
    }
  })

  // Debug: dump basic DB state for executions (runs + items per status)
  ipcMain.handle('scenarios:debugDump', async () => {
    try {
      const db = getDb()
      const runs = db.prepare(`
        SELECT id, status, started_at, completed_at,
               total_items, success_items, error_items, pending_items, cancelled_items
        FROM execution_runs
        ORDER BY started_at DESC
        LIMIT 100
      `).all() as any[]
      const items = db.prepare(`
        SELECT run_id, status, COUNT(*) as count
        FROM execution_items
        GROUP BY run_id, status
        ORDER BY run_id
      `).all() as any[]

      return { success: true, data: { runs, items } }
    } catch (error) {
      console.error('[IPC][scenarios:debugDump] Error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to dump DB' }
    }
  })

  // Repair: finalize runs stuck in 'running' when they have no pending/running items
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
      console.error('[IPC][scenarios:repairFinalize] Error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to repair finalize' }
    }
  })

  // Get active run details (for polling)
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
      console.error('Error getting active run:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get active run' }
    }
  })

  // Get execution items for a run (for polling)
  ipcMain.handle('scenarios:getRunItems', async (_e, runId: string) => {
    try {
      if (!runId) {
        return { success: false, error: 'Run ID required' }
      }

      const db = getDb()
      const items = execQueries.getRunItems(db, runId)

      return { success: true, data: items }
    } catch (error) {
      console.error('Error getting run items:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get run items' }
    }
  })

  // Get execution steps for an item
  ipcMain.handle('scenarios:getRunSteps', async (_e, itemId: string) => {
    try {
      if (!itemId) {
        return { success: false, error: 'Item ID required' }
      }

      const db = getDb()
      const steps = execQueries.getItemSteps(db, itemId)

      return { success: true, data: steps }
    } catch (error) {
      console.error('Error getting run steps:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get run steps' }
    }
  })

  // Delete a run from database (cascade deletes items, steps, attempts)
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

      // Get all items to find their run_dirs
      const items = execQueries.getRunItems(db, runId)
      const runDirs = new Set(items.map(item => item.run_dir).filter(Boolean))

      // Delete from database (cascade will handle items, steps, attempts)
      execQueries.deleteRun(db, runId)

      // Delete filesystem artifacts (screenshots, DOM, traces)
      for (const runDir of runDirs) {
        if (runDir && fs.existsSync(runDir)) {
          try {
            fs.rmSync(runDir, { recursive: true, force: true })
          } catch (err) {
            console.error(`Failed to delete run directory ${runDir}:`, err)
          }
        }
      }

      return { success: true, message: 'Run deleted successfully' }
    } catch (error) {
      console.error('Error deleting run:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete run' }
    }
  })

  // Get detailed info about a specific run (from database)
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

      // Fetch steps & attempts for each item
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
      console.error('Error getting run details:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get run details' }
    }
  })

  // Get detailed info about a specific execution item (from database)
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
      console.error('Error getting item details:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get item details' }
    }
  })

  // Read screenshot as base64
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
      console.error('Error reading screenshot:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to read screenshot' }
    }
  })

  // Stop a running execution (gracefully)
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
      console.error('Error stopping execution:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to stop execution'
      }
    }
  })

  // Requeue a single failed item
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
      console.error('Error requeueing item:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to requeue item'
      }
    }
  })

  // Requeue multiple failed items
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
      console.error('Error requeueing items:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to requeue items'
      }
    }
  })

}

