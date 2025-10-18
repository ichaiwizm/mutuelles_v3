/**
 * Unified database connection module
 * Used by: Electron main process, CLI scripts, and migration tools
 */

import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

let db: Database.Database | null = null

/**
 * Get project root directory
 * Works from any location in the project
 */
export function getProjectRoot(): string {
  // For TypeScript/Electron context
  return process.cwd()
}

/**
 * Get the database file path
 * Uses MUTUELLES_DB_DIR env var or defaults to dev-data/mutuelles.sqlite3
 */
export function getDbPath(): string {
  const root = getProjectRoot()
  const devDir = process.env.MUTUELLES_DB_DIR || path.join(root, 'dev-data')
  fs.mkdirSync(devDir, { recursive: true })
  return path.join(devDir, 'mutuelles.sqlite3')
}

/**
 * Delete the database and associated files (WAL, SHM)
 * Used by reset scripts
 */
export function deleteDatabase(): void {
  const dbPath = getDbPath()
  const files = [dbPath, dbPath + '-wal', dbPath + '-shm']

  for (const file of files) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file)
    }
  }
}

/**
 * Open a new database connection
 * Does not use singleton - caller manages the connection
 */
export function openDb(): Database.Database {
  const file = getDbPath()
  const database = new Database(file)
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')
  return database
}

/**
 * Initialize database basics (migrations table)
 * Used by migration scripts
 */
export function initializeDbBasics(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      executed_at TEXT DEFAULT (datetime('now'))
    );
  `)
}

/**
 * Get or create singleton database connection
 * Preferred method for application code (Electron, CLI)
 */
export function getDb(): Database.Database {
  if (db) return db

  const dbPath = getDbPath()

  if (!fs.existsSync(dbPath)) {
    throw new Error(
      `Database not found at: ${dbPath}\n` +
        `Run "npm run db:reset:seed" to create and initialize the database.`
    )
  }

  try {
    db = new Database(dbPath, { readonly: false })
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    return db
  } catch (err: any) {
    throw new Error(`Failed to open database: ${err.message}`)
  }
}

/**
 * Initialize database for Electron app
 * Alias for getDb() for backward compatibility
 */
export function initDatabase(): Database.Database {
  return getDb()
}

/**
 * Close the singleton database connection
 */
export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
