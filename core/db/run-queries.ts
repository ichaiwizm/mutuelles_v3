/**
 * Run Queries
 */

import type { Database } from 'better-sqlite3';

export function createRun(
  db: Database,
  run: { id: string; status: string; meta?: any }
): void {
  const stmt = db.prepare(`
    INSERT INTO runs (id, status, started_at, meta)
    VALUES (?, ?, datetime('now'), ?)
  `);

  stmt.run(run.id, run.status, run.meta ? JSON.stringify(run.meta) : null);
}

export function getRunById(db: Database, id: string): any | null {
  const stmt = db.prepare(`SELECT * FROM runs WHERE id = ?`);
  const row = stmt.get(id) as any;

  if (!row) return null;

  return {
    id: row.id,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    meta: row.meta ? JSON.parse(row.meta) : undefined,
  };
}

export function updateRunStatus(
  db: Database,
  id: string,
  status: string,
  finishedAt?: string
): void {
  const stmt = db.prepare(`
    UPDATE runs SET status = ?, finished_at = ? WHERE id = ?
  `);

  stmt.run(status, finishedAt || null, id);
}
