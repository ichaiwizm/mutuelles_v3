#!/usr/bin/env node
export default {
  version: '016',
  name: 'cleanup_unused_and_legacy_tables',
  description: 'Remove unused platform_leads table and complete migration 008 cleanup of legacy platform_pages/platform_fields tables',

  up(db) {
    db.exec(`
      -- Remove completely unused platform_leads table
      -- This table was created but never used, replaced by clean_leads.platform_data JSON
      DROP INDEX IF EXISTS idx_platform_leads_version;
      DROP INDEX IF EXISTS idx_platform_leads_status;
      DROP INDEX IF EXISTS idx_platform_leads_platform_id;
      DROP INDEX IF EXISTS idx_platform_leads_clean_lead_id;
      DROP TABLE IF EXISTS platform_leads;

      -- Complete migration 008: Remove legacy relational structure
      -- These tables were replaced by JSON architecture in platforms_catalog
      -- (field_definitions_json, ui_form_json columns)
      DROP INDEX IF EXISTS idx_platform_fields_page_id;
      DROP TABLE IF EXISTS platform_fields;

      DROP INDEX IF EXISTS idx_platform_pages_platform_id;
      DROP TABLE IF EXISTS platform_pages;
    `)

    console.log('  ✓ Removed platform_leads table and indexes (never used)')
    console.log('  ✓ Completed migration 008 cleanup: removed platform_fields (replaced by JSON)')
    console.log('  ✓ Completed migration 008 cleanup: removed platform_pages (replaced by JSON)')
    console.log('  ℹ Note: lead_flow_assignments and flow_selection_rules are future features (not yet implemented)')
  },

  down(db) {
    // Recreate tables for rollback
    db.exec(`
      -- Recreate platform_pages
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

      -- Recreate platform_fields
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

      -- Recreate platform_leads (with versioning columns from migration 013)
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

      -- Recreate indexes
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
