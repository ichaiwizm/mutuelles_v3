#!/usr/bin/env node
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function getProjectRoot() {
  // scripts/db/core -> project root is three levels up
  return path.resolve(__dirname, '../../../')
}

export function getDbPath() {
  const root = getProjectRoot()
  const devDir = process.env.MUTUELLES_DB_DIR || path.join(root, 'dev-data')
  fs.mkdirSync(devDir, { recursive: true })
  return path.join(devDir, 'mutuelles.sqlite3')
}

export function deleteDatabase() {
  const dbPath = getDbPath()
  const files = [
    dbPath,
    dbPath + '-wal',
    dbPath + '-shm'
  ]

  for (const file of files) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file)
    }
  }
}

export function openDb() {
  const file = getDbPath()
  const db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

export function initializeDbBasics(db) {
  // Créer la table de suivi des migrations
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      executed_at TEXT DEFAULT (datetime('now'))
    );
  `)
}