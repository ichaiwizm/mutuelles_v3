/**
 * Migration 022: Add cancelled_items counter to execution_runs
 *
 * Adds a counter for cancelled items to execution_runs table
 * to track user-stopped executions separately from errors.
 */

export default {
  version: '022',
  name: 'add_cancelled_items_counter',
  description: 'Add cancelled_items counter to execution_runs',

  up(db) {
    console.log('[Migration 022] Adding cancelled_items counter...')

    // Add cancelled_items column
    db.exec(`
      ALTER TABLE execution_runs
      ADD COLUMN cancelled_items INTEGER NOT NULL DEFAULT 0;
    `)

    console.log('[Migration 022] ✓ Added cancelled_items counter to execution_runs')
  },

  down(db) {
    console.log('[Migration 022] Removing cancelled_items counter...')

    // SQLite doesn't support DROP COLUMN directly, need to recreate table
    db.exec(`
      CREATE TABLE execution_runs_new (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed', 'stopped')),
        mode TEXT NOT NULL,
        concurrency INTEGER,
        total_items INTEGER NOT NULL DEFAULT 0,
        success_items INTEGER NOT NULL DEFAULT 0,
        error_items INTEGER NOT NULL DEFAULT 0,
        pending_items INTEGER NOT NULL DEFAULT 0,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        duration_ms INTEGER,
        settings_snapshot TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `)

    db.exec(`
      INSERT INTO execution_runs_new
      SELECT
        id, status, mode, concurrency, total_items,
        success_items, error_items, pending_items,
        started_at, completed_at, duration_ms, settings_snapshot,
        created_at, updated_at
      FROM execution_runs;
    `)

    db.exec(`DROP TABLE execution_runs;`)
    db.exec(`ALTER TABLE execution_runs_new RENAME TO execution_runs;`)

    // Recreate indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_runs_status ON execution_runs(status);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_runs_started_at ON execution_runs(started_at DESC);`)

    console.log('[Migration 022] ✓ Removed cancelled_items counter (rollback)')
  }
}
