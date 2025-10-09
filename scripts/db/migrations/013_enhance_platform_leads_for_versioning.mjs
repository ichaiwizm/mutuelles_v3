#!/usr/bin/env node
export default {
  version: '013',
  name: 'enhance_platform_leads_for_versioning',
  description: 'Add version tracking and result data to platform_leads table',

  up(db) {
    db.exec(`
      -- Add reference to the clean_lead version used for this platform submission
      ALTER TABLE platform_leads
      ADD COLUMN clean_lead_version INTEGER DEFAULT NULL;

      -- Add column to store captured results from flow execution (quotes, errors, etc.)
      ALTER TABLE platform_leads
      ADD COLUMN result_data TEXT DEFAULT NULL;

      -- Create composite index for querying platform leads by lead and version
      CREATE INDEX IF NOT EXISTS idx_platform_leads_version
        ON platform_leads(clean_lead_id, clean_lead_version);

      -- Create index for querying by status
      CREATE INDEX IF NOT EXISTS idx_platform_leads_status
        ON platform_leads(status);
    `)

    console.log('  ✓ Colonne clean_lead_version ajoutée à platform_leads')
    console.log('  ✓ Colonne result_data ajoutée à platform_leads')
    console.log('  ✓ Index composite créé pour clean_lead_id + version')
    console.log('  ✓ Index créé sur status')
  },

  down(db) {
    // SQLite doesn't support DROP COLUMN directly, need to recreate table
    db.exec(`
      -- Drop indexes first
      DROP INDEX IF EXISTS idx_platform_leads_version;
      DROP INDEX IF EXISTS idx_platform_leads_status;

      -- Create backup table without new columns
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

      -- Copy data (excluding new columns)
      INSERT INTO platform_leads_backup (
        id, clean_lead_id, platform_id, adapted_data,
        status, adapted_at, processed_at, error_message
      )
      SELECT
        id, clean_lead_id, platform_id, adapted_data,
        status, adapted_at, processed_at, error_message
      FROM platform_leads;

      -- Drop original table
      DROP TABLE platform_leads;

      -- Rename backup to original
      ALTER TABLE platform_leads_backup RENAME TO platform_leads;

      -- Recreate original indexes
      CREATE INDEX IF NOT EXISTS idx_platform_leads_clean_lead_id
        ON platform_leads(clean_lead_id);
      CREATE INDEX IF NOT EXISTS idx_platform_leads_platform_id
        ON platform_leads(platform_id);
    `)

    console.log('  ✓ Migration 013 annulée - colonnes clean_lead_version et result_data supprimées')
  }
}
