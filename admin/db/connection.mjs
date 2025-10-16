#!/usr/bin/env node
// Standalone database connection for CLI scripts (ESM)
// Equivalent to src/main/db/connection.ts but for Node.js scripts

import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

let db = null

/**
 * Get database connection (singleton)
 * Uses MUTUELLES_DB_DIR env var or defaults to dev-data/mutuelles.sqlite3
 */
export function getDb() {
  if (db) return db

  const dbDir = process.env.MUTUELLES_DB_DIR || path.join(process.cwd(), 'dev-data')
  const dbPath = path.join(dbDir, 'mutuelles.sqlite3')

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
  } catch (err) {
    throw new Error(`Failed to open database: ${err.message}`)
  }
}

/**
 * Close database connection
 */
export function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}
