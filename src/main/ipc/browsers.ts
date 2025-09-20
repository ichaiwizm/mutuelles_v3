import { dialog, ipcMain } from 'electron'
import { getChromePath, setChromePath } from '../services/chrome'

export function registerBrowsersIpc() {
  ipcMain.handle('browsers:getChromePath', async () => getChromePath() ?? null)
  ipcMain.handle('browsers:setChromePath', async (_e, p: unknown) => {
    if (typeof p !== 'string') throw new Error('Chemin invalide')
    setChromePath(p)
    return true
  })
  ipcMain.handle('browsers:pickChrome', async () => {
    const res = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Chrome', extensions: ['exe'] }] })
    if (res.canceled || res.filePaths.length === 0) return null
    setChromePath(res.filePaths[0])
    return res.filePaths[0]
  })
}

