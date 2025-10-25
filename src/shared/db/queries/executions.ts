/**
 * Execution tracking database queries
 * Used by: Electron main process for automation execution state management
 */

import type Database from 'better-sqlite3'

// ==================== TYPES ====================

export interface ExecutionRun {
  id: string
  status: 'running' | 'completed' | 'failed' | 'stopped'
  mode: string
  concurrency: number | null
  total_items: number
  success_items: number
  error_items: number
  pending_items: number
  cancelled_items: number
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  settings_snapshot: string | null
  created_at: string
  updated_at: string
}

export interface ExecutionItem {
  id: string
  run_id: string
  lead_id: string | null
  lead_name: string | null
  platform: string
  platform_name: string | null
  flow_slug: string | null
  flow_name: string | null
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled'
  error_message: string | null
  current_step: number | null
  total_steps: number | null
  run_dir: string | null
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
  attempt_number: number
  created_at: string
  updated_at: string
}

export interface ExecutionStep {
  id: number
  item_id: string
  step_index: number
  step_type: string | null
  step_label: string | null
  status: 'success' | 'error' | 'skipped'
  error_message: string | null
  duration_ms: number | null
  screenshot_path: string | null
  executed_at: string
}

export interface ExecutionAttempt {
  id: number
  item_id: string
  attempt_number: number
  status: 'success' | 'error' | 'cancelled'
  error_message: string | null
  started_at: string
  completed_at: string | null
  duration_ms: number | null
}

