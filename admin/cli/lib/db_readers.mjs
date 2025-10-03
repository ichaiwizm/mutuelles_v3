#!/usr/bin/env node
// Lightweight, read-only DB helpers for the CLI runner (no writes).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

// Reuse project utilities to resolve paths (no DB writes)
import { getDbPath, getFlowsDir, listFlowFiles, readJsonFile, FlowSchema } from '../../../scripts/flows/lib/flows_io.mjs'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

export function openDbRO() {
  const file = getDbPath()
  if (!fs.existsSync(file)) throw new Error('Base de données introuvable: ' + file)
  // Read-only, file must exist
  return new Database(file, { readonly: true, fileMustExist: true })
}

export function getChromePathFromSettings(db) {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('chrome_path')
    return row?.value || undefined
  } catch { return undefined }
}

export function getDefaultProfile(db) {
  try {
    const row = db.prepare('SELECT id, name, user_data_dir, initialized_at FROM profiles WHERE initialized_at IS NOT NULL ORDER BY id DESC LIMIT 1').get()
    if (!row) return null
    return { id: Number(row.id), name: String(row.name), user_data_dir: String(row.user_data_dir), initialized_at: String(row.initialized_at) }
  } catch { return null }
}

export function getPlatformBySlug(db, slug) {
  const row = db.prepare('SELECT id, slug, name FROM platforms_catalog WHERE slug = ?').get(slug)
  if (!row) throw new Error('Plateforme inconnue: ' + slug)
  return { id: Number(row.id), slug: String(row.slug), name: String(row.name) }
}

export function getLoginUrl(db, platformId) {
  try {
    const row = db.prepare("SELECT url FROM platform_pages WHERE platform_id = ? AND slug = 'login' LIMIT 1").get(platformId)
    return row?.url || null
  } catch { return null }
}

// Credentials are encrypted with Electron safeStorage in the app.
// The CLI runner is expected to be executed as Electron (ELECTRON_RUN_AS_NODE=1),
// so we can decrypt via electron.safeStorage.
export function getCredentials(db, platformId) {
  const row = db.prepare('SELECT username, password_encrypted FROM platform_credentials WHERE platform_id = ?').get(platformId)
  if (!row?.username || !row?.password_encrypted) return null
  return { username: String(row.username), password_encrypted: row.password_encrypted }
}

export function detectChromePathCandidates() {
  const local = process.env.LOCALAPPDATA || ''
  return [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    `${local}/Google/Chrome/Application/chrome.exe`
  ].map(p => path.normalize(p))
}

export function detectChromePathFallback() {
  for (const p of detectChromePathCandidates()) {
    try { if (fs.existsSync(p)) return p } catch {}
  }
  return undefined
}

export function resolveFlowFileBySlug(slug) {
  const files = listFlowFiles(getFlowsDir())
  for (const f of files) {
    try {
      const obj = readJsonFile(f)
      const parsed = FlowSchema.safeParse(obj)
      if (parsed.success && parsed.data.slug === slug) return f
    } catch {}
  }
  return null
}

export function getProjectRoot() {
  const __filename = fileURLToPath(import.meta.url)
  // from admin/cli/lib -> up to project root: lib (.) -> cli (..) -> admin (../..) -> root (../../..)
  return path.resolve(path.dirname(__filename), '../../..')
}

export { getFlowsDir, listFlowFiles, readJsonFile, FlowSchema }
