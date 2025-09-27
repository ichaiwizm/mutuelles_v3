import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

let db: Database.Database | null = null

export function initDatabase() {
  // Database initialization - migrations and seeds are handled by npm scripts
  const devDir = process.env.MUTUELLES_DB_DIR || path.join(process.cwd(), 'dev-data')
  fs.mkdirSync(devDir, { recursive: true })
  const file = path.join(devDir, 'mutuelles.sqlite3')

  if (!fs.existsSync(file)) {
    throw new Error('Database does not exist. Run "npm run db:reset:seed" to create and initialize it.')
  }

  try {
    db = new Database(file)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    return db
  } catch (e) {
    console.error('Failed to open database:', e)
    throw e
  }
}

export function getDb() {
  if (!db) throw new Error('DB not initialized')
  return db
}
