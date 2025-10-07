#!/usr/bin/env node
export default {
  version: '007',
  name: 'migrate_to_json_architecture',
  description: 'Add JSON columns for flows and field definitions storage',

  up(db) {
    db.exec(`
      -- Ajouter flow_json à flows_catalog pour stocker la définition complète du flow
      ALTER TABLE flows_catalog
      ADD COLUMN flow_json TEXT DEFAULT NULL;

      -- Ajouter steps_count pour référence rapide
      ALTER TABLE flows_catalog
      ADD COLUMN steps_count INTEGER DEFAULT 0;

      -- Ajouter updated_at pour traçabilité
      ALTER TABLE flows_catalog
      ADD COLUMN updated_at TEXT DEFAULT NULL;

      -- Ajouter field_definitions_json à platforms_catalog
      ALTER TABLE platforms_catalog
      ADD COLUMN field_definitions_json TEXT DEFAULT NULL;

      -- Créer des index pour améliorer les performances de requêtes
      CREATE INDEX IF NOT EXISTS idx_flows_catalog_platform_id
        ON flows_catalog(platform_id);

      CREATE INDEX IF NOT EXISTS idx_flows_catalog_active
        ON flows_catalog(active);
    `)

    console.log('  ✓ Colonnes JSON ajoutées à flows_catalog et platforms_catalog')
    console.log('  ✓ Index créés pour améliorer les performances')
  },

  down(db) {
    // SQLite ne supporte pas DROP COLUMN facilement
    // On doit recréer les tables sans les colonnes JSON
    db.exec(`
      -- Recréer flows_catalog sans les colonnes JSON
      CREATE TABLE flows_catalog_backup (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform_id INTEGER NOT NULL REFERENCES platforms_catalog(id) ON DELETE CASCADE,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Copier les données
      INSERT INTO flows_catalog_backup (id, platform_id, slug, name, active, created_at)
      SELECT id, platform_id, slug, name, active, created_at
      FROM flows_catalog;

      -- Supprimer l'ancienne table
      DROP TABLE flows_catalog;

      -- Renommer la table backup
      ALTER TABLE flows_catalog_backup RENAME TO flows_catalog;

      -- Recréer platforms_catalog sans field_definitions_json
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

      -- Copier les données
      INSERT INTO platforms_catalog_backup
      SELECT id, slug, name, status, base_url, website_url, notes, created_at, updated_at
      FROM platforms_catalog;

      -- Supprimer l'ancienne table
      DROP TABLE platforms_catalog;

      -- Renommer la table backup
      ALTER TABLE platforms_catalog_backup RENAME TO platforms_catalog;

      -- Supprimer les index
      DROP INDEX IF EXISTS idx_flows_catalog_platform_id;
      DROP INDEX IF EXISTS idx_flows_catalog_active;
    `)

    console.log('  ✓ Migration 007 annulée - colonnes JSON supprimées')
  }
}
