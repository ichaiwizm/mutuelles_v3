import { z } from 'zod'
import { getDb } from '../db/connection'
import type { Theme } from '../../shared/settings'

const ThemeSchema = z.enum(['light', 'dark'])

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
