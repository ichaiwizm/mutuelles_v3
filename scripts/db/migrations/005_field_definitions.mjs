#!/usr/bin/env node
export default {
  version: '005',
  name: 'add_field_definitions_tables',
  description: 'Create field definitions tables for form field metadata',

  up(db) {
    db.exec(`
      -- Table principale des champs avec leurs métadonnées
      CREATE TABLE IF NOT EXISTS field_definitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform_slug TEXT NOT NULL,
        field_key TEXT NOT NULL,
        field_type TEXT NOT NULL,
        label TEXT,
        selector TEXT NOT NULL,
        options JSON,
        metadata JSON,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(platform_slug, field_key)
      );

      -- Dépendances entre champs
      CREATE TABLE IF NOT EXISTS field_dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform_slug TEXT NOT NULL,
        trigger_field TEXT NOT NULL,
        trigger_value TEXT,
        dependent_field TEXT NOT NULL,
        action TEXT NOT NULL,
        metadata JSON,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Index pour optimiser les requêtes
      CREATE INDEX IF NOT EXISTS idx_field_definitions_platform
        ON field_definitions(platform_slug);
      CREATE INDEX IF NOT EXISTS idx_field_dependencies_platform
        ON field_dependencies(platform_slug);
      CREATE INDEX IF NOT EXISTS idx_field_dependencies_trigger
        ON field_dependencies(trigger_field);
    `)
  },

  down(db) {
    db.exec(`
      DROP TABLE IF EXISTS field_dependencies;
      DROP TABLE IF EXISTS field_definitions;
    `)
  }
}