import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

// Local copies to avoid importing better-sqlite3-bound helpers under WSL
export function getProjectRoot() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  return path.resolve(__dirname, '../../../')
}
export function getDbPath() {
  const root = getProjectRoot()
  const devDir = process.env.MUTUELLES_DB_DIR || path.join(root, 'dev-data')
  fs.mkdirSync(devDir, { recursive: true })
  return path.join(devDir, 'mutuelles.sqlite3')
}

// ---------- Schema ----------
export const StepGoto = z.object({ type: z.literal('goto'), url: z.string().min(1), screenshot_label: z.string().optional(), timeout_ms: z.number().int().nonnegative().optional() })
export const StepWaitFor = z.object({ type: z.literal('waitFor'), selector: z.string().min(1), screenshot_label: z.string().optional(), timeout_ms: z.number().int().nonnegative().optional() })
export const StepFill = z.object({ type: z.literal('fill'), selector: z.string().min(1), value: z.string().default(''), screenshot_label: z.string().optional(), timeout_ms: z.number().int().nonnegative().optional() })
export const StepClick = z.object({ type: z.literal('click'), selector: z.string().min(1), screenshot_label: z.string().optional(), timeout_ms: z.number().int().nonnegative().optional() })
export const StepTryClick = z.object({ type: z.literal('tryClick'), selector: z.string().min(1), screenshot_label: z.string().optional(), timeout_ms: z.number().int().nonnegative().optional() })
export const StepAssert = z.object({ type: z.literal('assertText'), selector: z.string().min(1), assert_text: z.string().min(1), screenshot_label: z.string().optional(), timeout_ms: z.number().int().nonnegative().optional() })
export const StepScreenshot = z.object({ type: z.literal('screenshot'), screenshot_label: z.string().optional(), timeout_ms: z.number().int().nonnegative().optional() })
export const StepSleep = z.object({ type: z.literal('sleep'), timeout_ms: z.number().int().nonnegative() })
// Tolérance pour steps techniques internes éventuels
export const StepDebugAxeptio = z.object({ type: z.literal('debugAxeptio'), screenshot_label: z.string().optional(), timeout_ms: z.number().int().nonnegative().optional() })

export const StepSchema = z.discriminatedUnion('type', [
  StepGoto, StepWaitFor, StepFill, StepClick, StepTryClick, StepAssert, StepScreenshot, StepSleep, StepDebugAxeptio
])

export const FlowSchema = z.object({
  version: z.literal(1).default(1),
  platform: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  active: z.boolean().default(true),
  steps: z.array(StepSchema).min(1)
}).strict()

export function getFlowsDir() {
  return path.join(getProjectRoot(), 'flows')
}

export function ensureDir(p) { fs.mkdirSync(p, { recursive: true }) }

export function readJsonFile(file) {
  const raw = fs.readFileSync(file, 'utf-8')
  return JSON.parse(raw)
}

export function writeJsonFile(file, data) {
  ensureDir(path.dirname(file))
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

export function normalizeFlowObject(obj) {
  // Version par défaut + normalisation simple
  const parsed = FlowSchema.parse(obj)
  return parsed
}

export function flowFilePath(flow) {
  const base = getFlowsDir()
  return path.join(base, flow.platform, `${flow.slug}.json`)
}

export function listFlowFiles(base = getFlowsDir()) {
  const out = []
  function walk(dir) {
    if (!fs.existsSync(dir)) return
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.isFile() && e.name.endsWith('.json')) out.push(p)
    }
  }
  walk(base)
  return out
}

// ---------- DB helpers ----------
export function openDbRW() {
  // Dynamically require better-sqlite3 to avoid import-time failures in mixed envs
  const require = createRequire(import.meta.url)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Database = require('better-sqlite3')
  const db = new Database(getDbPath())
  try { db.pragma('journal_mode = WAL') } catch {}
  try { db.pragma('foreign_keys = ON') } catch {}
  try { db.pragma('busy_timeout = 5000') } catch {}
  return db
}

export function getPlatformBySlug(db, slug) {
  const row = db.prepare('SELECT id, slug, name FROM platforms_catalog WHERE slug = ?').get(slug)
  if (!row) throw new Error(`Plateforme inconnue: ${slug}`)
  return row
}

