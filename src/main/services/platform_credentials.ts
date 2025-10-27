import { safeStorage } from 'electron'
import { z } from 'zod'
import { getDb } from '../db/connection'

export function listSelectedWithCreds() {
  const rows = getDb().prepare(`
    SELECT c.id as platform_id, c.name, c.status,
           c.selected = 1 AS selected,
           pc.username IS NOT NULL AS has_creds,
           pc.username as username
    FROM platforms_catalog c
    LEFT JOIN platform_credentials pc ON pc.platform_id = c.id
    WHERE c.selected = 1
    ORDER BY c.name
  `).all() as any[]
  return rows.map(r => ({
    platform_id: Number(r.platform_id),
    name: String(r.name),
    status: String(r.status),
    selected: !!r.selected,
    has_creds: !!r.has_creds,
    username: r.username ? String(r.username) : null
  })) as Array<{ platform_id:number; name:string; status:string; selected:boolean; has_creds:boolean; username:string|null }>
}

export function getForPlatform(platformId: unknown) {
  const pid = Number(platformId)
  if (!Number.isInteger(pid) || pid <= 0) throw new Error('Identifiant de plateforme invalide')
  const row = getDb().prepare(`SELECT username FROM platform_credentials WHERE platform_id = ?`).get(pid) as { username?: string } | undefined
  return row?.username ? { username: row.username, has_creds: true } : { username: null, has_creds: false }
}

export function setForPlatform(payload: unknown) {
  const schema = z.object({ platform_id: z.number().int().positive(), username: z.string().min(1), password: z.string().min(1) })
  const data = schema.parse(payload)
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Chiffrement indisponible sur ce système (safeStorage).')
  const encrypted = safeStorage.encryptString(data.password)
  getDb().prepare(`INSERT INTO platform_credentials(platform_id, username, password_encrypted, updated_at)
                   VALUES(?, ?, ?, datetime('now'))
                   ON CONFLICT(platform_id) DO UPDATE SET username=excluded.username, password_encrypted=excluded.password_encrypted, updated_at=excluded.updated_at`)
       .run(data.platform_id, data.username, encrypted)
  return true
}

export function deleteForPlatform(platformId: unknown) {
  const pid = Number(platformId)
  if (!Number.isInteger(pid) || pid <= 0) throw new Error('Identifiant de plateforme invalide')
  const info = getDb().prepare('DELETE FROM platform_credentials WHERE platform_id = ?').run(pid)
  return info.changes > 0
}

export function revealPassword(platformId: unknown) {
  const pid = Number(platformId)
  if (!Number.isInteger(pid) || pid <= 0) throw new Error('Identifiant de plateforme invalide')
  const row = getDb().prepare('SELECT password_encrypted FROM platform_credentials WHERE platform_id = ?').get(pid) as { password_encrypted?: Buffer } | undefined
  if (!row?.password_encrypted) throw new Error('Aucun mot de passe enregistré')
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Chiffrement indisponible')

  const passwordBuffer = row.password_encrypted
  const passwordStr = passwordBuffer.toString('utf8')

  if (passwordStr.startsWith('CLI_ENCODED:')) {
    const originalPassword = passwordStr.substring('CLI_ENCODED:'.length)
    const properlyEncrypted = safeStorage.encryptString(originalPassword)

    getDb().prepare(`UPDATE platform_credentials
                     SET password_encrypted = ?, updated_at = datetime('now')
                     WHERE platform_id = ?`)
          .run(properlyEncrypted, pid)

    return originalPassword
  }

  return safeStorage.decryptString(row.password_encrypted)
}
