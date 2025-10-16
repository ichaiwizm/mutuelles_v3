import { BrowserWindow, ipcMain, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { ScenariosRunner } from '../services/scenarios/runner'

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
}

