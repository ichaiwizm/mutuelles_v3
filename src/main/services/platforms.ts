import { getDb } from '../db/connection'
import { PlatformSchema } from '../../shared/platforms'

export function listPlatforms() {
  const rows = getDb().prepare('SELECT id, name, login_url FROM platforms ORDER BY id DESC').all()
  return rows as Array<{ id: number; name: string; login_url: string | null }>
}

export function createPlatform(input: unknown) {
  const data = PlatformSchema.omit({ id: true }).parse(input)
  const stmt = getDb().prepare('INSERT INTO platforms(name, login_url) VALUES(?, ?)')
  const info = stmt.run(data.name, data.login_url || null)
  return { id: Number(info.lastInsertRowid), ...data }
}

export function deletePlatform(id: unknown) {
  const pid = Number(id)
  if (!Number.isInteger(pid) || pid <= 0) throw new Error('Identifiant de plateforme invalide')
  const info = getDb().prepare('DELETE FROM platforms WHERE id = ?').run(pid)
  return info.changes > 0
}
