/**
 * Migration 021: Add 'cancelled' status to execution_items
 *
 * Adds 'cancelled' as a valid status for execution items to distinguish
 * user-initiated stops from actual errors. This prevents cancelled items
 * from triggering failure notifications.
 */

export default {
  version: '021',
  name: 'add_cancelled_status',
  description: 'Add cancelled status to execution_items table',

  up(db) {
    // We need to recreate the table with the new constraint

    console.log('[Migration 021] Adding cancelled status to execution_items...')

    // Step 1: Create new table with updated constraint
    db.exec(`
      CREATE TABLE execution_items_new (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        lead_id TEXT,
        lead_name TEXT,
        platform TEXT NOT NULL,
        platform_name TEXT,
        flow_slug TEXT,
        flow_name TEXT,
        status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'success', 'error', 'cancelled')),
        error_message TEXT,
        current_step INTEGER,
        total_steps INTEGER,
        run_dir TEXT,
        started_at TEXT,
        completed_at TEXT,
        duration_ms INTEGER,
        attempt_number INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (run_id) REFERENCES execution_runs(id) ON DELETE CASCADE
      );
    `)

    // Step 2: Copy data from old table to new table
    db.exec(`
      INSERT INTO execution_items_new
      SELECT * FROM execution_items;
    `)

    // Step 3: Drop old table
    db.exec(`DROP TABLE execution_items;`)

    // Step 4: Rename new table to original name
    db.exec(`ALTER TABLE execution_items_new RENAME TO execution_items;`)

    // Step 5: Recreate indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_items_run_id ON execution_items(run_id);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_items_status ON execution_items(status);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_items_lead_id ON execution_items(lead_id);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_items_platform ON execution_items(platform);`)

    console.log('[Migration 021] ✓ Added cancelled status to execution_items')
  },

  down(db) {
    console.log('[Migration 021] Rolling back cancelled status...')

    // Recreate table without 'cancelled' status
    db.exec(`
      CREATE TABLE execution_items_new (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        lead_id TEXT,
        lead_name TEXT,
        platform TEXT NOT NULL,
        platform_name TEXT,
        flow_slug TEXT,
        flow_name TEXT,
        status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'success', 'error')),
        error_message TEXT,
        current_step INTEGER,
        total_steps INTEGER,
        run_dir TEXT,
        started_at TEXT,
        completed_at TEXT,
        duration_ms INTEGER,
        attempt_number INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (run_id) REFERENCES execution_runs(id) ON DELETE CASCADE
      );
    `)

    // Convert any 'cancelled' status to 'error' before copying
    db.exec(`
      INSERT INTO execution_items_new
      SELECT
        id, run_id, lead_id, lead_name, platform, platform_name,
        flow_slug, flow_name,
        CASE WHEN status = 'cancelled' THEN 'error' ELSE status END as status,
        error_message, current_step, total_steps, run_dir,
        started_at, completed_at, duration_ms, attempt_number,
        created_at, updated_at
      FROM execution_items;
    `)

    db.exec(`DROP TABLE execution_items;`)
    db.exec(`ALTER TABLE execution_items_new RENAME TO execution_items;`)

    // Recreate indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_items_run_id ON execution_items(run_id);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_items_status ON execution_items(status);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_items_lead_id ON execution_items(lead_id);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_items_platform ON execution_items(platform);`)

    console.log('[Migration 021] ✓ Rolled back cancelled status (rollback)')
  }
}
