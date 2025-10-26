/**
 * Migration 024: Create email import tables
 *
 * Creates database tables for email import functionality:
 * - email_configs: OAuth configuration and credentials (encrypted)
 * - imported_emails: History of imported emails with lead detection
 *
 * This enables the email import feature for lead extraction from Gmail/Outlook.
 */

export default {
  version: '024',
  name: 'create_email_tables',
  description: 'Create email import and OAuth configuration tables',

  up(db) {
    // 1. email_configs: Stores OAuth configuration and encrypted tokens
    db.exec(`
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
    `)

    // Indexes for email_configs
    db.exec(`CREATE INDEX IF NOT EXISTS idx_email_configs_provider ON email_configs(provider);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_email_configs_email ON email_configs(email);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_email_configs_active ON email_configs(is_active);`)

    // 2. imported_emails: History of imported emails with metadata
    db.exec(`
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
    `)

    // Indexes for imported_emails
    db.exec(`CREATE INDEX IF NOT EXISTS idx_imported_emails_config ON imported_emails(config_id);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_imported_emails_sender ON imported_emails(sender);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_imported_emails_date ON imported_emails(email_date DESC);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_imported_emails_lead_potential ON imported_emails(has_lead_potential);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_imported_emails_converted ON imported_emails(converted_to_lead_id);`)

    // 3. email_import_history: Aggregate stats for import sessions
    db.exec(`
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
    `)

    // Indexes for email_import_history
    db.exec(`CREATE INDEX IF NOT EXISTS idx_import_history_config ON email_import_history(config_id);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_import_history_started ON email_import_history(started_at DESC);`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_import_history_status ON email_import_history(status);`)

    console.log('[Migration 024] ✓ Created email import tables')
  },

  down(db) {
    // Drop tables in reverse order (respecting foreign key constraints)
    db.exec(`DROP TABLE IF EXISTS email_import_history;`)
    db.exec(`DROP TABLE IF EXISTS imported_emails;`)
    db.exec(`DROP TABLE IF EXISTS email_configs;`)

    console.log('[Migration 024] ✓ Dropped email import tables (rollback)')
  }
}
