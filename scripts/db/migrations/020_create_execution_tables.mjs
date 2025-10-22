/**
 * Migration 020: Create execution tracking tables
 *
 * Creates database tables for tracking automation execution state:
 * - execution_runs: High-level run metadata and aggregated stats
 * - execution_items: Individual lead+flow execution items
 * - execution_steps: Step-by-step execution results
 * - execution_attempts: Retry attempt tracking
 *
 * This replaces the filesystem-based execution tracking (data/runs/[platform]/[timestamp]/index.json)
 * with a proper database schema for stateless frontend and efficient querying.
 */

export default {
  version: '020',
  name: 'create_execution_tables',
  description: 'Create execution tracking tables for stateless frontend',

  up(db) {
    // 1. execution_runs: Tracks overall run metadata
    db.exec(`
      CREATE TABLE IF NOT EXISTS execution_runs (
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

    // Indexes for execution_runs
    db.exec(`CREATE INDEX IF NOT EXISTS idx_runs_status ON execution_runs(status);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_runs_started_at ON execution_runs(started_at DESC);`)

    // 2. execution_items: Tracks individual lead+flow+platform execution
    db.exec(`
      CREATE TABLE IF NOT EXISTS execution_items (
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

    // Indexes for execution_items
    db.exec(`CREATE INDEX IF NOT EXISTS idx_items_run_id ON execution_items(run_id);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_items_status ON execution_items(status);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_items_lead_id ON execution_items(lead_id);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_items_platform ON execution_items(platform);`)

    // 3. execution_steps: Tracks step-by-step execution results
    db.exec(`
      CREATE TABLE IF NOT EXISTS execution_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id TEXT NOT NULL,
        step_index INTEGER NOT NULL,
        step_type TEXT,
        step_label TEXT,
        status TEXT NOT NULL CHECK(status IN ('success', 'error', 'skipped')),
        error_message TEXT,
        duration_ms INTEGER,
        screenshot_path TEXT,
        executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES execution_items(id) ON DELETE CASCADE
      );
    `)

    // Indexes for execution_steps
    db.exec(`CREATE INDEX IF NOT EXISTS idx_steps_item_id ON execution_steps(item_id);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_steps_index ON execution_steps(item_id, step_index);`)

    // 4. execution_attempts: Tracks retry attempts
    db.exec(`
      CREATE TABLE IF NOT EXISTS execution_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id TEXT NOT NULL,
        attempt_number INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('success', 'error')),
        error_message TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        duration_ms INTEGER,
        FOREIGN KEY (item_id) REFERENCES execution_items(id) ON DELETE CASCADE
      );
    `)

    // Indexes for execution_attempts
    db.exec(`CREATE INDEX IF NOT EXISTS idx_attempts_item_id ON execution_attempts(item_id);`)

    console.log('[Migration 020] ✓ Created execution tracking tables')
  },

  down(db) {
    // Drop tables in reverse order (respecting foreign key constraints)
    db.exec(`DROP TABLE IF EXISTS execution_attempts;`)
    db.exec(`DROP TABLE IF EXISTS execution_steps;`)
    db.exec(`DROP TABLE IF EXISTS execution_items;`)
    db.exec(`DROP TABLE IF EXISTS execution_runs;`)

    console.log('[Migration 020] ✓ Dropped execution tracking tables (rollback)')
  }
}
