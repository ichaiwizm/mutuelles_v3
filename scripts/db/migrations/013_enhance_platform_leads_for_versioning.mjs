#!/usr/bin/env node
export default {
  version: '013',
  name: 'enhance_platform_leads_for_versioning',
  description: 'Add version tracking and result data to platform_leads table',

  up(db) {
    db.exec(`
      ALTER TABLE platform_leads
      ADD COLUMN clean_lead_version INTEGER DEFAULT NULL;

      ALTER TABLE platform_leads
      ADD COLUMN result_data TEXT DEFAULT NULL;

      CREATE INDEX IF NOT EXISTS idx_platform_leads_version
        ON platform_leads(clean_lead_id, clean_lead_version);

      CREATE INDEX IF NOT EXISTS idx_platform_leads_status
        ON platform_leads(status);
    `)

    console.log('  ✓ Colonne clean_lead_version ajoutée à platform_leads')
    console.log('  ✓ Colonne result_data ajoutée à platform_leads')
    console.log('  ✓ Index composite créé pour clean_lead_id + version')
    console.log('  ✓ Index créé sur status')
  },

  down(db) {
    db.exec(`
      DROP INDEX IF EXISTS idx_platform_leads_version;
      DROP INDEX IF EXISTS idx_platform_leads_status;

      CREATE TABLE platform_leads_backup (
        id TEXT PRIMARY KEY,
        clean_lead_id TEXT NOT NULL REFERENCES clean_leads(id) ON DELETE CASCADE,
        platform_id INTEGER NOT NULL REFERENCES platforms_catalog(id) ON DELETE CASCADE,
        adapted_data TEXT NOT NULL DEFAULT '{}',
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
        adapted_at TEXT DEFAULT (datetime('now')),
        processed_at TEXT DEFAULT NULL,
        error_message TEXT DEFAULT NULL
      );

      INSERT INTO platform_leads_backup (
        id, clean_lead_id, platform_id, adapted_data,
        status, adapted_at, processed_at, error_message
      )
      SELECT
        id, clean_lead_id, platform_id, adapted_data,
        status, adapted_at, processed_at, error_message
      FROM platform_leads;

      DROP TABLE platform_leads;

      ALTER TABLE platform_leads_backup RENAME TO platform_leads;

      CREATE INDEX IF NOT EXISTS idx_platform_leads_clean_lead_id
        ON platform_leads(clean_lead_id);
      CREATE INDEX IF NOT EXISTS idx_platform_leads_platform_id
        ON platform_leads(platform_id);
    `)

    console.log('  ✓ Migration 013 annulée - colonnes clean_lead_version et result_data supprimées')
  }
}
