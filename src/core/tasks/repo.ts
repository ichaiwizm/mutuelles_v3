import { getDb } from '../db/connection'
import type { Task, TaskStatus } from '../../shared/types/canonical'

export function enqueue(task: Task) {
  const db = getDb()
  db.prepare(
    `INSERT INTO tasks(id, lead_id, platform, product, status, logs, result_path, created_at)
     VALUES(?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    task.id,
    task.leadId,
    task.platform,
    task.product,
    task.status,
    task.logs ?? null,
    task.resultPath ?? null,
    task.createdAt
  )
}

export function listByLead(leadId: string): Task[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM tasks WHERE lead_id = ? ORDER BY created_at DESC').all(leadId) as any[]
  return rows.map((r) => ({
    id: String(r.id),
    leadId: String(r.lead_id),
    platform: String(r.platform),
    product: String(r.product),
    status: r.status as TaskStatus,
    logs: r.logs ?? null,
    resultPath: r.result_path ?? null,
    createdAt: String(r.created_at),
    startedAt: r.started_at ?? null,
    finishedAt: r.finished_at ?? null,
  }))
}

export function listRecent(limit = 50): Task[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?')
    .all(limit) as any[]
  return rows.map((r) => ({
    id: String(r.id),
    leadId: String(r.lead_id),
    platform: String(r.platform),
    product: String(r.product),
    status: r.status as TaskStatus,
    logs: r.logs ?? null,
    resultPath: r.result_path ?? null,
    createdAt: String(r.created_at),
    startedAt: r.started_at ?? null,
    finishedAt: r.finished_at ?? null,
  }))
}

export function updateStatus(id: string, status: TaskStatus) {
  const db = getDb()
  const now = new Date().toISOString()
  const fields: string[] = ['status = ?']
  const values: any[] = [status]
  if (status === 'running') fields.push('started_at = ?'), values.push(now)
  if (status === 'success' || status === 'failed') fields.push('finished_at = ?'), values.push(now)
  values.push(id)
  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values)
}

export function appendLog(id: string, line: string) {
  const db = getDb()
  db.prepare('UPDATE tasks SET logs = COALESCE(logs, "") || ? || char(10) WHERE id = ?').run(line, id)
}

export function updateResultPath(id: string, resultPath: string | null) {
  const db = getDb()
  db.prepare('UPDATE tasks SET result_path = ? WHERE id = ?').run(resultPath ?? null, id)
}
