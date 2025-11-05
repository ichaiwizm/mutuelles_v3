import { getDb } from '../db/connection'
import { z } from 'zod'

export function listCatalog() {
  const rows = getDb().prepare(`
    SELECT c.id, c.slug, c.name, c.status, c.base_url, c.website_url, c.notes,
           c.selected,
           CASE WHEN pc.username IS NOT NULL THEN 1 ELSE 0 END AS has_creds
    FROM platforms_catalog c
    LEFT JOIN platform_credentials pc ON pc.platform_id = c.id
    ORDER BY c.name
  `).all() as any[]
  return rows.map((r: any) => ({ ...r, selected: !!r.selected, has_creds: !!r.has_creds })) as Array<{
    id:number; slug:string; name:string; status:string; base_url?:string|null; website_url?:string|null; notes?:string|null; selected:boolean; has_creds:boolean
  }>
}

export function setSelected(payload: unknown) {
  const parsed = z.object({ platform_id: z.number().int().positive(), selected: z.boolean() }).parse(payload)
  const stmt = getDb().prepare(`UPDATE platforms_catalog SET selected = ? WHERE id = ?`)
  stmt.run(parsed.selected ? 1 : 0, parsed.platform_id)
  return { selected: parsed.selected }
}

// getUiFormsFromDb removed: no active usage in renderer. Keep schema column for backward-compat.
