import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import { migrate, seedCatalog, seedFlows } from './migrations'

let db: Database.Database | null = null

export function initDatabase() {
  // DB unique dans le dossier du projet: dev-data/mutuelles.sqlite3 (quel que soit le mode)
  // Détection robuste du projet (bundlé: __dirname est souvent out/main)
  const candidateRoots = [
    process.cwd(),
    path.resolve(app.getAppPath(), '..'),
    path.resolve(__dirname, '../../'),
    path.resolve(__dirname, '../'),
    path.resolve(__dirname, '../../../')
  ]
  const projectRoot = candidateRoots.find(p => fs.existsSync(path.join(p, 'package.json'))) || process.cwd()
  const devDir = process.env.MUTUELLES_DB_DIR || path.join(projectRoot, 'dev-data')
  fs.mkdirSync(devDir, { recursive: true })
  const devFile = path.join(devDir, 'mutuelles.sqlite3')
  // Migration automatique depuis anciens emplacements dev-only si besoin (sans toucher userData)
  if (!fs.existsSync(devFile)) {
    const legacyDirs = [
      path.join(path.resolve(__dirname, '../../'), 'dev-data'), // out/dev-data
      path.join(path.resolve(__dirname, '../'), 'dev-data'),    // out/main/dev-data
    ]
    for (const d of legacyDirs) {
      const lf = path.join(d, 'mutuelles.sqlite3')
      if (fs.existsSync(lf)) {
        try {
          fs.copyFileSync(lf, devFile)
          const wal = lf + '-wal'
          const shm = lf + '-shm'
          if (fs.existsSync(wal)) fs.copyFileSync(wal, devFile + '-wal')
          if (fs.existsSync(shm)) fs.copyFileSync(shm, devFile + '-shm')
          break
        } catch (e) {
          console.warn('Copie depuis legacy dev-data échouée:', e)
        }
      }
    }
  }
  const file = devFile
  try {
    db = new Database(file)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
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
