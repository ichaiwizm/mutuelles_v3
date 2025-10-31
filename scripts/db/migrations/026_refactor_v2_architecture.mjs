#!/usr/bin/env node
/**
 * Migration 026: Refonte Architecture v2.0
 *
 * Cette migration implémente la nouvelle architecture "Cerveau / Traducteurs / Ouvriers"
 *
 * Changements:
 * 1. Renomme clean_leads → leads (alignement nomenclature)
 * 2. Ajoute colonnes updated_at aux leads
 * 3. Crée table tasks pour la file d'attente d'automatisation
 * 4. Crée indexes pour performance
 */

export default {
  version: '026',
  name: 'refactor_v2_architecture',
  description: 'Refonte v2.0: Architecture Cerveau/Traducteurs/Ouvriers - Tables leads + tasks',

  up(db) {
    console.log('  🔧 Migration 026: Refonte Architecture v2.0')

    // Désactiver les contraintes FK temporairement
    db.exec('PRAGMA foreign_keys = OFF;')

    // ========================================================================
    // 1. ADAPTER LA TABLE CLEAN_LEADS → LEADS
    // ========================================================================

    // Vérifier si clean_leads existe
    const tableExists = db.prepare(`
      SELECT COUNT(*) as count FROM sqlite_master
      WHERE type='table' AND name='clean_leads'
    `).get()

    if (tableExists.count > 0) {
      console.log('  → Ajout de la colonne updated_at à clean_leads')

      // Ajouter la colonne updated_at si elle n'existe pas
      try {
        db.exec(`
          ALTER TABLE clean_leads ADD COLUMN updated_at TEXT DEFAULT NULL;
        `)
      } catch (err) {
        // La colonne existe déjà
        console.log('    (colonne updated_at existe déjà)')
      }

      console.log('  → Renommage clean_leads → leads')
      // Renommer la table
      db.exec(`
        ALTER TABLE clean_leads RENAME TO leads;
      `)
    } else {
      console.log('  → Création de la table leads')
      // Créer la table si elle n'existe pas
      db.exec(`
        CREATE TABLE leads (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL DEFAULT '{}',
          metadata TEXT DEFAULT '{}',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT NULL
        );
      `)
    }

    console.log('  ✓ Table leads prête')

    // ========================================================================
    // 2. CRÉER LA TABLE TASKS
    // ========================================================================

    console.log('  → Création de la table tasks')

    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        platform_key TEXT NOT NULL,
        product_key TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
        priority INTEGER DEFAULT 1,

        -- Résultats (JSON)
        result TEXT DEFAULT NULL,

        -- Timestamps
        created_at TEXT DEFAULT (datetime('now')),
        started_at TEXT DEFAULT NULL,
        completed_at TEXT DEFAULT NULL,

        -- Retry logic
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3
      );
    `)

    console.log('  ✓ Table tasks créée')

    // ========================================================================
    // 3. CRÉER LES INDEX
    // ========================================================================

    console.log('  → Création des index')

    db.exec(`
      -- Index sur leads
      CREATE INDEX IF NOT EXISTS idx_leads_created_at
        ON leads(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_leads_updated_at
        ON leads(updated_at DESC);

      -- Index sur tasks
      CREATE INDEX IF NOT EXISTS idx_tasks_lead_id
        ON tasks(lead_id);

      CREATE INDEX IF NOT EXISTS idx_tasks_status
        ON tasks(status);

      CREATE INDEX IF NOT EXISTS idx_tasks_created_at
        ON tasks(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_tasks_platform_product
        ON tasks(platform_key, product_key);

      CREATE INDEX IF NOT EXISTS idx_tasks_status_priority
        ON tasks(status, priority DESC, created_at ASC);
    `)

    console.log('  ✓ Index créés')

    // ========================================================================
    // 4. NETTOYER LES ANCIENNES TABLES (optionnel - sera fait dans une migration ultérieure)
    // ========================================================================

    console.log('  ℹ Tables legacy (platform_leads, execution_*, gmail_configs) conservées pour l\'instant')

    // Réactiver les contraintes FK
    db.exec('PRAGMA foreign_keys = ON;')

    console.log('  ✅ Migration 026 terminée')
    console.log('     → Table leads (avec updated_at)')
    console.log('     → Table tasks (file d\'attente d\'automatisation)')
    console.log('     → Index de performance créés')
  },

  down(db) {
    console.log('  ↩️  Rollback Migration 026')

    db.exec('PRAGMA foreign_keys = OFF;')

    // Supprimer les index
    db.exec(`
      DROP INDEX IF EXISTS idx_tasks_status_priority;
      DROP INDEX IF EXISTS idx_tasks_platform_product;
      DROP INDEX IF EXISTS idx_tasks_created_at;
      DROP INDEX IF EXISTS idx_tasks_status;
      DROP INDEX IF EXISTS idx_tasks_lead_id;
      DROP INDEX IF EXISTS idx_leads_updated_at;
      DROP INDEX IF EXISTS idx_leads_created_at;
    `)

    // Supprimer la table tasks
    db.exec(`
      DROP TABLE IF EXISTS tasks;
    `)

    // Renommer leads → clean_leads
    const tableExists = db.prepare(`
      SELECT COUNT(*) as count FROM sqlite_master
      WHERE type='table' AND name='leads'
    `).get()

    if (tableExists.count > 0) {
      db.exec(`
        ALTER TABLE leads RENAME TO clean_leads;
      `)

      // Supprimer la colonne updated_at (impossible en SQLite, on la laisse)
      console.log('    ℹ Colonne updated_at conservée (suppression non supportée en SQLite)')
    }

    db.exec('PRAGMA foreign_keys = ON;')

    console.log('  ✓ Rollback terminé')
  }
}
