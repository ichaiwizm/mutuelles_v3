import { ipcMain } from 'electron'
import { createProfile, deleteProfile, listProfiles, openProfileDir, initProfile, testProfile } from '../services/profiles'

export function registerProfilesIpc() {
  ipcMain.handle('profiles:list', async () => listProfiles())
  ipcMain.handle('profiles:create', async (_e, payload: unknown) => createProfile(payload))
  ipcMain.handle('profiles:delete', async (_e, id: unknown) => deleteProfile(id))
  ipcMain.handle('profiles:openDir', async (_e, id: unknown) => openProfileDir(id))
  ipcMain.handle('profiles:init', async (_e, id: unknown) => initProfile(id))
  ipcMain.handle('profiles:test', async (_e, id: unknown) => testProfile(id))
}
