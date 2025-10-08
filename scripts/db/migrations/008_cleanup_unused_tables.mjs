#!/usr/bin/env node
export default {
  version: '008',
  name: 'cleanup_unused_tables',
  description: 'Remove unused tables that have been replaced by JSON-based architecture',

  up(db) {
    db.exec(`
      -- Supprimer les tables de field definitions (remplacées par field_definitions_json dans platforms_catalog)
      DROP TABLE IF EXISTS field_dependencies;
      DROP TABLE IF EXISTS field_definitions;

      -- Supprimer les tables de flows (remplacées par flow_json dans flows_catalog)
      DROP TABLE IF EXISTS flow_steps;

      -- Supprimer les tables de configuration Gmail non utilisées
      DROP TABLE IF EXISTS gmail_configs;

      -- Supprimer les tables de platform pages/fields (remplacées par field_definitions_json)
      DROP TABLE IF EXISTS platform_fields;
      DROP TABLE IF EXISTS platform_pages;

      -- Supprimer la table user_platforms non utilisée
      DROP TABLE IF EXISTS user_platforms;
    `)
  },

  down(db) {
    db.exec(`
      -- Recréer user_platforms
      CREATE TABLE IF NOT EXISTS user_platforms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform_id INTEGER NOT NULL UNIQUE REFERENCES platforms_catalog(id) ON DELETE CASCADE,
        selected INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Recréer platform_pages
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

      -- Recréer platform_fields
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

      -- Recréer gmail_configs
      CREATE TABLE IF NOT EXISTS gmail_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        refresh_token TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Recréer flow_steps
      CREATE TABLE IF NOT EXISTS flow_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        flow_id INTEGER NOT NULL REFERENCES flows_catalog(id) ON DELETE CASCADE,
        order_index INTEGER NOT NULL,
        type TEXT NOT NULL,
        selector TEXT,
        value TEXT,
        url TEXT,
        screenshot_label TEXT,
        timeout_ms INTEGER,
        assert_text TEXT
      );

      -- Recréer field_definitions
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

      -- Recréer field_dependencies
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

      -- Recréer les index
      CREATE INDEX IF NOT EXISTS idx_field_definitions_platform
        ON field_definitions(platform_slug);
      CREATE INDEX IF NOT EXISTS idx_field_dependencies_platform
        ON field_dependencies(platform_slug);
      CREATE INDEX IF NOT EXISTS idx_field_dependencies_trigger
        ON field_dependencies(trigger_field);
    `)
  }
}
