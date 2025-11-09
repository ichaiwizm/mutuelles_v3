/**
 * Database Connection Utility
 * =============================
 *
 * Get database connection for CLI commands.
 * Uses the shared database connection module from the main app.
 */

import { getDb, closeDb } from '../../src/shared/db/connection';

export function getDatabaseConnection() {
  return getDb();
}

export function closeDatabaseConnection(): void {
  closeDb();
}
