import { ipcMain } from 'electron'
import { deleteForPlatform, getForPlatform, listSelectedWithCreds, revealPassword, setForPlatform } from '../services/platform-credentials'

export function registerPlatformCredsIpc() {
  ipcMain.handle('pcreds:listSelected', async () => listSelectedWithCreds())
  ipcMain.handle('pcreds:get', async (_e, platformId: unknown) => getForPlatform(platformId))
  ipcMain.handle('pcreds:set', async (_e, payload: unknown) => setForPlatform(payload))
  ipcMain.handle('pcreds:delete', async (_e, platformId: unknown) => deleteForPlatform(platformId))
  ipcMain.handle('pcreds:reveal', async (_e, platformId: unknown) => revealPassword(platformId))
}

