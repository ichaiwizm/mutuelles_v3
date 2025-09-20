import { ipcMain, shell, BrowserWindow } from 'electron'
import { z } from 'zod'
import path from 'node:path'
import fs from 'node:fs'
import { listFlows } from '../services/flows'
import { runFlow } from '../services/automation'

export function registerAutomationIpc() {
  ipcMain.handle('automation:listFlows', async () => listFlows())

  ipcMain.handle('automation:run', async (e, payload: unknown) => {
    const parsed = z.object({ flowSlug: z.string().min(1) }).parse(payload)
    const sender = BrowserWindow.fromWebContents(e.sender)
    if (!sender) throw new Error('Fenêtre introuvable')
    return runFlow(parsed.flowSlug, (evt) => {
      try { sender.webContents.send(`automation:progress:${evt.runId}`, evt) } catch {}
    })
  })

  ipcMain.handle('automation:openRunDir', async (_e, p: unknown) => {
    const dir = typeof p === 'string' ? p : ''
    if (!dir) throw new Error('Chemin manquant')
    if (!fs.existsSync(dir)) throw new Error('Dossier introuvable')
    return shell.openPath(path.normalize(dir))
  })

}
