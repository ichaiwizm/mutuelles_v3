/**
 * Migration 025: Add known_senders_json to email_configs
 *
 * Adds a JSON column to store known sender patterns for email classification.
 * This allows users to define trusted senders that give bonus points to lead detection.
 *
 * Format: [{"pattern": "domain.com", "type": "domain", "bonus": 50}, ...]
 */

export default {
  version: '025',
  name: 'add_known_senders_to_email_configs',
  description: 'Add known_senders_json column to email_configs table',

  up(db) {
    db.exec(`
      ALTER TABLE email_configs
      ADD COLUMN known_senders_json TEXT DEFAULT '[]';
    `)

    console.log('[Migration 025] ✓ Added known_senders_json column to email_configs')
  },

  down(db) {
    db.exec(`
      ALTER TABLE email_configs
      DROP COLUMN known_senders_json;
    `)

    console.log('[Migration 025] ✓ Dropped known_senders_json column (rollback)')
  }
}
