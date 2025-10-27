#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { openDb, initializeDbBasics } from './connection.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function loadMigrations() {
  const migrationsDir = path.resolve(__dirname, '../migrations')

  if (!fs.existsSync(migrationsDir)) {
    return []
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.mjs'))
    .sort()

  const migrations = []
  for (const file of files) {
    const filePath = path.join(migrationsDir, file)
    const module = await import(`file://${filePath}`)
    const migration = module.default

    if (!migration || !migration.version || !migration.name || !migration.up) {
      throw new Error(`Migration ${file} is invalid: missing version, name, or up function`)
    }

    migrations.push({
      ...migration,
      filename: file
    })
  }

  return migrations
}

export function getExecutedMigrations(db) {
  try {
    const rows = db.prepare('SELECT version, name, executed_at FROM _migrations ORDER BY version').all()
    return rows.map(r => ({
      version: r.version,
      name: r.name,
      executed_at: r.executed_at
    }))
  } catch (err) {
    return []
  }
}

export async function runMigrations(db = null, options = {}) {
  const database = db || openDb()
  const { dryRun = false, target = null } = options

  try {
    initializeDbBasics(database)

    const allMigrations = await loadMigrations()
    const executedMigrations = getExecutedMigrations(database)
    const executedVersions = new Set(executedMigrations.map(m => m.version))

    let migrationsToRun = allMigrations.filter(m => !executedVersions.has(m.version))

    if (target) {
      migrationsToRun = migrationsToRun.filter(m => m.version <= target)
    }

    if (migrationsToRun.length === 0) {
      console.log('[OK] No new migrations to run')
      return { executed: 0, skipped: allMigrations.length }
    }

    console.log('Migrations status:')
    console.log(`   - Total migrations: ${allMigrations.length}`)
    console.log(`   - Already executed: ${executedMigrations.length}`)
    console.log(`   - To execute: ${migrationsToRun.length}`)

    if (dryRun) {
      console.log('\n[DRY RUN] Migrations that would be executed:')
      for (const migration of migrationsToRun) {
        console.log(`   - ${migration.version}: ${migration.name}`)
      }
      return { executed: 0, skipped: migrationsToRun.length }
    }

    console.log('\nExecuting migrations:')

    const transaction = database.transaction(() => {
      for (const migration of migrationsToRun) {
        console.log(`   Running ${migration.version}: ${migration.name}...`)

        try {
          migration.up(database)

          database.prepare('INSERT INTO _migrations (version, name) VALUES (?, ?)')
            .run(migration.version, migration.name)

          console.log(`   [OK] ${migration.version}: ${migration.name}`)
        } catch (err) {
          console.error(`   [ERROR] ${migration.version}: ${migration.name} - ${err.message}`)
          throw err
        }
      }
    })

    transaction()

    console.log(`\n[OK] Successfully executed ${migrationsToRun.length} migrations`)
    return { executed: migrationsToRun.length, skipped: executedMigrations.length }

  } finally {
    if (!db) {
      database?.close()
    }
  }
}

export async function getMigrationStatus() {
  const db = openDb()

  try {
    initializeDbBasics(db)
    const allMigrations = await loadMigrations()
    const executedMigrations = getExecutedMigrations(db)
    const executedVersions = new Set(executedMigrations.map(m => m.version))

    return {
      total: allMigrations.length,
      executed: executedMigrations.length,
      pending: allMigrations.filter(m => !executedVersions.has(m.version)).length,
      migrations: allMigrations.map(m => ({
        ...m,
        executed: executedVersions.has(m.version),
        executed_at: executedMigrations.find(em => em.version === m.version)?.executed_at
      }))
    }
  } finally {
    db?.close()
  }
}