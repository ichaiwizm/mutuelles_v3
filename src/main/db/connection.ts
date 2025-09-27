import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import { migrate, seedCatalog, seedFlows } from './migrations'

let db: Database.Database | null = null

export function initDatabase() {
  // Simplified database initialization using new migration system
  const devDir = process.env.MUTUELLES_DB_DIR || path.join(process.cwd(), 'dev-data')
  fs.mkdirSync(devDir, { recursive: true })
  const file = path.join(devDir, 'mutuelles.sqlite3')

  try {
    db = new Database(file)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')

    // Use legacy migrate for now (will be replaced by new migration system)
    migrate(db)
    seedCatalog(db)
    seedFlows(db)

    return db
  } catch (e) {
    try { db?.close() } catch {}
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file)
    } catch {}

    db = new Database(file)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    migrate(db)
    seedCatalog(db)
    seedFlows(db)

    return db
  }
}

export function getDb() {
  if (!db) throw new Error('DB not initialized')
  return db
}
