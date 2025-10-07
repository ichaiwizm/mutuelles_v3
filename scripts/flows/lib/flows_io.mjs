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

// ---------- Schema avec support High-Level ----------

// Low-Level step types (originaux)
export const StepGoto = z.object({
  type: z.literal('goto'),
  url: z.string().min(1),
  label: z.string().optional(),
  timeout_ms: z.number().int().nonnegative().optional()
})

export const StepWaitFor = z.object({
  type: z.literal('waitFor'),
  selector: z.string().min(1),
  label: z.string().optional(),
  timeout_ms: z.number().int().nonnegative().optional()
})

export const StepFill = z.object({
  type: z.literal('fill'),
  selector: z.string().min(1),
  value: z.string().default(''),
  label: z.string().optional(),
  timeout_ms: z.number().int().nonnegative().optional()
})

export const StepClick = z.object({
  type: z.literal('click'),
  selector: z.string().min(1),
  label: z.string().optional(),
  timeout_ms: z.number().int().nonnegative().optional()
})

export const StepTryClick = z.object({
  type: z.literal('tryClick'),
  selector: z.string().min(1),
  label: z.string().optional(),
  timeout_ms: z.number().int().nonnegative().optional()
})

export const StepAssert = z.object({
  type: z.literal('assertText'),
  selector: z.string().min(1),
  assert_text: z.string().min(1),
  label: z.string().optional(),
  timeout_ms: z.number().int().nonnegative().optional()
})

export const StepScreenshot = z.object({
  type: z.literal('screenshot'),
  label: z.string().optional(),
  timeout_ms: z.number().int().nonnegative().optional()
})

export const StepSleep = z.object({
  type: z.literal('sleep'),
  timeout_ms: z.number().int().nonnegative(),
  label: z.string().optional()
})

export const StepDebugAxeptio = z.object({
  type: z.literal('debugAxeptio'),
  label: z.string().optional(),
  timeout_ms: z.number().int().nonnegative().optional()
})

// High-Level step types (NOUVEAUX)
export const StepWaitForField = z.object({
  type: z.literal('waitForField'),
  field: z.string().min(1).optional(),
  label: z.string().optional(),
  timeout_ms: z.number().int().nonnegative().optional(),
  optional: z.boolean().optional()
})

export const StepFillField = z.object({
  type: z.literal('fillField'),
  field: z.string().min(1),
  value: z.string().optional(),
  leadKey: z.string().optional(),
  label: z.string().optional(),
  method: z.enum(['default', 'jquery']).optional(),
  triggerEvents: z.array(z.string()).optional(),
  timeout_ms: z.number().int().nonnegative().optional(),
  optional: z.boolean().optional(),
  skipIfNot: z.string().optional()
})

export const StepClickField = z.object({
  type: z.literal('clickField'),
  field: z.string().min(1).optional(),
  label: z.string().optional(),
  timeout_ms: z.number().int().nonnegative().optional(),
  optional: z.boolean().optional(),
  skipIfNot: z.string().optional()
})

export const StepSelectField = z.object({
  type: z.literal('selectField'),
  field: z.string().min(1),
  value: z.string().optional(),
  leadKey: z.string().optional(),
  label: z.string().optional(),
  method: z.enum(['default', 'jquery']).optional(),
  triggerEvents: z.array(z.string()).optional(),
  postDelay_ms: z.number().int().nonnegative().optional(),
  timeout_ms: z.number().int().nonnegative().optional(),
  optional: z.boolean().optional(),
  skipIfNot: z.string().optional()
})

export const StepToggleField = z.object({
  type: z.literal('toggleField'),
  field: z.string().min(1),
  state: z.enum(['on', 'off']).optional(),
  leadKey: z.string().optional(),
  label: z.string().optional(),
  timeout_ms: z.number().int().nonnegative().optional(),
  optional: z.boolean().optional(),
  skipIfNot: z.string().optional()
})

export const StepTypeField = z.object({
  type: z.literal('typeField'),
  field: z.string().min(1),
  value: z.string().optional(),
  leadKey: z.string().optional(),
  label: z.string().optional(),
  delay_ms: z.number().int().nonnegative().optional(),
  timeout_ms: z.number().int().nonnegative().optional(),
  optional: z.boolean().optional(),
  skipIfNot: z.string().optional()
})

export const StepPressKey = z.object({
  type: z.literal('pressKey'),
  key: z.string().min(1),
  label: z.string().optional(),
  timeout_ms: z.number().int().nonnegative().optional()
})

export const StepScrollIntoView = z.object({
  type: z.literal('scrollIntoView'),
  field: z.string().min(1).optional(),
  selector: z.string().optional(),
  label: z.string().optional(),
  timeout_ms: z.number().int().nonnegative().optional()
})

export const StepEnterFrame = z.object({
  type: z.literal('enterFrame'),
  selector: z.string().min(1),
  label: z.string().optional(),
  timeout_ms: z.number().int().nonnegative().optional()
})

export const StepExitFrame = z.object({
  type: z.literal('exitFrame'),
  label: z.string().optional()
})

export const StepWaitForNetworkIdle = z.object({
  type: z.literal('waitForNetworkIdle'),
  label: z.string().optional(),
  timeout_ms: z.number().int().nonnegative().optional()
})

