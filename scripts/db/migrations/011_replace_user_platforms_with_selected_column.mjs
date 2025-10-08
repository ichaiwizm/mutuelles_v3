#!/usr/bin/env node
export default {
  version: '011',
  name: 'replace_user_platforms_with_selected_column',
  description: 'Add selected column to platforms_catalog and migrate data from user_platforms table',

  up(db) {
    // Ajouter la colonne selected
    db.exec(`
      ALTER TABLE platforms_catalog
      ADD COLUMN selected INTEGER NOT NULL DEFAULT 0;
    `)
    console.log('  ✓ Colonne selected ajoutée à platforms_catalog')

    // Vérifier si la table user_platforms existe
    const tableExists = db.prepare(`
      SELECT COUNT(*) as count FROM sqlite_master 
      WHERE type='table' AND name='user_platforms'
    `).get()

    // Migrer les données si la table existe
    if (tableExists.count > 0) {
      db.exec(`
        UPDATE platforms_catalog
        SET selected = (
          SELECT COALESCE(up.selected, 0)
          FROM user_platforms up
          WHERE up.platform_id = platforms_catalog.id
        );
      `)
      console.log('  ✓ Données migrées depuis user_platforms')

      // Supprimer la table et ses index
      db.exec(`
        DROP INDEX IF EXISTS idx_user_platforms_platform_id;
        DROP TABLE IF EXISTS user_platforms;
      `)
      console.log('  ✓ Table user_platforms supprimée')
    } else {
      console.log('  ℹ Table user_platforms n\'existe pas, migration des données ignorée')
    }
  },

  down(db) {
    db.exec(`
      -- Recréer la table user_platforms
      CREATE TABLE IF NOT EXISTS user_platforms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform_id INTEGER NOT NULL UNIQUE REFERENCES platforms_catalog(id) ON DELETE CASCADE,
        selected INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Recréer l'index
      CREATE INDEX IF NOT EXISTS idx_user_platforms_platform_id 
        ON user_platforms(platform_id);

      -- Migrer les données de platforms_catalog vers user_platforms
      INSERT INTO user_platforms (platform_id, selected)
      SELECT id, selected
      FROM platforms_catalog
      WHERE selected = 1;

      -- Note: On ne supprime pas la colonne selected de platforms_catalog
      -- car SQLite ne supporte pas ALTER TABLE DROP COLUMN facilement
      -- L'application devra gérer les deux colonnes si rollback
    `)

    console.log('  ✓ Table user_platforms recréée')
    console.log('  ✓ Données migrées vers user_platforms')
    console.log('  ⚠ Colonne selected reste dans platforms_catalog (limitation SQLite)')
  }
}
