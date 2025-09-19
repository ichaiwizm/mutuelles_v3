import { ipcMain } from 'electron'
import { createPlatform, deletePlatform, listPlatforms } from '../services/platforms'

export function registerPlatformsIpc() {
  ipcMain.handle('platforms:list', async () => listPlatforms())
  ipcMain.handle('platforms:create', async (_e, payload: unknown) => createPlatform(payload))
  ipcMain.handle('platforms:delete', async (_e, id: unknown) => deletePlatform(id))
}

