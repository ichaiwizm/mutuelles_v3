#!/usr/bin/env node
export default {
  version: '012',
  name: 'add_versioning_to_clean_leads',
  description: 'Add version and updated_at columns to clean_leads table for tracking lead modifications',

  up(db) {
    db.exec(`
      -- Add version tracking column (starts at 1 for all existing leads)
      ALTER TABLE clean_leads
      ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

      -- Add updated_at timestamp column
      ALTER TABLE clean_leads
      ADD COLUMN updated_at TEXT DEFAULT NULL;

      -- Set updated_at to cleaned_at for existing records
      UPDATE clean_leads
      SET updated_at = cleaned_at
      WHERE updated_at IS NULL;
    `)

    console.log('  ✓ Colonne version ajoutée à clean_leads (default: 1)')
    console.log('  ✓ Colonne updated_at ajoutée à clean_leads')
    console.log('  ✓ Données existantes mises à jour')
  },

  down(db) {
    // SQLite doesn't support DROP COLUMN directly, need to recreate table
    db.exec(`
      -- Create backup table without version and updated_at columns
      CREATE TABLE clean_leads_backup (
        id TEXT PRIMARY KEY,
        raw_lead_id TEXT REFERENCES raw_leads(id) ON DELETE CASCADE,
        contact_data TEXT NOT NULL DEFAULT '{}',
        souscripteur_data TEXT NOT NULL DEFAULT '{}',
        conjoint_data TEXT DEFAULT NULL,
        enfants_data TEXT DEFAULT '[]',
        besoins_data TEXT DEFAULT '{}',
        platform_data TEXT DEFAULT NULL,
        cleaned_at TEXT DEFAULT (datetime('now'))
      );

      -- Copy data (excluding version and updated_at)
      INSERT INTO clean_leads_backup (
        id, raw_lead_id, contact_data, souscripteur_data,
        conjoint_data, enfants_data, besoins_data, platform_data,
        cleaned_at
      )
      SELECT
        id, raw_lead_id, contact_data, souscripteur_data,
        conjoint_data, enfants_data, besoins_data, platform_data,
        cleaned_at
      FROM clean_leads;

      -- Drop original table
      DROP TABLE clean_leads;

      -- Rename backup to original
      ALTER TABLE clean_leads_backup RENAME TO clean_leads;

      -- Recreate indexes
      CREATE INDEX IF NOT EXISTS idx_clean_leads_raw_lead_id
        ON clean_leads(raw_lead_id);
    `)

    console.log('  ✓ Migration 012 annulée - colonnes version et updated_at supprimées')
  }
}
