/**
 * Migration 019: Drop legacy automation tables
 *
 * Removes database tables that were used by the old automation system:
 * - flows_catalog: Flow definitions (replaced by JSON files in data/flows/)
 * - flow_steps: Step-by-step automation actions (replaced by JSON flow definitions)
 * - flows_runs: Execution history (superseded by scenarios system)
 * - lead_flow_assignments: Lead-to-flow assignments (never used in UI)
 * - flow_selection_rules: Conditional flow selection (never implemented in UI)
 */

export default {
  version: '019',
  name: 'drop_legacy_automation_tables',
  description: 'Drop legacy automation tables (flows_catalog, flow_steps, flows_runs, lead_flow_assignments, flow_selection_rules)',

  up(db) {
    // Drop tables in correct order (respecting foreign key constraints)

    // 1. Drop dependent tables first
    db.exec(`DROP TABLE IF EXISTS flow_selection_rules;`)
    db.exec(`DROP TABLE IF EXISTS lead_flow_assignments;`)
    db.exec(`DROP TABLE IF EXISTS flows_runs;`)
    db.exec(`DROP TABLE IF EXISTS flow_steps;`)

    // 2. Drop main table last
    db.exec(`DROP TABLE IF EXISTS flows_catalog;`)

    console.log('[Migration 019] ✓ Dropped legacy automation tables')
  },

  down(db) {
    // Recreate tables in reverse order (for rollback support)

    // 1. Create main table first
    db.exec(`
      CREATE TABLE IF NOT EXISTS flows_catalog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform_id INTEGER NOT NULL REFERENCES platforms_catalog(id) ON DELETE CASCADE,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        flow_json TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // 2. Create dependent tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS flow_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        flow_id INTEGER NOT NULL REFERENCES flows_catalog(id) ON DELETE CASCADE,
        order_index INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('goto', 'fill', 'click', 'waitFor', 'assertText', 'screenshot', 'tryClick', 'sleep')),
        selector TEXT,
        value TEXT,
        timeout_ms INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS flows_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        flow_id INTEGER NOT NULL REFERENCES flows_catalog(id) ON DELETE CASCADE,
        run_uid TEXT NOT NULL UNIQUE,
        flow_slug TEXT NOT NULL,
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        finished_at TEXT,
        status TEXT NOT NULL CHECK(status IN ('running', 'success', 'error')) DEFAULT 'running',
        screenshots_dir TEXT,
        json_path TEXT,
        steps_total INTEGER,
        ok_steps INTEGER,
        error_message TEXT
      );
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS lead_flow_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clean_lead_id TEXT NOT NULL,
        flow_id INTEGER NOT NULL REFERENCES flows_catalog(id) ON DELETE CASCADE,
        platform_id INTEGER NOT NULL REFERENCES platforms_catalog(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(clean_lead_id, flow_id)
      );
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS flow_selection_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform_id INTEGER NOT NULL REFERENCES platforms_catalog(id) ON DELETE CASCADE,
        flow_id INTEGER NOT NULL REFERENCES flows_catalog(id) ON DELETE CASCADE,
        condition_json TEXT NOT NULL,
        priority INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)

    // 3. Recreate indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_flows_platform ON flows_catalog(platform_id);`)
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_flow_steps_order ON flow_steps(flow_id, order_index);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_flows_runs_flow ON flows_runs(flow_id, started_at DESC);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_lead_flow_assignments_lead ON lead_flow_assignments(clean_lead_id);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_lead_flow_assignments_flow ON lead_flow_assignments(flow_id);`)

    console.log('[Migration 019] ✓ Recreated legacy automation tables (rollback)')
  }
}
