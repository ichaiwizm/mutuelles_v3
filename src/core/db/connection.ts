import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

let db: Database.Database | null = null

const DB_FILE = 'broker.sqlite3'

function getDataDir(): string {
  const root = process.cwd()
  const dir = process.env.BROKER_DB_DIR || path.join(root, 'dev-data')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function getDbPath(): string {
  return path.join(getDataDir(), DB_FILE)
}

function ensureSchema(database: Database.Database) {
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      product TEXT NOT NULL,
      status TEXT NOT NULL,
      logs TEXT,
      result_path TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      finished_at TEXT,
      CONSTRAINT fk_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_lead ON tasks(lead_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  `)
}

export function initDatabase(): Database.Database {
  if (db) return db
  const file = getDbPath()
  const d = new Database(file)
  d.pragma('journal_mode = WAL')
  ensureSchema(d)
  db = d
  return db
}

export function getDb(): Database.Database {
  return db ?? initDatabase()
}

export function closeDb() {
  if (!db) return
  db.close()
  db = null
}

