import { ipcMain } from 'electron'
import { getTheme, setTheme, getAutomationSettings, setAutomationSettings } from '../services/settings'
import { z } from 'zod'
import type { AdvancedSettings } from '../../shared/settings'

export function registerSettingsIpc() {
  ipcMain.handle('settings:getTheme', async () => getTheme() ?? null)
  ipcMain.handle('settings:setTheme', async (_e, theme: unknown) => {
    const parsed = z.enum(['light', 'dark']).parse(theme)
    setTheme(parsed)
    return true
  })

  ipcMain.handle('settings:getAutomationSettings', async () => {
    try {
      return getAutomationSettings()
    } catch (error) {
      console.error('Failed to get automation settings:', error)
      throw error
    }
  })

  ipcMain.handle('settings:setAutomationSettings', async (_e, settings: unknown) => {
    try {
      setAutomationSettings(settings as AdvancedSettings)
      return true
    } catch (error) {
      console.error('Failed to set automation settings:', error)
      throw error
    }
  })
}

