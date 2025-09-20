import fs from 'node:fs'
import path from 'node:path'
import { app, shell } from 'electron'
import { z } from 'zod'
import { getDb } from '../db/connection'
import { getChromePath } from './chrome'
import { spawn } from 'node:child_process'

const CreateSchema = z.object({ name: z.string().min(2) })

export function listProfiles() {
  const rows = getDb().prepare('SELECT id, name, user_data_dir, browser_channel, created_at, initialized_at FROM profiles ORDER BY id DESC').all()
  return rows as Array<{ id:number; name:string; user_data_dir:string; browser_channel:string|null; created_at:string; initialized_at?: string | null }>
}

export function createProfile(payload: unknown) {
  const data = CreateSchema.parse(payload)
  const base = path.join(app.getPath('userData'), 'profiles')
  fs.mkdirSync(base, { recursive: true })
  const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'profil'
  const dir = path.join(base, `${slug}-${Date.now()}`)
  fs.mkdirSync(dir, { recursive: true })
  const stmt = getDb().prepare("INSERT INTO profiles(name, user_data_dir, browser_channel) VALUES(?, ?, 'chrome')")
  const info = stmt.run(data.name, dir)
  return { id: Number(info.lastInsertRowid), name: data.name, user_data_dir: dir }
}

export function deleteProfile(id: unknown) {
  const pid = Number(id)
  if (!Number.isInteger(pid) || pid <= 0) throw new Error('Invalid profile id')
  const row = getDb().prepare('SELECT user_data_dir FROM profiles WHERE id = ?').get(pid) as { user_data_dir?: string } | undefined
  const info = getDb().prepare('DELETE FROM profiles WHERE id = ?').run(pid)
  if (row?.user_data_dir) {
    // Non destructif: on NE supprime PAS le dossier, on laisse l’utilisateur gérer.
  }
  return info.changes > 0
}

export function openProfileDir(id: unknown) {
  const pid = Number(id)
  if (!Number.isInteger(pid) || pid <= 0) throw new Error('Invalid profile id')
  const row = getDb().prepare('SELECT user_data_dir FROM profiles WHERE id = ?').get(pid) as { user_data_dir?: string } | undefined
  if (!row?.user_data_dir) throw new Error('Profil introuvable')
  return shell.openPath(row.user_data_dir)
}

export async function initProfile(id: unknown, timeoutMs = 15000) {
  const pid = Number(id)
  if (!Number.isInteger(pid) || pid <= 0) throw new Error('Identifiant de profil invalide')
  const row = getDb().prepare('SELECT user_data_dir FROM profiles WHERE id = ?').get(pid) as { user_data_dir?: string } | undefined
  if (!row?.user_data_dir) throw new Error('Profil introuvable')

  const chrome = getChromePath()
  if (!chrome) throw new Error('Chrome non détecté. Définissez le chemin de chrome.exe.')

  const udd = row.user_data_dir
  fs.mkdirSync(udd, { recursive: true })
  const args = [
    `--user-data-dir=${udd}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]
  const child = spawn(chrome, args, { detached: true, stdio: 'ignore' })
  child.unref()

  const ok = await waitForProfileFiles(udd, timeoutMs)
  if (!ok) throw new Error('Initialisation du profil expirée')
  getDb().prepare("UPDATE profiles SET initialized_at = datetime('now') WHERE id = ?").run(pid)
  try {
    if (child.pid) {
      if (process.platform === 'win32') process.kill(child.pid)
      else child.kill()
    }
  } catch {}
  return true
}

function waitForProfileFiles(dir: string, timeoutMs: number) {
  const start = Date.now()
  const localState = path.join(dir, 'Local State')
  const defaultDir = path.join(dir, 'Default')
  return new Promise<boolean>((resolve) => {
    const iv = setInterval(() => {
      const ok = fs.existsSync(localState) && fs.existsSync(defaultDir)
      if (ok) { clearInterval(iv); resolve(true) }
      else if (Date.now() - start > timeoutMs) { clearInterval(iv); resolve(false) }
    }, 300)
  })
}

export function testProfile(id: unknown) {
  const pid = Number(id)
  if (!Number.isInteger(pid) || pid <= 0) throw new Error('Identifiant de profil invalide')
  const row = getDb().prepare('SELECT user_data_dir FROM profiles WHERE id = ?').get(pid) as { user_data_dir?: string } | undefined
  if (!row?.user_data_dir) throw new Error('Profil introuvable')
  const chrome = getChromePath()
  if (!chrome) throw new Error('Chrome non détecté. Définissez le chemin de chrome.exe.')
  const args = [
    `--user-data-dir=${row.user_data_dir}`,
    '--no-first-run',
    '--no-default-browser-check'
  ]
  spawn(chrome, args, { detached: true, stdio: 'ignore' }).unref()
  getDb().prepare("UPDATE profiles SET browser_channel = 'chrome' WHERE id = ?").run(pid)
  return true
}
