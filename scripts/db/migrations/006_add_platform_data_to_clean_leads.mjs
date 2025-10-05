#!/usr/bin/env node
export default {
  version: '006',
  name: 'add_platform_data_to_clean_leads',
  description: 'Add platform_data column to clean_leads table for platform-specific mapped data',

  up(db) {
    db.exec(`
      -- Ajouter la colonne platform_data pour stocker les données mappées par plateforme
      ALTER TABLE clean_leads
      ADD COLUMN platform_data TEXT DEFAULT NULL;
    `)
  },

  down(db) {
    // SQLite ne supporte pas DROP COLUMN directement
    // On doit recréer la table sans la colonne
    db.exec(`
      -- Créer une table temporaire sans platform_data
      CREATE TABLE clean_leads_backup (
        id TEXT PRIMARY KEY,
        raw_lead_id TEXT REFERENCES raw_leads(id) ON DELETE CASCADE,
        contact_data TEXT NOT NULL DEFAULT '{}',
        souscripteur_data TEXT NOT NULL DEFAULT '{}',
        conjoint_data TEXT DEFAULT NULL,
        enfants_data TEXT DEFAULT '[]',
        besoins_data TEXT DEFAULT '{}',
        quality_score INTEGER DEFAULT 0,
        cleaned_at TEXT DEFAULT (datetime('now'))
      );

      -- Copier les données
      INSERT INTO clean_leads_backup
      SELECT id, raw_lead_id, contact_data, souscripteur_data,
             conjoint_data, enfants_data, besoins_data, quality_score, cleaned_at
      FROM clean_leads;

      -- Supprimer l'ancienne table
      DROP TABLE clean_leads;

      -- Renommer la table backup
      ALTER TABLE clean_leads_backup RENAME TO clean_leads;
    `)
  }
}