export function getFlowFromDb(db, slug) {
  const row = db.prepare(`
    SELECT f.id, f.slug, f.name, f.active, p.slug as platform
    FROM flows_catalog f JOIN platforms_catalog p ON p.id = f.platform_id
    WHERE f.slug = ?
  `).get(slug)
  if (!row) return null
  const steps = db.prepare(`
    SELECT order_index, type, selector, value, url, screenshot_label, timeout_ms, assert_text
    FROM flow_steps WHERE flow_id = ? ORDER BY order_index
  `).all(row.id)
  const cleanedSteps = steps.map(s => ({
    ...s,
    timeout_ms: s.timeout_ms ?? undefined,
    screenshot_label: s.screenshot_label ?? undefined,
    selector: s.selector ?? undefined,
    value: s.value ?? undefined,
    url: s.url ?? undefined,
    assert_text: s.assert_text ?? undefined
  }))
  const flow = { version: 1, platform: row.platform, slug: row.slug, name: row.name, active: !!row.active, steps: cleanedSteps }
  // Conformité schéma (peut lever)
  return normalizeFlowObject(flow)
}

export function listFlowsFromDb(db, { includeInactive = true } = {}) {
  const rows = db.prepare(`
    SELECT f.id, f.slug, f.name, f.active, p.slug as platform
    FROM flows_catalog f JOIN platforms_catalog p ON p.id = f.platform_id
    ${includeInactive ? '' : 'WHERE f.active = 1'}
    ORDER BY p.slug, f.slug
  `).all()
  return rows.map(r => ({ id: r.id, platform: r.platform, slug: r.slug, name: r.name, active: !!r.active }))
}

export async function backupDbFile(suffix = '') {
  const src = getDbPath()
  const dir = path.dirname(src)
  const ts = new Date().toISOString().replace(/[:.]/g, '').replace('T','-').slice(0,15)
  const dest = path.join(dir, `mutuelles.sqlite3.bak-${ts}${suffix||''}`)
  const db = openDbRW()
  try {
    if (typeof db.backup === 'function') {
      await db.backup(dest)
    } else {
      fs.copyFileSync(src, dest)
    }
  } finally {
    db.close()
  }
  return dest
}

export function upsertFlowInDb(db, flow, { mode = 'upsert' } = {}) {
  const f = normalizeFlowObject(flow)
  const plat = getPlatformBySlug(db, f.platform)
  const existing = db.prepare('SELECT id FROM flows_catalog WHERE slug = ?').get(f.slug)
  if (mode === 'add' && existing) throw new Error(`Flow déjà existant: ${f.slug}`)
  if (mode === 'update' && !existing) throw new Error(`Flow introuvable: ${f.slug}`)

  db.transaction(() => {
    const flowId = existing?.id ?? (db.prepare('INSERT INTO flows_catalog(platform_id, slug, name, active) VALUES(?, ?, ?, ?)')
      .run(plat.id, f.slug, f.name, f.active ? 1 : 0).lastInsertRowid)

    if (existing) {
      db.prepare('UPDATE flows_catalog SET platform_id=?, name=?, active=? WHERE id=?')
        .run(plat.id, f.name, f.active ? 1 : 0, existing.id)
      db.prepare('DELETE FROM flow_steps WHERE flow_id = ?').run(existing.id)
    }

    const fid = Number(existing?.id ?? flowId)
    const insert = db.prepare(`INSERT INTO flow_steps(flow_id, order_index, type, selector, value, url, screenshot_label, timeout_ms, assert_text)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    f.steps.forEach((s, i) => {
      insert.run(fid, i + 1, s.type, s.selector ?? null, s.value ?? null, s.url ?? null, s.screenshot_label ?? null, s.timeout_ms ?? null, s.assert_text ?? null)
    })
  })()
}

export function softDeleteFlow(db, slug) {
  const res = db.prepare('UPDATE flows_catalog SET active=0 WHERE slug = ?').run(slug)
  if (res.changes === 0) throw new Error(`Flow introuvable: ${slug}`)
}

export function hardDeleteFlow(db, slug) {
  const res = db.prepare('DELETE FROM flows_catalog WHERE slug = ?').run(slug)
  if (res.changes === 0) throw new Error(`Flow introuvable: ${slug}`)
}
