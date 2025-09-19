import { ipcMain } from 'electron'
import { getTheme, setTheme } from '../services/settings'
import { z } from 'zod'

export function registerSettingsIpc() {
  ipcMain.handle('settings:getTheme', async () => getTheme() ?? null)
  ipcMain.handle('settings:setTheme', async (_e, theme: unknown) => {
    const parsed = z.enum(['light', 'dark']).parse(theme)
    setTheme(parsed)
    return true
  })
}

