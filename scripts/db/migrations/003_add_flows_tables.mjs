#!/usr/bin/env node
export default {
  version: '003',
  name: 'add_flows_tables',
  description: 'Create flows automation tables (flows_catalog, flow_steps, flows_runs)',

  up(db) {
    db.exec(`
      -- Flows catalog
      CREATE TABLE IF NOT EXISTS flows_catalog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform_id INTEGER NOT NULL REFERENCES platforms_catalog(id) ON DELETE CASCADE,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Flow steps
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

      -- Historique d'exécution des flux
      CREATE TABLE IF NOT EXISTS flows_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        flow_id INTEGER NOT NULL REFERENCES flows_catalog(id) ON DELETE CASCADE,
        run_uid TEXT NOT NULL UNIQUE,
        flow_slug TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        status TEXT NOT NULL, -- running|success|error
        screenshots_dir TEXT,
        json_path TEXT,
        steps_total INTEGER,
        ok_steps INTEGER,
        error_message TEXT
      );
    `)
  },

  down(db) {
    db.exec(`
      DROP TABLE IF EXISTS flows_runs;
      DROP TABLE IF EXISTS flow_steps;
      DROP TABLE IF EXISTS flows_catalog;
    `)
  }
}