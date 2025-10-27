#!/usr/bin/env node
export default {
  version: '009',
  name: 'add_ui_form_json_to_platforms',
  description: 'Add ui_form_json column to platforms_catalog to store UI form definitions per platform',

  up(db) {
    db.exec(`
      ALTER TABLE platforms_catalog
      ADD COLUMN ui_form_json TEXT DEFAULT NULL;

      CREATE INDEX IF NOT EXISTS idx_platforms_catalog_ui_form
        ON platforms_catalog(ui_form_json);
    `)

    console.log('  ✓ Colonne ui_form_json ajoutée à platforms_catalog')
  },

  down(db) {
    db.exec(`
      CREATE TABLE platforms_catalog_backup (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ready',
        base_url TEXT,
        website_url TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        field_definitions_json TEXT
      );

      INSERT INTO platforms_catalog_backup (
        id, slug, name, status, base_url, website_url, notes,
        created_at, updated_at, field_definitions_json
      )
      SELECT id, slug, name, status, base_url, website_url, notes,
             created_at, updated_at, field_definitions_json
      FROM platforms_catalog;

      DROP TABLE platforms_catalog;
      ALTER TABLE platforms_catalog_backup RENAME TO platforms_catalog;

      DROP INDEX IF EXISTS idx_platforms_catalog_ui_form;
    `)

    console.log('  ✓ Migration 009 annulée - ui_form_json supprimé')
  }
}

