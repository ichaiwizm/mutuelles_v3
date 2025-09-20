import { getDb } from '../db/connection'
import { z } from 'zod'

export function listCatalog() {
  const rows = getDb().prepare(`
    SELECT c.id, c.slug, c.name, c.status, c.base_url, c.website_url, c.notes,
           CASE WHEN up.selected = 1 THEN 1 ELSE 0 END AS selected,
           CASE WHEN pc.username IS NOT NULL THEN 1 ELSE 0 END AS has_creds
    FROM platforms_catalog c
    LEFT JOIN user_platforms up ON up.platform_id = c.id
    LEFT JOIN platform_credentials pc ON pc.platform_id = c.id
    ORDER BY c.name
  `).all() as any[]
  return rows.map((r: any) => ({ ...r, selected: !!r.selected, has_creds: !!r.has_creds })) as Array<{
    id:number; slug:string; name:string; status:string; base_url?:string|null; website_url?:string|null; notes?:string|null; selected:boolean; has_creds:boolean
  }>
}

export function setSelected(payload: unknown) {
  const parsed = z.object({ platform_id: z.number().int().positive(), selected: z.boolean() }).parse(payload)
  const stmt = getDb().prepare(`INSERT INTO user_platforms(platform_id, selected) VALUES(?, ?) 
                                ON CONFLICT(platform_id) DO UPDATE SET selected=excluded.selected`)
  stmt.run(parsed.platform_id, parsed.selected ? 1 : 0)
  return { selected: parsed.selected }
}

export function listPages(platformId: unknown) {
  const pid = Number(platformId)
  if (!Number.isInteger(pid) || pid <= 0) throw new Error('Identifiant de plateforme invalide')
  const rows = getDb().prepare(`
    SELECT id, platform_id, slug, name, type, url, status, order_index
    FROM platform_pages WHERE platform_id = ? AND active = 1
    ORDER BY order_index, id
  `).all(pid) as any[]
  return rows as Array<{ id:number; platform_id:number; slug:string; name:string; type:string; url:string|null; status:string; order_index:number }>
}

export function listFields(pageId: unknown) {
  const pg = Number(pageId)
  if (!Number.isInteger(pg) || pg <= 0) throw new Error('Identifiant de page invalide')
  const rows = getDb().prepare(`
    SELECT id, page_id, key, label, type, required, secure, order_index
    FROM platform_fields WHERE page_id = ?
    ORDER BY order_index, id
  `).all(pg) as any[]
  return rows.map((r: any) => ({ ...r, required: !!r.required, secure: !!r.secure })) as Array<{
    id:number; page_id:number; key:string; label:string; type:string; required:boolean; secure:boolean; order_index:number
  }>
}