export const StepAcceptConsent = z.object({
  type: z.literal('acceptConsent'),
  selector: z.string().min(1).optional(),
  label: z.string().optional(),
  timeout_ms: z.number().int().nonnegative().optional(),
  optional: z.boolean().optional()
})

export const StepComment = z.object({
  type: z.literal('comment'),
  text: z.string().min(1),
  label: z.string().optional()
})

// Union de tous les types (Low-Level + High-Level)
export const StepSchema = z.discriminatedUnion('type', [
  // Low-level
  StepGoto,
  StepWaitFor,
  StepFill,
  StepClick,
  StepTryClick,
  StepAssert,
  StepScreenshot,
  StepSleep,
  StepDebugAxeptio,
  // High-level
  StepWaitForField,
  StepFillField,
  StepClickField,
  StepSelectField,
  StepToggleField,
  StepTypeField,
  StepPressKey,
  StepScrollIntoView,
  StepEnterFrame,
  StepExitFrame,
  StepWaitForNetworkIdle,
  StepAcceptConsent,
  StepComment
])

export const FlowSchema = z.object({
  version: z.literal(1).default(1),
  platform: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  active: z.boolean().optional().default(true),
  trace: z.enum(['always', 'retain-on-failure', 'never']).optional(),
  steps: z.array(StepSchema).min(1)
})

export function getFlowsDir() {
  return path.join(getProjectRoot(), 'admin', 'flows')
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
      else if (e.isFile() && (e.name.endsWith('.json') || e.name.endsWith('.hl.json'))) out.push(p)
    }
  }
  walk(base)
  return out
}

// ---------- DB helpers (SIMPLIFIÉS pour JSON) ----------
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
    SELECT f.flow_json, f.slug, f.name, f.active, p.slug as platform
    FROM flows_catalog f JOIN platforms_catalog p ON p.id = f.platform_id
    WHERE f.slug = ?
  `).get(slug)
  if (!row) return null

  // Si flow_json existe, l'utiliser directement
  if (row.flow_json) {
    const flow = JSON.parse(row.flow_json)
    return normalizeFlowObject(flow)
  }

  // Sinon, fallback sur l'ancienne méthode (flow_steps)
  const flowId = db.prepare('SELECT id FROM flows_catalog WHERE slug = ?').get(slug)?.id
  if (!flowId) return null

  const steps = db.prepare(`
    SELECT order_index, type, selector, value, url, screenshot_label, timeout_ms, assert_text
    FROM flow_steps WHERE flow_id = ? ORDER BY order_index
  `).all(flowId)

  const cleanedSteps = steps.map(s => {
    const step = { type: s.type }
    if (s.selector) step.selector = s.selector
    if (s.value) step.value = s.value
    if (s.url) step.url = s.url
    if (s.screenshot_label) step.label = s.screenshot_label
    if (s.timeout_ms) step.timeout_ms = s.timeout_ms
    if (s.assert_text) step.assert_text = s.assert_text
    return step
  })

  const flow = {
    version: 1,
    platform: row.platform,
    slug: row.slug,
    name: row.name,
    active: !!row.active,
    steps: cleanedSteps
  }
  return normalizeFlowObject(flow)
}

export function listFlowsFromDb(db, { includeInactive = true } = {}) {
  const rows = db.prepare(`
    SELECT f.id, f.slug, f.name, f.active, f.steps_count, p.slug as platform
    FROM flows_catalog f JOIN platforms_catalog p ON p.id = f.platform_id
    ${includeInactive ? '' : 'WHERE f.active = 1'}
    ORDER BY p.slug, f.slug
  `).all()
  return rows.map(r => ({
    id: r.id,
    platform: r.platform,
    slug: r.slug,
    name: r.name,
    active: !!r.active,
    steps_count: r.steps_count || 0
  }))
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

// NOUVELLE VERSION: upsert avec flow_json
export function upsertFlowInDb(db, flow, { mode = 'upsert' } = {}) {
  const f = normalizeFlowObject(flow)
  const plat = getPlatformBySlug(db, f.platform)
  const existing = db.prepare('SELECT id FROM flows_catalog WHERE slug = ?').get(f.slug)
  if (mode === 'add' && existing) throw new Error(`Flow déjà existant: ${f.slug}`)
  if (mode === 'update' && !existing) throw new Error(`Flow introuvable: ${f.slug}`)

  const flowJson = JSON.stringify(f, null, 2)
  const stepsCount = f.steps.length

  if (existing) {
    // UPDATE avec flow_json
    db.prepare(`
      UPDATE flows_catalog
      SET platform_id = ?, name = ?, active = ?, flow_json = ?, steps_count = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(plat.id, f.name, f.active ? 1 : 0, flowJson, stepsCount, existing.id)
  } else {
    // INSERT avec flow_json
    db.prepare(`
      INSERT INTO flows_catalog (platform_id, slug, name, active, flow_json, steps_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(plat.id, f.slug, f.name, f.active ? 1 : 0, flowJson, stepsCount)
  }
}

export function softDeleteFlow(db, slug) {
  const res = db.prepare('UPDATE flows_catalog SET active=0 WHERE slug = ?').run(slug)
  if (res.changes === 0) throw new Error(`Flow introuvable: ${slug}`)
}

export function hardDeleteFlow(db, slug) {
  const res = db.prepare('DELETE FROM flows_catalog WHERE slug = ?').run(slug)
  if (res.changes === 0) throw new Error(`Flow introuvable: ${slug}`)
}
