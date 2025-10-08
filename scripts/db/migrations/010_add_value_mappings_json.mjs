#!/usr/bin/env node
export default {
  version: '010',
  name: 'add_value_mappings_json_to_platforms',
  description: 'Add value_mappings_json column to platforms_catalog for domain→platform value translation',

  up(db) {
    db.exec(`
      ALTER TABLE platforms_catalog
      ADD COLUMN value_mappings_json TEXT DEFAULT NULL;
    `)
    console.log('  ✓ Colonne value_mappings_json ajoutée à platforms_catalog')
  },

  down(db) {
    // Recréer la table sans la colonne (SQLite)
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
        field_definitions_json TEXT,
        ui_form_json TEXT
      );

      INSERT INTO platforms_catalog_backup (
        id, slug, name, status, base_url, website_url, notes,
        created_at, updated_at, field_definitions_json, ui_form_json
      )
      SELECT id, slug, name, status, base_url, website_url, notes,
             created_at, updated_at, field_definitions_json, ui_form_json
      FROM platforms_catalog;

      DROP TABLE platforms_catalog;
      ALTER TABLE platforms_catalog_backup RENAME TO platforms_catalog;
    `)
    console.log('  ✓ Migration 010 annulée - value_mappings_json supprimé')
  }
}

