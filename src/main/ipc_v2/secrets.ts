import { ipcMain } from 'electron'
import { setCredential, getCredential, deleteCredential } from '../../core/secrets/keychain'

export function registerSecretsV2Ipc() {
  ipcMain.handle('v2:secrets:set', async (_e, payload: { platform: string; username: string; password: string }) => {
    await setCredential(payload.platform, payload.username, payload.password)
    return true
  })

  ipcMain.handle('v2:secrets:get', async (_e, payload: { platform: string; username: string }) => {
    const pwd = await getCredential(payload.platform, payload.username)
    return pwd
  })

  ipcMain.handle('v2:secrets:delete', async (_e, payload: { platform: string; username: string }) => {
    const ok = await deleteCredential(payload.platform, payload.username)
    return !!ok
  })
}

