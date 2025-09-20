import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import { migrate, seedCatalog } from './migrations'

let db: Database.Database | null = null

export function initDatabase() {
  const dir = app.getPath('userData')
  const file = path.join(dir, 'mutuelles.sqlite3')
  try {
    db = new Database(file)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    migrate(db)
    seedCatalog(db)
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
    return db
  }
}

export function getDb() {
  if (!db) throw new Error('DB not initialized')
  return db
}
