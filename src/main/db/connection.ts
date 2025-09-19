import Database from 'better-sqlite3'
import path from 'node:path'
import { app } from 'electron'
import { migrate, seedCatalog } from './migrations'

let db: Database.Database | null = null

export function initDatabase() {
  const dir = app.getPath('userData')
  const file = path.join(dir, 'mutuelles.sqlite3')
  db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  seedCatalog(db)
  return db
}

export function getDb() {
  if (!db) throw new Error('DB not initialized')
  return db
}
