/**
 * Database Connection Utility
 * =============================
 *
 * Get database connection for CLI commands.
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

let dbInstance: Database.Database | null = null;

export function getDatabaseConnection(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  // Look for DB in project root
  const dbPath = path.join(process.cwd(), 'database.sqlite');

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database not found at: ${dbPath}`);
  }

  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');

  return dbInstance;
}

export function closeDatabaseConnection(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