export interface HistoryFilters {
  status?: string
  platform?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

// ==================== EXECUTION RUNS ====================

/**
 * Create a new execution run
 */
export function createRun(
  db: Database.Database,
  data: {
    id: string
    status: string
    mode: string
    concurrency?: number
    total_items: number
    started_at: string
    settings_snapshot?: string
  }
): void {
  db.prepare(
    `
    INSERT INTO execution_runs (
      id, status, mode, concurrency, total_items, started_at, settings_snapshot
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    data.id,
    data.status,
    data.mode,
    data.concurrency || null,
    data.total_items,
    data.started_at,
    data.settings_snapshot || null
  )
}

/**
 * Update an execution run
 */
export function updateRun(
  db: Database.Database,
  runId: string,
  updates: Partial<Omit<ExecutionRun, 'id' | 'created_at'>>
): void {
  const fields: string[] = []
  const values: any[] = []

  // Build dynamic UPDATE query
  Object.entries(updates).forEach(([key, value]) => {
    fields.push(`${key} = ?`)
    values.push(value)
  })

  if (fields.length === 0) return

  // Always update updated_at
  fields.push('updated_at = CURRENT_TIMESTAMP')
  values.push(runId)

  const query = `UPDATE execution_runs SET ${fields.join(', ')} WHERE id = ?`
  db.prepare(query).run(...values)
}

/**
 * Get an execution run by ID
 */
export function getRunById(db: Database.Database, runId: string): ExecutionRun | null {
  const row = db
    .prepare(
      `
    SELECT * FROM execution_runs
    WHERE id = ?
  `
    )
    .get(runId) as any

  return row || null
}

/**
 * Get active (running) execution run
 */
export function getActiveRun(db: Database.Database, runId: string): ExecutionRun | null {
  return getRunById(db, runId)
}

/**
 * Increment run counters (success, error, pending)
 */
export function incrementRunCounter(
  db: Database.Database,
  runId: string,
  counter: 'success_items' | 'error_items' | 'pending_items' | 'cancelled_items',
  amount: number = 1
): void {
  const query = `UPDATE execution_runs SET ${counter} = ${counter} + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  db.prepare(query).run(amount, runId)
}

/**
 * Decrement run counters (usually for pending_items)
 */
// ==================== EXECUTION ITEMS ====================

/**
 * Create a new execution item
 */
export function createItem(
  db: Database.Database,
  data: {
    id: string
    run_id: string
    lead_id?: string
    lead_name?: string
    platform: string
    platform_name?: string
    flow_slug?: string
    flow_name?: string
    status: string
    run_dir?: string
    attempt_number?: number
  }
): void {
  db.prepare(
    `
    INSERT INTO execution_items (
      id, run_id, lead_id, lead_name, platform, platform_name,
      flow_slug, flow_name, status, run_dir, attempt_number
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    data.id,
    data.run_id,
    data.lead_id || null,
    data.lead_name || null,
    data.platform,
    data.platform_name || null,
    data.flow_slug || null,
    data.flow_name || null,
    data.status,
    data.run_dir || null,
    data.attempt_number || 1
  )
}

/**
 * Update an execution item
 */
export function updateItem(
  db: Database.Database,
  itemId: string,
  updates: Partial<Omit<ExecutionItem, 'id' | 'run_id' | 'created_at'>>
): void {
  const fields: string[] = []
  const values: any[] = []

  Object.entries(updates).forEach(([key, value]) => {
    fields.push(`${key} = ?`)
    values.push(value)
  })

  if (fields.length === 0) return

  fields.push('updated_at = CURRENT_TIMESTAMP')
  values.push(itemId)

  const query = `UPDATE execution_items SET ${fields.join(', ')} WHERE id = ?`
  db.prepare(query).run(...values)
}

/**
 * Get all execution items for a run
 */
export function getRunItems(db: Database.Database, runId: string): ExecutionItem[] {
  const rows = db
    .prepare(
      `
    SELECT * FROM execution_items
    WHERE run_id = ?
    ORDER BY created_at ASC
  `
    )
    .all(runId) as any[]

  return rows
}

/**
 * Get a single execution item by ID
 */
export function getItemById(db: Database.Database, itemId: string): any {
  const row = db.prepare('SELECT * FROM execution_items WHERE id = ?').get(itemId)
  return row
}

// ==================== EXECUTION STEPS ====================

/**
 * Create a new execution step
 */
export function createStep(
  db: Database.Database,
  data: {
    item_id: string
    step_index: number
    step_type?: string
    step_label?: string
    status: string
    error_message?: string
    duration_ms?: number
    screenshot_path?: string
  }
): void {
  db.prepare(
    `
    INSERT INTO execution_steps (
      item_id, step_index, step_type, step_label, status,
      error_message, duration_ms, screenshot_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    data.item_id,
    data.step_index,
    data.step_type || null,
    data.step_label || null,
    data.status,
    data.error_message || null,
    data.duration_ms || null,
    data.screenshot_path || null
  )
}

/**
 * Get all steps for an execution item
 */
export function getItemSteps(db: Database.Database, itemId: string): ExecutionStep[] {
  const rows = db
    .prepare(
      `
    SELECT * FROM execution_steps
    WHERE item_id = ?
    ORDER BY step_index ASC
  `
    )
    .all(itemId) as any[]

  return rows
}

/**
 * Update an execution step
 */
export function updateStep(
  db: Database.Database,
  itemId: string,
  stepIndex: number,
  updates: Partial<{
    status: string
    error_message: string | null
    duration_ms: number | null
    screenshot_path: string | null
  }>
): void {
  const fields = Object.keys(updates)
    .map((k) => `${k} = ?`)
    .join(', ')

  if (fields.length === 0) return

  const values = Object.values(updates)
  const stmt = db.prepare(
    `UPDATE execution_steps SET ${fields} WHERE item_id = ? AND step_index = ?`
  )
  stmt.run(...values, itemId, stepIndex)
}

// ==================== EXECUTION ATTEMPTS ====================

/**
 * Create a new execution attempt (for retry tracking)
 */
export function createAttempt(
  db: Database.Database,
  data: {
    item_id: string
    attempt_number: number
    status: string
    error_message?: string
    started_at: string
    completed_at?: string
    duration_ms?: number
  }
): void {
  db.prepare(
    `
    INSERT INTO execution_attempts (
      item_id, attempt_number, status, error_message,
      started_at, completed_at, duration_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    data.item_id,
    data.attempt_number,
    data.status,
    data.error_message || null,
    data.started_at,
    data.completed_at || null,
    data.duration_ms || null
  )
}

/**
 * Get all attempts for an execution item
 */
export function getItemAttempts(db: Database.Database, itemId: string): ExecutionAttempt[] {
  const rows = db
    .prepare(
      `
    SELECT * FROM execution_attempts
    WHERE item_id = ?
    ORDER BY attempt_number ASC
  `
    )
    .all(itemId) as any[]

  return rows
}

/**
 * Update an execution attempt
 */
export function updateAttempt(
  db: Database.Database,
  itemId: string,
  attemptNumber: number,
  updates: Partial<{
    status: string
    error_message: string | null
    completed_at: string
    duration_ms: number
  }>
): void {
  const fields = Object.keys(updates)
    .map((k) => `${k} = ?`)
    .join(', ')

  if (fields.length === 0) return

  const values = Object.values(updates)
  const stmt = db.prepare(
    `UPDATE execution_attempts SET ${fields} WHERE item_id = ? AND attempt_number = ?`
  )
  stmt.run(...values, itemId, attemptNumber)
}

// ==================== HISTORY ====================

/**
 * Get execution history with optional filtering and pagination
 */
export function getRunHistory(db: Database.Database, filters?: HistoryFilters): ExecutionRun[] {
  const { status, platform, dateFrom, dateTo, limit = 500, offset = 0 } = filters || {}

  let query = 'SELECT * FROM execution_runs WHERE 1=1'
  const params: any[] = []

  // By default, only show completed/failed/stopped runs (exclude 'running')
  // Unless user explicitly filters for 'running' status
  if (status) {
    query += ' AND status = ?'
    params.push(status)
  } else {
    query += ' AND status IN (?, ?, ?)'
    params.push('completed', 'failed', 'stopped')
  }

  if (dateFrom) {
    query += ' AND started_at >= ?'
    params.push(dateFrom)
  }

  if (dateTo) {
    query += ' AND started_at <= ?'
    params.push(dateTo)
  }

  // Filter by platform (requires join with items)
  if (platform) {
    const statusCondition = status
      ? 'AND r.status = ?'
      : 'AND r.status IN (?, ?, ?)'

    query = `
      SELECT DISTINCT r.* FROM execution_runs r
      INNER JOIN execution_items i ON i.run_id = r.id
      WHERE i.platform = ? ${statusCondition}
    `

    if (status) {
      params.unshift(platform, status)
    } else {
      params.unshift(platform, 'completed', 'failed', 'stopped')
    }
  }

  query += ' ORDER BY started_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const rows = db.prepare(query).all(...params) as any[]
  return rows
}

// ==================== CANCELLATION ====================

/**
 * Cancel all pending AND running items in a run (set status to 'cancelled')
 * Returns the number of items cancelled
 *
 * Note: Browsers are force-closed by the runner, but this marks items as cancelled in DB.
 */
export function cancelPendingItems(db: Database.Database, runId: string): number {
  const result = db.prepare(`
    UPDATE execution_items
    SET status = 'cancelled',
        completed_at = CURRENT_TIMESTAMP,
        error_message = 'Arrêté par l''utilisateur'
    WHERE run_id = ? AND status IN ('pending', 'running')
  `).run(runId)

  return result.changes || 0
}

// ==================== DELETION ====================

/**
 * Delete an execution run (cascade deletes items, steps, attempts)
 */
export function deleteRun(db: Database.Database, runId: string): void {
  // Foreign key cascade will handle deletion of items, steps, and attempts
  db.prepare('DELETE FROM execution_runs WHERE id = ?').run(runId)
}

