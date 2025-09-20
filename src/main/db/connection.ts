import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import { migrate, seedCatalog, seedFlows } from './migrations'

let db: Database.Database | null = null

export function initDatabase() {
  const defaultUserData = app.getPath('userData')
  const defaultFile = path.join(defaultUserData, 'mutuelles.sqlite3')
  let file = defaultFile

  if (!app.isPackaged) {
    // DB visible à la racine du repo en dev, sans déplacer le profil Chrome
    const projectRoot = path.resolve(__dirname, '../../../')
    const devDir = process.env.MUTUELLES_DB_DIR || path.join(projectRoot, 'dev-data')
    fs.mkdirSync(devDir, { recursive: true })
    const devFile = path.join(devDir, 'mutuelles.sqlite3')
    // Migration automatique depuis anciens emplacements si besoin
    if (!fs.existsSync(devFile)) {
      const legacyDirs = [
        path.join(path.resolve(__dirname, '../../'), 'dev-data'), // out/dev-data
        path.join(path.resolve(__dirname, '../'), 'dev-data'),    // out/main/dev-data
      ]
      let migrated = false
      for (const d of legacyDirs) {
        const lf = path.join(d, 'mutuelles.sqlite3')
        if (fs.existsSync(lf)) {
          try {
            fs.copyFileSync(lf, devFile)
            const wal = lf + '-wal'
            const shm = lf + '-shm'
            if (fs.existsSync(wal)) fs.copyFileSync(wal, devFile + '-wal')
            if (fs.existsSync(shm)) fs.copyFileSync(shm, devFile + '-shm')
            migrated = true
            break
          } catch (e) {
            console.warn('Copie depuis legacy dev-data échouée:', e)
          }
        }
      }
      // Sinon migration depuis le userData par défaut
      if (!migrated && fs.existsSync(defaultFile)) {
        try {
          fs.copyFileSync(defaultFile, devFile)
          const wal = defaultFile + '-wal'
          const shm = defaultFile + '-shm'
          if (fs.existsSync(wal)) fs.copyFileSync(wal, devFile + '-wal')
          if (fs.existsSync(shm)) fs.copyFileSync(shm, devFile + '-shm')
        } catch (e) {
          console.warn('Migration DB dev depuis userData échouée:', e)
        }
      }
    }
    file = devFile
  }
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
