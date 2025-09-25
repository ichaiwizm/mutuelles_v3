import fs from 'node:fs'
import path from 'node:path'
import { dialog, app } from 'electron'
import { getDb } from '../db/connection'

export function listRuns(params?: { flowSlug?: string; limit?: number; offset?: number }) {
  const limit = Math.max(1, Math.min(params?.limit ?? 20, 200))
  const offset = Math.max(0, Math.min(params?.offset ?? 0, 1000000))
  backfillIfEmpty(params?.flowSlug)
  const db = getDb()
  if (params?.flowSlug) {
    const total = (db.prepare(`SELECT COUNT(*) as c FROM flows_runs WHERE flow_slug = ?`).get(params.flowSlug) as any).c as number
    const items = db.prepare(`
      SELECT r.run_uid as runId, r.flow_slug as flowSlug, r.started_at as startedAt, r.finished_at as finishedAt,
             r.status, r.screenshots_dir as screenshotsDir, r.json_path as jsonPath, r.steps_total as stepsTotal, r.ok_steps as okSteps, r.error_message as error
      FROM flows_runs r WHERE r.flow_slug = ? ORDER BY r.started_at DESC LIMIT ? OFFSET ?
    `).all(params.flowSlug, limit, offset)
    return { items, total }
  }
  const total = (db.prepare(`SELECT COUNT(*) as c FROM flows_runs`).get() as any).c as number
  const items = db.prepare(`
    SELECT r.run_uid as runId, r.flow_slug as flowSlug, r.started_at as startedAt, r.finished_at as finishedAt,
           r.status, r.screenshots_dir as screenshotsDir, r.json_path as jsonPath, r.steps_total as stepsTotal, r.ok_steps as okSteps, r.error_message as error
    FROM flows_runs r ORDER BY r.started_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset)
  return { items, total }
}

export function getRun(runId: string) {
  const row = getDb().prepare('SELECT json_path as jsonPath FROM flows_runs WHERE run_uid = ?').get(runId) as { jsonPath?: string }|undefined
  if (!row?.jsonPath) throw new Error('Run introuvable')
  const content = fs.readFileSync(row.jsonPath, 'utf-8')
  return { jsonPath: row.jsonPath, json: JSON.parse(content) }
}

export function listScreenshots(runId: string) {
  const row = getDb().prepare('SELECT screenshots_dir as dir FROM flows_runs WHERE run_uid = ?').get(runId) as { dir?: string }|undefined
  if (!row?.dir) return []
  if (!fs.existsSync(row.dir)) return []
  return fs.readdirSync(row.dir)
    .filter(f => f.toLowerCase().endsWith('.png'))
    .sort()
}

export function getScreenshotData(runId: string, filename: string) {
  const row = getDb().prepare('SELECT screenshots_dir as dir FROM flows_runs WHERE run_uid = ?').get(runId) as { dir?: string }|undefined
  if (!row?.dir) throw new Error('Run introuvable')
  const file = path.join(row.dir, filename)
  if (!file.startsWith(row.dir)) throw new Error('Chemin invalide')
  const buf = fs.readFileSync(file)
  const b64 = buf.toString('base64')
  return `data:image/png;base64,${b64}`
}

export async function exportRunJson(runId: string) {
  const row = getDb().prepare('SELECT json_path as jsonPath FROM flows_runs WHERE run_uid = ?').get(runId) as { jsonPath?: string }|undefined
  if (!row?.jsonPath) throw new Error('Run introuvable')
  const dlg = await dialog.showSaveDialog({ filters: [{ name: 'JSON', extensions: ['json'] }] })
  if (dlg.canceled || !dlg.filePath) return null
  const content = fs.readFileSync(row.jsonPath)
  fs.writeFileSync(dlg.filePath, content)
  return dlg.filePath
}

export function deleteRun(runId: string) {
  const row = getDb().prepare('SELECT screenshots_dir as dir, json_path as jsonPath FROM flows_runs WHERE run_uid = ?').get(runId) as { dir?: string; jsonPath?: string }|undefined
  getDb().prepare('DELETE FROM flows_runs WHERE run_uid = ?').run(runId)
  if (row) {
    try { if (row.jsonPath && fs.existsSync(row.jsonPath)) fs.unlinkSync(row.jsonPath) } catch {}
    try {
      if (row.dir && fs.existsSync(row.dir)) {
        // Node 22: rmSync récursif
        // @ts-ignore
        fs.rmSync(row.dir, { recursive: true, force: true })
      }
    } catch {}
  }
  return true
}

export function deleteAllRuns() {
  const db = getDb()
  const rows = db.prepare('SELECT screenshots_dir as dir, json_path as jsonPath FROM flows_runs').all() as { dir?: string; jsonPath?: string }[]

  db.prepare('DELETE FROM flows_runs').run()

  for (const row of rows) {
    try { if (row.jsonPath && fs.existsSync(row.jsonPath)) fs.unlinkSync(row.jsonPath) } catch {}
    try {
      if (row.dir && fs.existsSync(row.dir)) {
        // Node 22: rmSync récursif
        // @ts-ignore
        fs.rmSync(row.dir, { recursive: true, force: true })
      }
    } catch {}
  }

  return { deleted: rows.length }
}

function backfillIfEmpty(flowSlug?: string) {
  const db = getDb()
  const where = flowSlug ? 'WHERE flow_slug = ?' : ''
  const count = flowSlug
    ? (db.prepare(`SELECT COUNT(*) as c FROM flows_runs ${where}`).get(flowSlug) as any).c
    : (db.prepare(`SELECT COUNT(*) as c FROM flows_runs`).get() as any).c
  if (count > 0) return
  const runsRoot = path.join(app.getPath('userData'), 'runs')
  if (!fs.existsSync(runsRoot)) return
  const slugs = flowSlug ? [flowSlug] : fs.readdirSync(runsRoot).filter(d => {
    try { return fs.statSync(path.join(runsRoot, d)).isDirectory() } catch { return false }
  })
  const insert = db.prepare(`INSERT OR IGNORE INTO flows_runs(flow_id, run_uid, flow_slug, started_at, finished_at, status, screenshots_dir, json_path, steps_total, ok_steps, error_message)
                              VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  for (const slug of slugs) {
    const dir = path.join(runsRoot, slug)
    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.json')).slice(-50) // derniers 50
    for (const f of files) {
      const jsonPath = path.join(dir, f)
      try {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
        const runUid = f.replace(/\.json$/i, '')
        const flowRow = db.prepare('SELECT id FROM flows_catalog WHERE slug = ?').get(slug) as { id?: number }|undefined
        const flowId = flowRow?.id ?? null
        const startedAt = data.startedAt || new Date().toISOString()
        const finishedAt = data.finishedAt || null
        const stepsTotal = Array.isArray(data.steps) ? data.steps.length : null
        const okSteps = Array.isArray(data.steps) ? data.steps.filter((s:any)=>s.ok).length : null
        const status = data.error ? 'error' : (finishedAt ? 'success' : 'running')
        const screenshotsDir = data.screenshotsDir || null
        insert.run(flowId, runUid, slug, startedAt, finishedAt, status, screenshotsDir, jsonPath, stepsTotal, okSteps, data.error || null)
      } catch {}
    }
  }
}
