import { BrowserWindow, ipcMain, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { ScenariosRunner } from '../services/scenarios/runner'
import { listHLFlows } from '../services/scenarios/hl_catalog'
import { getDb } from '../db/connection'

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

  // Get execution history from runs directory
  ipcMain.handle('scenarios:getHistory', async () => {
    try {
      const projectRoot = process.cwd()
      const runsDir = path.join(projectRoot, 'data', 'runs')

      if (!fs.existsSync(runsDir)) {
        return { success: true, data: [] }
      }

      const runs: any[] = []

      // Walk through platform directories
      const platformDirs = fs.readdirSync(runsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())

      for (const platformDir of platformDirs) {
        const platformPath = path.join(runsDir, platformDir.name)
        const runDirs = fs.readdirSync(platformPath, { withFileTypes: true })
          .filter(d => d.isDirectory())

        for (const runDir of runDirs) {
          const runPath = path.join(platformPath, runDir.name)
          const indexFile = path.join(runPath, 'index.json')

          if (fs.existsSync(indexFile)) {
            try {
              const manifest = JSON.parse(fs.readFileSync(indexFile, 'utf-8'))

              const startedAt = manifest.run?.startedAt || new Date(0).toISOString()
              const finishedAt = manifest.run?.finishedAt
              const durationMs = finishedAt
                ? new Date(finishedAt).getTime() - new Date(startedAt).getTime()
                : undefined

              const stepsTotal = manifest.steps?.length || 0
              const stepsCompleted = manifest.steps?.filter((s: any) => s.ok).length || 0
              const hasError = manifest.error || manifest.steps?.some((s: any) => !s.ok)

              runs.push({
                id: manifest.run?.id || runDir.name,
                slug: manifest.run?.slug || platformDir.name,
                platform: manifest.run?.platform || platformDir.name,
                leadId: manifest.lead?.id,
                leadName: manifest.lead?.name,
                status: hasError ? 'error' : (finishedAt ? 'success' : 'running'),
                startedAt,
                finishedAt,
                durationMs,
                runDir: runPath,
                error: manifest.error?.message,
                mode: manifest.run?.mode || 'headless',
                stepsTotal,
                stepsCompleted
              })
            } catch (err) {
              console.error(`Error reading run manifest ${indexFile}:`, err)
            }
          }
        }
      }

      // Sort by date descending, limit to last 100
      runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      const recent = runs.slice(0, 100)

      return { success: true, data: recent }
    } catch (error) {
      console.error('Error getting history:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get history' }
    }
  })

  // Get detailed info about a specific run
  ipcMain.handle('scenarios:getRunDetails', async (_e, runDir: unknown) => {
    try {
      if (typeof runDir !== 'string') {
        throw new Error('Invalid run directory path')
      }

      const indexFile = path.join(runDir, 'index.json')

      if (!fs.existsSync(indexFile)) {
        throw new Error('Run manifest not found')
      }

      const manifest = JSON.parse(fs.readFileSync(indexFile, 'utf-8'))

      return { success: true, data: manifest }
    } catch (error) {
      console.error('Error getting run details:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get run details' }
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

      const result = runner.stop(runId)
      return result
    } catch (error) {
      console.error('Error stopping execution:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to stop execution'
      }
    }
  })

}

