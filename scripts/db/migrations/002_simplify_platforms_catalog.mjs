#!/usr/bin/env node
export default {
  version: '002',
  name: 'simplify_platforms_catalog',
  description: 'Drop unused JSON columns from platforms_catalog (field_definitions_json, ui_form_json, value_mappings_json)',

  up(db) {
    db.exec('PRAGMA foreign_keys=OFF;')

    db.exec(`
      CREATE TABLE IF NOT EXISTS platforms_catalog_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ready',
        base_url TEXT,
        website_url TEXT,
        notes TEXT,
        selected INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `)

    db.exec(`
      INSERT INTO platforms_catalog_new (
        id, slug, name, status, base_url, website_url, notes, selected, created_at, updated_at
      )
      SELECT id, slug, name, status, base_url, website_url, notes, selected, created_at, updated_at
      FROM platforms_catalog;
    `)

    db.exec('DROP TABLE platforms_catalog;')
    db.exec('ALTER TABLE platforms_catalog_new RENAME TO platforms_catalog;')
    db.exec('PRAGMA foreign_keys=ON;')
  },

  down(db) {
    db.exec('PRAGMA foreign_keys=OFF;')

    db.exec(`
      CREATE TABLE IF NOT EXISTS platforms_catalog_old (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ready',
        base_url TEXT,
        website_url TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        field_definitions_json TEXT,
        ui_form_json TEXT,
        value_mappings_json TEXT,
        selected INTEGER NOT NULL DEFAULT 1
      );
    `)

    db.exec(`
      INSERT INTO platforms_catalog_old (
        id, slug, name, status, base_url, website_url, notes, created_at, updated_at, field_definitions_json, ui_form_json, value_mappings_json, selected
      )
      SELECT id, slug, name, status, base_url, website_url, notes, created_at, updated_at, NULL, NULL, NULL, selected
      FROM platforms_catalog;
    `)

    db.exec('DROP TABLE platforms_catalog;')
    db.exec('ALTER TABLE platforms_catalog_old RENAME TO platforms_catalog;')
    db.exec('PRAGMA foreign_keys=ON;')
  }
}

