#!/usr/bin/env node
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'

// Copié de src/main/db/connection.ts pour déclencher les migrations
function getProjectRoot() {
  const __filename = new URL(import.meta.url).pathname
  const __dirname = path.dirname(__filename.replace(/^\/([A-Z]):/, '$1:'))
  return path.resolve(__dirname, '../../')
}

function getDbPath() {
  const root = getProjectRoot()
  const devDir = process.env.MUTUELLES_DB_DIR || path.join(root, 'dev-data')
  fs.mkdirSync(devDir, { recursive: true })
  return path.join(devDir, 'mutuelles.sqlite3')
}

// Import des migrations (avec duplication nécessaire pour ce script)
function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      user_data_dir TEXT NOT NULL,
      browser_channel TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      initialized_at TEXT
    );

    -- Catalog of platforms managed by the app
    CREATE TABLE IF NOT EXISTS platforms_catalog (
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

    -- User selection of platforms
    CREATE TABLE IF NOT EXISTS user_platforms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform_id INTEGER NOT NULL UNIQUE REFERENCES platforms_catalog(id) ON DELETE CASCADE,
      selected INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Pages per platform (login, quote_form, ...)
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

    -- Field definitions per page
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

    -- One credential per selected platform (username + password)
    CREATE TABLE IF NOT EXISTS platform_credentials (
      platform_id INTEGER PRIMARY KEY REFERENCES platforms_catalog(id) ON DELETE CASCADE,
      username TEXT NOT NULL,
      password_encrypted BLOB NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Tables Leads Management
    CREATE TABLE IF NOT EXISTS raw_leads (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL CHECK (source IN ('gmail', 'file', 'manual')),
      provider TEXT CHECK (provider IN ('assurprospect', 'assurlead', 'generic')),
      raw_content TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      extracted_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clean_leads (
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

    CREATE TABLE IF NOT EXISTS platform_leads (
      id TEXT PRIMARY KEY,
      clean_lead_id TEXT REFERENCES clean_leads(id) ON DELETE CASCADE,
      platform_id INTEGER REFERENCES platforms_catalog(id) ON DELETE CASCADE,
      adapted_data TEXT NOT NULL DEFAULT '{}',
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
      adapted_at TEXT DEFAULT (datetime('now')),
      processed_at TEXT,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS gmail_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      refresh_token BLOB,
      provider_settings TEXT DEFAULT '{}',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Extensions flows (idempotent)
    CREATE TABLE IF NOT EXISTS flows_catalog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform_id INTEGER NOT NULL REFERENCES platforms_catalog(id) ON DELETE CASCADE,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
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
    CREATE UNIQUE INDEX IF NOT EXISTS idx_flow_steps_order ON flow_steps(flow_id, order_index);

    -- Index divers
    CREATE INDEX IF NOT EXISTS idx_user_platforms_platform_id ON user_platforms(platform_id);
    CREATE INDEX IF NOT EXISTS idx_platform_credentials_platform_id ON platform_credentials(platform_id);
    CREATE INDEX IF NOT EXISTS idx_platform_pages_platform_id ON platform_pages(platform_id);
    CREATE INDEX IF NOT EXISTS idx_platform_fields_page_id ON platform_fields(page_id);
    CREATE INDEX IF NOT EXISTS idx_flows_platform ON flows_catalog(platform_id);

    -- Index pour les tables leads
    CREATE INDEX IF NOT EXISTS idx_raw_leads_source ON raw_leads(source);
    CREATE INDEX IF NOT EXISTS idx_raw_leads_extracted_at ON raw_leads(extracted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_clean_leads_raw_lead_id ON clean_leads(raw_lead_id);
    CREATE INDEX IF NOT EXISTS idx_clean_leads_quality_score ON clean_leads(quality_score DESC);
    CREATE INDEX IF NOT EXISTS idx_platform_leads_clean_lead_id ON platform_leads(clean_lead_id);
    CREATE INDEX IF NOT EXISTS idx_platform_leads_platform_id ON platform_leads(platform_id);
    CREATE INDEX IF NOT EXISTS idx_platform_leads_status ON platform_leads(status);

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
    CREATE INDEX IF NOT EXISTS idx_flows_runs_flow ON flows_runs(flow_id, started_at DESC);
  `)
}

async function main() {
  const require = createRequire(import.meta.url)
  const Database = require('better-sqlite3')

  const file = getDbPath()
  console.log('🔧 Initialisation de la base de données:', file)

  let db
  try {
    db = new Database(file)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    migrate(db)
    console.log('✅ Base de données initialisée avec succès!')
  } catch (e) {
    console.error('❌ Erreur lors de l\'initialisation:', e.message)
    process.exit(1)
  } finally {
    if (db) db.close()
  }
}

main().catch(err => {
  console.error('❌ Erreur:', err.stack || err)
  process.exit(1)
})