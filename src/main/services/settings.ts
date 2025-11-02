import { z } from 'zod'
import { getDb } from '../db/connection'
import type { Theme, AdvancedSettings } from '../../shared/settings'
import { DEFAULT_AUTOMATION_SETTINGS } from '../../shared/settings'
import { createLogger } from './logger'

const logger = createLogger('Settings')

const ThemeSchema = z.enum(['light', 'dark'])

const AdvancedSettingsSchema = z.object({
  mode: z.enum(['headless', 'headless-minimized', 'visible']),
  keepBrowserOpen: z.boolean(),
  concurrency: z.number().int().min(1).max(10),
  showPreviewBeforeRun: z.boolean(),
  retryFailed: z.boolean(),
  maxRetries: z.number().int().min(1).max(5),
  enableVisibilityFiltering: z.boolean(),
  hiddenPlatforms: z.array(z.string()),
  hiddenFlows: z.array(z.string())
})

export function getTheme(): Theme | undefined {
  const row = getDb()
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get('theme') as { value?: string } | undefined
  if (!row?.value) return undefined
  const parsed = ThemeSchema.safeParse(JSON.parse(row.value))
  if (!parsed.success) throw new Error('Thème invalide en base')
  return parsed.data
}

export function setTheme(theme: Theme) {
  const value = JSON.stringify(theme)
  getDb()
    .prepare('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run('theme', value)
}

export function getChromePath(): string | undefined {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get('chrome_path') as { value?: string } | undefined
  if (!row?.value) return undefined
  try { return JSON.parse(row.value) as string }
  catch { return undefined }
}

export function setChromePath(path: string) {
  const value = JSON.stringify(path)
  getDb().prepare('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('chrome_path', value)
}

export function getAutomationSettings(): AdvancedSettings {
  const row = getDb()
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get('automation-settings') as { value?: string } | undefined

  if (!row?.value) return DEFAULT_AUTOMATION_SETTINGS

  try {
    const parsed = JSON.parse(row.value)
    const validated = AdvancedSettingsSchema.safeParse(parsed)

    if (!validated.success) {
      logger.error('Invalid automation settings in DB, using defaults:', validated.error)
      return DEFAULT_AUTOMATION_SETTINGS
    }

    return validated.data
  } catch (error) {
    logger.error('Failed to parse automation settings from DB:', error)
    return DEFAULT_AUTOMATION_SETTINGS
  }
}

export function setAutomationSettings(settings: AdvancedSettings) {
  const validated = AdvancedSettingsSchema.parse(settings)
  const value = JSON.stringify(validated)
  getDb()
    .prepare('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run('automation-settings', value)
}
