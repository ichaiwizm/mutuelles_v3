import { getDb } from '../../../db/connection'
import * as execQueries from '../../../../shared/db/queries/executions'
import path from 'node:path'
import fs from 'node:fs'

export const Db = {
  conn() {
    return getDb()
  },
  createRun(args: Parameters<typeof execQueries.createRun>[1]) {
    const db = getDb()
    execQueries.createRun(db, args)
  },
  updateRun(runId: string, updates: any) {
    const db = getDb()
    execQueries.updateRun(db, runId, updates)
  },
  createItem(data: any) {
    const db = getDb()
    execQueries.createItem(db as any, data)
  },
  updateItem(id: string, updates: any) {
    const db = getDb()
    execQueries.updateItem(db as any, id, updates)
  },
  incrementRunCounter(runId: string, field: 'pending_items' | 'success_items' | 'error_items', delta = 1) {
    const db = getDb()
    execQueries.incrementRunCounter(db as any, runId, field as any, delta)
  },
  createAttempt(data: any) {
    const db = getDb()
    execQueries.createAttempt(db as any, data)
  },
  updateAttempt(itemId: string, attemptNumber: number, updates: any) {
    const db = getDb()
    execQueries.updateAttempt(db as any, itemId, attemptNumber, updates)
  },
  createStepFromManifest(itemId: string, step: any, runDir: string) {
    const db = getDb()
    execQueries.createStep(db as any, {
      item_id: itemId,
      step_index: step.index,
      step_type: step.type || 'unknown',
      step_label: step.label || null,
      status: step.ok ? 'success' : step.skipped ? 'skipped' : 'error',
      error_message: typeof step.error === 'string' ? step.error : step.error?.message || null,
      duration_ms: step.ms || null,
      screenshot_path: step.screenshot ? path.join(runDir, step.screenshot) : undefined
    })
  },
  getCountsForStop(runId: string) {
    const db = getDb()
    return (db
      .prepare(
        `SELECT
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running
        FROM execution_items
        WHERE run_id = ?`
      )
      .get(runId) || { pending: 0, running: 0 }) as { pending: number; running: number }
  },
  cancelPendingItems(runId: string) {
    const db = getDb()
    return execQueries.cancelPendingItems(db as any, runId)
  },
  checkDbCompletion(runId: string): boolean {
    try {
      const db = getDb()
      const counts = db
        .prepare(
          `SELECT COUNT(*) as total,
                  SUM(CASE WHEN status IN ('success','error') THEN 1 ELSE 0 END) as completed
             FROM execution_items WHERE run_id = ?`
        )
        .get(runId) as { total: number; completed: number }
      return counts.total > 0 && counts.completed === counts.total
    } catch {
      return false
    }
  }
}
