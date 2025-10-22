/**
 * Migration 023: Add 'cancelled' status to execution_attempts
 *
 * Updates the CHECK constraint on execution_attempts.status to include 'cancelled'
 * to prevent constraint failures when creating attempt records for cancelled items.
 */

export default {
  version: '023',
  name: 'add_cancelled_to_attempts',
  description: 'Add cancelled status to execution_attempts table',

  up(db) {
    console.log('[Migration 023] Adding cancelled status to execution_attempts...')

    // SQLite doesn't support ALTER TABLE ... DROP CONSTRAINT
    // We need to recreate the table with the new constraint

    // Step 1: Create new table with updated constraint
    db.exec(`
      CREATE TABLE execution_attempts_new (
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
    `)

    // Step 2: Copy data from old table to new table
    db.exec(`
      INSERT INTO execution_attempts_new
      SELECT * FROM execution_attempts;
    `)

    // Step 3: Drop old table
    db.exec(`DROP TABLE execution_attempts;`)

    // Step 4: Rename new table to original name
    db.exec(`ALTER TABLE execution_attempts_new RENAME TO execution_attempts;`)

    // Step 5: Recreate indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_attempts_item_id ON execution_attempts(item_id);`)

    console.log('[Migration 023] ✓ Added cancelled status to execution_attempts')
  },

  down(db) {
    console.log('[Migration 023] Rolling back cancelled status from attempts...')

    // Recreate table without 'cancelled' status
    db.exec(`
      CREATE TABLE execution_attempts_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id TEXT NOT NULL,
        attempt_number INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('success', 'error')),
        error_message TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        duration_ms INTEGER,
        FOREIGN KEY (item_id) REFERENCES execution_items(id) ON DELETE CASCADE
      );
    `)

    // Convert 'cancelled' to 'error' when copying
    db.exec(`
      INSERT INTO execution_attempts_new
      SELECT
        id, item_id, attempt_number,
        CASE WHEN status = 'cancelled' THEN 'error' ELSE status END as status,
        error_message, started_at, completed_at, duration_ms
      FROM execution_attempts;
    `)

    db.exec(`DROP TABLE execution_attempts;`)
    db.exec(`ALTER TABLE execution_attempts_new RENAME TO execution_attempts;`)

    // Recreate indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_attempts_item_id ON execution_attempts(item_id);`)

    console.log('[Migration 023] ✓ Rolled back cancelled status from attempts (rollback)')
  }
}
