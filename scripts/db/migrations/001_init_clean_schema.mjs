#!/usr/bin/env node
/**
 * 001_init_clean_schema
 * ---------------------
 * Schéma minimal et propre pour l'application actuelle.
 *
 * Tables clefs:
 * - settings: KV JSON
 * - profiles: profils Chrome
 * - platforms_catalog: référentiel plateformes (+ selected, JSONs)
 * - platform_credentials: identifiants chiffrés par plateforme
 * - clean_leads: leads en JSON canonique
 * - execution_*: suivi d'exécution (runs, items, steps, attempts)
 * - email_*: config OAuth + historisation import emails
 */

export default {
  version: '001',
  name: 'init_clean_schema',
  description: 'Create clean minimal schema for the app',

  up(db) {
    db.exec(`
      -- =====================
      -- Core config
      -- =====================
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        user_data_dir TEXT NOT NULL,
        browser_channel TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        initialized_at TEXT
      );

      -- =====================
      -- Platforms
      -- =====================
      CREATE TABLE IF NOT EXISTS platforms_catalog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ready',
        base_url TEXT,
        website_url TEXT,
        notes TEXT,
        selected INTEGER NOT NULL DEFAULT 1,
        field_definitions_json TEXT,
        ui_form_json TEXT,
        value_mappings_json TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS platform_credentials (
        platform_id INTEGER PRIMARY KEY REFERENCES platforms_catalog(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        password_encrypted BLOB NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- =====================
      -- Leads (canonical JSON)
      -- =====================
      CREATE TABLE IF NOT EXISTS clean_leads (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_clean_leads_created ON clean_leads(created_at DESC);

      -- =====================
      -- Execution tracking
      -- =====================
      CREATE TABLE IF NOT EXISTS execution_runs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed', 'stopped')),
        mode TEXT NOT NULL,
        concurrency INTEGER,
        total_items INTEGER NOT NULL DEFAULT 0,
        success_items INTEGER NOT NULL DEFAULT 0,
        error_items INTEGER NOT NULL DEFAULT 0,
        pending_items INTEGER NOT NULL DEFAULT 0,
        cancelled_items INTEGER NOT NULL DEFAULT 0,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        duration_ms INTEGER,
        settings_snapshot TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_runs_status ON execution_runs(status);
      CREATE INDEX IF NOT EXISTS idx_runs_started_at ON execution_runs(started_at DESC);

      CREATE TABLE IF NOT EXISTS execution_items (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        lead_id TEXT,
        lead_name TEXT,
        platform TEXT NOT NULL,
        platform_name TEXT,
        flow_slug TEXT,
        flow_name TEXT,
        status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'success', 'error', 'cancelled')),
        error_message TEXT,
        current_step INTEGER,
        total_steps INTEGER,
        run_dir TEXT,
        started_at TEXT,
        completed_at TEXT,
        duration_ms INTEGER,
        attempt_number INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (run_id) REFERENCES execution_runs(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_items_run_id ON execution_items(run_id);
      CREATE INDEX IF NOT EXISTS idx_items_status ON execution_items(status);
      CREATE INDEX IF NOT EXISTS idx_items_lead_id ON execution_items(lead_id);
      CREATE INDEX IF NOT EXISTS idx_items_platform ON execution_items(platform);

      CREATE TABLE IF NOT EXISTS execution_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id TEXT NOT NULL,
        step_index INTEGER NOT NULL,
        step_type TEXT,
        step_label TEXT,
        status TEXT NOT NULL CHECK(status IN ('success', 'error', 'skipped')),
        error_message TEXT,
        duration_ms INTEGER,
        screenshot_path TEXT,
        executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES execution_items(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_steps_item_id ON execution_steps(item_id);
      CREATE INDEX IF NOT EXISTS idx_steps_index ON execution_steps(item_id, step_index);

      CREATE TABLE IF NOT EXISTS execution_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id TEXT NOT NULL,
        attempt_number INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('success', 'error', 'cancelled')),
        error_message TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        duration_ms INTEGER,
        FOREIGN KEY (item_id) REFERENCES execution_items(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_attempts_item_id ON execution_attempts(item_id);

      -- =====================
      -- Email import
      -- =====================
      CREATE TABLE IF NOT EXISTS email_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL CHECK(provider IN ('gmail', 'outlook')),
        email TEXT NOT NULL UNIQUE,
        display_name TEXT,
        encrypted_access_token TEXT,
        encrypted_refresh_token TEXT,
        expiry_date INTEGER,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_email_configs_provider ON email_configs(provider);
      CREATE INDEX IF NOT EXISTS idx_email_configs_email ON email_configs(email);
      CREATE INDEX IF NOT EXISTS idx_email_configs_active ON email_configs(is_active);

      CREATE TABLE IF NOT EXISTS imported_emails (
        id TEXT PRIMARY KEY,
        config_id INTEGER NOT NULL,
        thread_id TEXT,
        subject TEXT NOT NULL,
        sender TEXT NOT NULL,
        recipient TEXT,
        email_date TEXT NOT NULL,
        snippet TEXT,
        content TEXT,
        html_content TEXT,
        has_lead_potential INTEGER DEFAULT 0,
        detection_reasons TEXT,
        labels TEXT,
        imported_at TEXT DEFAULT CURRENT_TIMESTAMP,
        converted_to_lead_id TEXT,
        FOREIGN KEY (config_id) REFERENCES email_configs(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_imported_emails_config ON imported_emails(config_id);
      CREATE INDEX IF NOT EXISTS idx_imported_emails_sender ON imported_emails(sender);
      CREATE INDEX IF NOT EXISTS idx_imported_emails_date ON imported_emails(email_date DESC);
      CREATE INDEX IF NOT EXISTS idx_imported_emails_lead_potential ON imported_emails(has_lead_potential);
      CREATE INDEX IF NOT EXISTS idx_imported_emails_converted ON imported_emails(converted_to_lead_id);

      CREATE TABLE IF NOT EXISTS email_import_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_id INTEGER NOT NULL,
        total_fetched INTEGER NOT NULL DEFAULT 0,
        leads_detected INTEGER NOT NULL DEFAULT 0,
        leads_imported INTEGER NOT NULL DEFAULT 0,
        date_range_from TEXT,
        date_range_to TEXT,
        filters_json TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed', 'cancelled')),
        error_message TEXT,
        FOREIGN KEY (config_id) REFERENCES email_configs(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_import_history_config ON email_import_history(config_id);
      CREATE INDEX IF NOT EXISTS idx_import_history_started ON email_import_history(started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_import_history_status ON email_import_history(status);
    `)
  },

  down(db) {
    db.exec(`
      DROP TABLE IF EXISTS email_import_history;
      DROP TABLE IF EXISTS imported_emails;
      DROP TABLE IF EXISTS email_configs;
      DROP TABLE IF EXISTS execution_attempts;
      DROP TABLE IF EXISTS execution_steps;
      DROP TABLE IF EXISTS execution_items;
      DROP TABLE IF EXISTS execution_runs;
      DROP TABLE IF EXISTS clean_leads;
      DROP TABLE IF EXISTS platform_credentials;
      DROP TABLE IF EXISTS platforms_catalog;
      DROP TABLE IF EXISTS profiles;
      DROP TABLE IF EXISTS settings;
    `)
  }
}

