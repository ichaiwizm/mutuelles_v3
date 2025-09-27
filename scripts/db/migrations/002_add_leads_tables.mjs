#!/usr/bin/env node
export default {
  version: '002',
  name: 'add_leads_tables',
  description: 'Create leads management tables (raw_leads, clean_leads, platform_leads, gmail_configs)',

  up(db) {
    db.exec(`
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
    `)
  },

  down(db) {
    db.exec(`
      DROP TABLE IF EXISTS gmail_configs;
      DROP TABLE IF EXISTS platform_leads;
      DROP TABLE IF EXISTS clean_leads;
      DROP TABLE IF EXISTS raw_leads;
    `)
  }
}