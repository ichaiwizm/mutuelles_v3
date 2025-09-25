import { ipcMain, shell, BrowserWindow } from 'electron'
import { z } from 'zod'
import path from 'node:path'
import fs from 'node:fs'
import { listFlows, getFlowBySlug, listSteps } from '../services/flows'
import { runFlow } from '../services/automation'
import { listRuns, getRun, listScreenshots, getScreenshotData, exportRunJson } from '../services/runs'

export function registerAutomationIpc() {
  ipcMain.handle('automation:listFlows', async () => listFlows())

  ipcMain.handle('automation:run', async (e, payload: unknown) => {
    const parsed = z.object({ flowSlug: z.string().min(1), mode: z.enum(['headless','dev','dev_private']).optional() }).parse(payload)
    const sender = BrowserWindow.fromWebContents(e.sender)
    if (!sender) throw new Error('Fenêtre introuvable')
    return runFlow(parsed.flowSlug, (evt) => {
      try { sender.webContents.send(`automation:progress:${evt.runId}`, evt) } catch {}
    }, { mode: parsed.mode })
  })

  ipcMain.handle('automation:openRunDir', async (_e, p: unknown) => {
    const dir = typeof p === 'string' ? p : ''
    if (!dir) throw new Error('Chemin manquant')
    if (!fs.existsSync(dir)) throw new Error('Dossier introuvable')
    return shell.openPath(path.normalize(dir))
  })

  ipcMain.handle('automation:listRuns', async (_e, p: unknown) => {
    const params = (p && typeof p === 'object') ? p as any : {}
    return listRuns({ flowSlug: params.flowSlug, limit: params.limit, offset: params.offset })
  })
  ipcMain.handle('automation:getRun', async (_e, runId: unknown) => {
    if (typeof runId !== 'string' || !runId) throw new Error('runId invalide')
    return getRun(runId)
  })
  ipcMain.handle('automation:listScreenshots', async (_e, runId: unknown) => {
    if (typeof runId !== 'string' || !runId) throw new Error('runId invalide')
    return listScreenshots(runId)
  })
  ipcMain.handle('automation:getScreenshot', async (_e, payload: unknown) => {
    const p2 = payload as any
    if (!p2 || typeof p2.runId !== 'string' || typeof p2.filename !== 'string') throw new Error('Paramètres invalides')
    return getScreenshotData(p2.runId, p2.filename)
  })
  ipcMain.handle('automation:exportRunJson', async (_e, runId: unknown) => {
    if (typeof runId !== 'string' || !runId) throw new Error('runId invalide')
    return exportRunJson(runId)
  })

  ipcMain.handle('automation:deleteRun', async (_e, runId: unknown) => {
    if (typeof runId !== 'string' || !runId) throw new Error('runId invalide')
    const { deleteRun } = await import('../services/runs')
    return deleteRun(runId)
  })

  ipcMain.handle('automation:deleteAllRuns', async () => {
    const { deleteAllRuns } = await import('../services/runs')
    return deleteAllRuns()
  })

  ipcMain.handle('automation:listFlowSteps', async (_e, flowSlug: unknown) => {
    if (typeof flowSlug !== 'string' || !flowSlug) throw new Error('flowSlug invalide')
    const flow = getFlowBySlug(flowSlug)
    if (!flow) throw new Error('Flux introuvable')
    return listSteps(flow.id)
  })
}
