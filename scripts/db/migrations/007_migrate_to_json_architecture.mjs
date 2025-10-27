#!/usr/bin/env node
export default {
  version: '007',
  name: 'migrate_to_json_architecture',
  description: 'Add JSON columns for flows and field definitions storage',

  up(db) {
    db.exec(`
      ALTER TABLE flows_catalog
      ADD COLUMN flow_json TEXT DEFAULT NULL;

      ALTER TABLE flows_catalog
      ADD COLUMN steps_count INTEGER DEFAULT 0;

      ALTER TABLE flows_catalog
      ADD COLUMN updated_at TEXT DEFAULT NULL;

      ALTER TABLE platforms_catalog
      ADD COLUMN field_definitions_json TEXT DEFAULT NULL;

      CREATE INDEX IF NOT EXISTS idx_flows_catalog_platform_id
        ON flows_catalog(platform_id);

      CREATE INDEX IF NOT EXISTS idx_flows_catalog_active
        ON flows_catalog(active);
    `)

    console.log('  ✓ Colonnes JSON ajoutées à flows_catalog et platforms_catalog')
    console.log('  ✓ Index créés pour améliorer les performances')
  },

  down(db) {
    db.exec(`
      CREATE TABLE flows_catalog_backup (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform_id INTEGER NOT NULL REFERENCES platforms_catalog(id) ON DELETE CASCADE,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );

      INSERT INTO flows_catalog_backup (id, platform_id, slug, name, active, created_at)
      SELECT id, platform_id, slug, name, active, created_at
      FROM flows_catalog;

      DROP TABLE flows_catalog;

      ALTER TABLE flows_catalog_backup RENAME TO flows_catalog;

      CREATE TABLE platforms_catalog_backup (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ready',
        base_url TEXT,
        website_url TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      INSERT INTO platforms_catalog_backup
      SELECT id, slug, name, status, base_url, website_url, notes, created_at, updated_at
      FROM platforms_catalog;

      DROP TABLE platforms_catalog;

      ALTER TABLE platforms_catalog_backup RENAME TO platforms_catalog;

      DROP INDEX IF EXISTS idx_flows_catalog_platform_id;
      DROP INDEX IF EXISTS idx_flows_catalog_active;
    `)

    console.log('  ✓ Migration 007 annulée - colonnes JSON supprimées')
  }
}
