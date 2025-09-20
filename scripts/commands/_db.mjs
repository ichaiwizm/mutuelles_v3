import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function getProjectRoot() {
  // scripts/commands -> project root is two levels up
  return path.resolve(__dirname, '../../')
}

export function getDbPath() {
  const root = getProjectRoot()
  const devDir = process.env.MUTUELLES_DB_DIR || path.join(root, 'dev-data')
  fs.mkdirSync(devDir, { recursive: true })
  return path.join(devDir, 'mutuelles.sqlite3')
}

export function openDb() {
  const file = getDbPath()
  const db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

