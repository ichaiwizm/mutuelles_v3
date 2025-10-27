#!/usr/bin/env node
export default {
  version: '015',
  name: 'create_flow_selection_rules',
  description: 'Create flow_selection_rules table for automatic flow selection based on lead data',

  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS flow_selection_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        platform_id INTEGER NOT NULL REFERENCES platforms_catalog(id) ON DELETE CASCADE,
        flow_id INTEGER NOT NULL REFERENCES flows_catalog(id) ON DELETE CASCADE,
        conditions TEXT DEFAULT NULL,
        priority INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_selection_rules_platform_active
        ON flow_selection_rules(platform_id, active, priority DESC);

      CREATE INDEX IF NOT EXISTS idx_selection_rules_flow
        ON flow_selection_rules(flow_id);

      CREATE INDEX IF NOT EXISTS idx_selection_rules_priority
        ON flow_selection_rules(active, priority DESC);
    `)

    console.log('  ✓ Table flow_selection_rules créée')
    console.log('  ✓ Index créés pour platform+active+priority, flow, et active+priority')
    console.log('  ℹ  Conditions JSON format: {"souscripteur.profession": {"oneOf": ["TNS", "EXPLOITANT"]}}')
  },

  down(db) {
    db.exec(`
      DROP INDEX IF EXISTS idx_selection_rules_priority;
      DROP INDEX IF EXISTS idx_selection_rules_flow;
      DROP INDEX IF EXISTS idx_selection_rules_platform_active;

      DROP TABLE IF EXISTS flow_selection_rules;
    `)

    console.log('  ✓ Migration 015 annulée - table flow_selection_rules supprimée')
  }
}
