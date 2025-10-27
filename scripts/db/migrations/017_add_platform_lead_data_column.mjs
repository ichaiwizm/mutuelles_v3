#!/usr/bin/env node
export default {
  version: '017',
  name: 'add_platform_lead_data_column',
  description: 'Add platform_lead_data JSON column to lead_flow_assignments to store platform-specific lead payloads',

  up(db) {
    db.exec(`
      ALTER TABLE lead_flow_assignments
      ADD COLUMN platform_lead_data TEXT DEFAULT NULL;

      ALTER TABLE lead_flow_assignments
      ADD COLUMN clean_lead_version INTEGER DEFAULT NULL;

      CREATE INDEX IF NOT EXISTS idx_assignments_lead_platform
        ON lead_flow_assignments(clean_lead_id, platform_id);
    `)

    console.log('  ✓ Colonne platform_lead_data ajoutée à lead_flow_assignments')
    console.log('  ✓ Colonne clean_lead_version ajoutée pour tracking de version')
    console.log('  ✓ Index créé pour requêtes lead+platform')
  },

  down(db) {
    db.exec(`
      DROP INDEX IF EXISTS idx_assignments_lead_platform;

      CREATE TABLE lead_flow_assignments_backup (
        id TEXT PRIMARY KEY,
        clean_lead_id TEXT NOT NULL REFERENCES clean_leads(id) ON DELETE CASCADE,
        flow_id INTEGER NOT NULL REFERENCES flows_catalog(id) ON DELETE CASCADE,
        platform_id INTEGER NOT NULL REFERENCES platforms_catalog(id) ON DELETE CASCADE,
        platform_lead_id TEXT DEFAULT NULL REFERENCES platform_leads(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
        priority INTEGER DEFAULT 0,
        assigned_at TEXT DEFAULT (datetime('now')),
        started_at TEXT DEFAULT NULL,
        completed_at TEXT DEFAULT NULL,
        error_message TEXT DEFAULT NULL,
        UNIQUE(clean_lead_id, flow_id, platform_id)
      );

      INSERT INTO lead_flow_assignments_backup (
        id, clean_lead_id, flow_id, platform_id, platform_lead_id,
        status, priority, assigned_at, started_at, completed_at, error_message
      )
      SELECT
        id, clean_lead_id, flow_id, platform_id, platform_lead_id,
        status, priority, assigned_at, started_at, completed_at, error_message
      FROM lead_flow_assignments;

      DROP TABLE lead_flow_assignments;

      ALTER TABLE lead_flow_assignments_backup RENAME TO lead_flow_assignments;

      CREATE INDEX IF NOT EXISTS idx_assignments_status
        ON lead_flow_assignments(status);
      CREATE INDEX IF NOT EXISTS idx_assignments_lead
        ON lead_flow_assignments(clean_lead_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_platform
        ON lead_flow_assignments(platform_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_flow
        ON lead_flow_assignments(flow_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_priority
        ON lead_flow_assignments(status, priority DESC, assigned_at);
    `)

    console.log('  ✓ Migration 017 annulée - colonnes platform_lead_data et clean_lead_version supprimées')
  }
}
