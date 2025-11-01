#!/usr/bin/env node
export default {
  version: '016',
  name: 'cleanup_unused_and_legacy_tables',
  description: 'Remove unused platform_leads table and complete migration 008 cleanup of legacy platform_pages/platform_fields tables',

  up(db) {
    // Disable foreign key constraints temporarily
    db.exec('PRAGMA foreign_keys = OFF;')

    db.exec(`
      DROP INDEX IF EXISTS idx_platform_leads_version;
      DROP INDEX IF EXISTS idx_platform_leads_status;
      DROP INDEX IF EXISTS idx_platform_leads_platform_id;
      DROP INDEX IF EXISTS idx_platform_leads_clean_lead_id;
      DROP TABLE IF EXISTS platform_leads;

      DROP INDEX IF EXISTS idx_platform_fields_page_id;
      DROP TABLE IF EXISTS platform_fields;

      DROP INDEX IF EXISTS idx_platform_pages_platform_id;
      DROP TABLE IF EXISTS platform_pages;
    `)

    // Recreate lead_flow_assignments WITHOUT the platform_leads foreign key
    const hasLeadFlowAssignments = db.prepare(`
      SELECT COUNT(*) as count FROM sqlite_master
      WHERE type='table' AND name='lead_flow_assignments'
    `).get()

    if (hasLeadFlowAssignments.count > 0) {
      // Get existing data (only columns that exist from migration 014)
      const existingAssignments = db.prepare(`
        SELECT id, clean_lead_id, flow_id, platform_id, status, priority,
               assigned_at, started_at, completed_at, error_message
        FROM lead_flow_assignments
      `).all()

      // Drop old table
      db.exec(`
        DROP TABLE IF EXISTS lead_flow_assignments;
      `)

      // Recreate without platform_lead_id reference (columns from migration 014 only)
      db.exec(`
        CREATE TABLE lead_flow_assignments (
          id TEXT PRIMARY KEY,
          clean_lead_id TEXT NOT NULL REFERENCES clean_leads(id) ON DELETE CASCADE,
          flow_id INTEGER NOT NULL REFERENCES flows_catalog(id) ON DELETE CASCADE,
          platform_id INTEGER NOT NULL REFERENCES platforms_catalog(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
          priority INTEGER DEFAULT 0,
          assigned_at TEXT DEFAULT (datetime('now')),
          started_at TEXT DEFAULT NULL,
          completed_at TEXT DEFAULT NULL,
          error_message TEXT DEFAULT NULL,
          UNIQUE(clean_lead_id, flow_id, platform_id)
        );

        CREATE INDEX IF NOT EXISTS idx_assignments_status ON lead_flow_assignments(status);
        CREATE INDEX IF NOT EXISTS idx_assignments_lead ON lead_flow_assignments(clean_lead_id);
        CREATE INDEX IF NOT EXISTS idx_assignments_platform ON lead_flow_assignments(platform_id);
        CREATE INDEX IF NOT EXISTS idx_assignments_flow ON lead_flow_assignments(flow_id);
        CREATE INDEX IF NOT EXISTS idx_assignments_priority ON lead_flow_assignments(status, priority DESC, assigned_at);
      `)

      // Restore data (platform_lead_data and clean_lead_version will be NULL until migration 017)
      if (existingAssignments.length > 0) {
        const insert = db.prepare(`
          INSERT INTO lead_flow_assignments (
            id, clean_lead_id, flow_id, platform_id, status, priority,
            assigned_at, started_at, completed_at, error_message
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        for (const row of existingAssignments) {
          insert.run(
            row.id, row.clean_lead_id, row.flow_id, row.platform_id,
            row.status, row.priority, row.assigned_at, row.started_at,
            row.completed_at, row.error_message
          )
        }

        console.log(`  ✓ Migrated ${existingAssignments.length} lead_flow_assignments without platform_leads reference`)
      }
    } else {
      // Create table fresh if it did not exist yet
      db.exec(`
        CREATE TABLE IF NOT EXISTS lead_flow_assignments (
          id TEXT PRIMARY KEY,
          clean_lead_id TEXT NOT NULL REFERENCES clean_leads(id) ON DELETE CASCADE,
          flow_id INTEGER NOT NULL REFERENCES flows_catalog(id) ON DELETE CASCADE,
          platform_id INTEGER NOT NULL REFERENCES platforms_catalog(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
          priority INTEGER DEFAULT 0,
          assigned_at TEXT DEFAULT (datetime('now')),
          started_at TEXT DEFAULT NULL,
          completed_at TEXT DEFAULT NULL,
          error_message TEXT DEFAULT NULL,
          UNIQUE(clean_lead_id, flow_id, platform_id)
        );

        CREATE INDEX IF NOT EXISTS idx_assignments_status ON lead_flow_assignments(status);
        CREATE INDEX IF NOT EXISTS idx_assignments_lead ON lead_flow_assignments(clean_lead_id);
        CREATE INDEX IF NOT EXISTS idx_assignments_platform ON lead_flow_assignments(platform_id);
        CREATE INDEX IF NOT EXISTS idx_assignments_flow ON lead_flow_assignments(flow_id);
        CREATE INDEX IF NOT EXISTS idx_assignments_priority ON lead_flow_assignments(status, priority DESC, assigned_at);
      `)

      console.log('  ✓ Created lead_flow_assignments without platform_leads reference')
    }

    // Re-enable foreign key constraints
    db.exec('PRAGMA foreign_keys = ON;')

    console.log('  ✓ Removed platform_leads table and indexes (never used)')
    console.log('  ✓ Completed migration 008 cleanup: removed platform_fields (replaced by JSON)')
    console.log('  ✓ Completed migration 008 cleanup: removed platform_pages (replaced by JSON)')
    console.log('  ℹ Note: lead_flow_assignments recreated without platform_leads reference')
  },

  down(db) {
    // Recreate tables for rollback
    db.exec(`
      CREATE TABLE IF NOT EXISTS platform_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform_id INTEGER NOT NULL REFERENCES platforms_catalog(id) ON DELETE CASCADE,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        url TEXT,
        status TEXT NOT NULL DEFAULT 'ready',
        order_index INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        UNIQUE(platform_id, slug)
      );

      CREATE TABLE IF NOT EXISTS platform_fields (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_id INTEGER NOT NULL REFERENCES platform_pages(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        label TEXT NOT NULL,
        type TEXT NOT NULL,
        required INTEGER NOT NULL DEFAULT 0,
        secure INTEGER NOT NULL DEFAULT 0,
        order_index INTEGER NOT NULL DEFAULT 0,
        UNIQUE(page_id, key)
      );

      CREATE TABLE IF NOT EXISTS platform_leads (
        id TEXT PRIMARY KEY,
        clean_lead_id TEXT NOT NULL REFERENCES clean_leads(id) ON DELETE CASCADE,
        platform_id INTEGER NOT NULL REFERENCES platforms_catalog(id) ON DELETE CASCADE,
        adapted_data TEXT NOT NULL DEFAULT '{}',
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
        adapted_at TEXT DEFAULT (datetime('now')),
        processed_at TEXT DEFAULT NULL,
        error_message TEXT DEFAULT NULL,
        clean_lead_version INTEGER DEFAULT NULL,
        result_data TEXT DEFAULT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_platform_pages_platform_id
        ON platform_pages(platform_id);

      CREATE INDEX IF NOT EXISTS idx_platform_fields_page_id
        ON platform_fields(page_id);

      CREATE INDEX IF NOT EXISTS idx_platform_leads_clean_lead_id
        ON platform_leads(clean_lead_id);

      CREATE INDEX IF NOT EXISTS idx_platform_leads_platform_id
        ON platform_leads(platform_id);

      CREATE INDEX IF NOT EXISTS idx_platform_leads_status
        ON platform_leads(status);

      CREATE INDEX IF NOT EXISTS idx_platform_leads_version
        ON platform_leads(clean_lead_id, clean_lead_version);
    `)

    console.log('  ✓ Migration 016 rolled back - tables recreated')
    console.log('  ⚠️ Warning: Code references to these tables were removed, rollback may cause errors')
  }
}
