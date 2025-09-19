import fs from 'node:fs'
import path from 'node:path'
import { app, shell } from 'electron'
import { z } from 'zod'
import { getDb } from '../db/connection'

const CreateSchema = z.object({ name: z.string().min(2) })

export function listProfiles() {
  const rows = getDb().prepare('SELECT id, name, user_data_dir, browser_channel, created_at FROM profiles ORDER BY id DESC').all()
  return rows as Array<{ id:number; name:string; user_data_dir:string; browser_channel:string|null; created_at:string }>
}

export function createProfile(payload: unknown) {
  const data = CreateSchema.parse(payload)
  const base = path.join(app.getPath('userData'), 'profiles')
  fs.mkdirSync(base, { recursive: true })
  const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'profil'
  const dir = path.join(base, `${slug}-${Date.now()}`)
  fs.mkdirSync(dir, { recursive: true })
  const stmt = getDb().prepare('INSERT INTO profiles(name, user_data_dir) VALUES(?, ?)')
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

