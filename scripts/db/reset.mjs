#!/usr/bin/env node
import { deleteDatabase, openDb } from './core/connection.mjs'
import { runMigrations } from './core/migrator.mjs'
import { runSeeders } from './core/seeder.mjs'

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    seed: false,
    dryRun: false,
    only: null,
    skip: [],
    preserveTables: [],
    help: false
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = () => args[++i]

    switch (arg) {
      case '--seed':
        opts.seed = true
        break
      case '--dry-run':
        opts.dryRun = true
        break
      case '--only':
        opts.only = next()
        break
      case '--skip':
        opts.skip = next()?.split(',').map(s => s.trim()) || []
        break
      case '--preserve-tables':
      case '--keep-tables':
        opts.preserveTables = next()?.split(',').map(s => s.trim()) || []
        break
      case '--help':
      case '-h':
        opts.help = true
        break
    }
  }

  return opts
}

function usage() {
  console.log(`
🗄️  Database Reset Tool

Usage:
  npm run db:reset [options]

Options:
  --seed                      Run seeders after reset
  --dry-run                   Show what would be done without executing
  --only <seeders>            Run only specific seeders (comma-separated)
  --skip <seeders>            Skip specific seeders (comma-separated)
  --preserve-tables <tables>  Preserve specific tables during reset (comma-separated)
  --keep-tables <tables>      Alias for --preserve-tables
  --help, -h                  Show this help

Examples:
  npm run db:reset                                    # Reset DB with fresh schema
  npm run db:reset --seed                             # Reset and run all seeders
  npm run db:reset --seed --only platforms,flows      # Reset and seed only platforms and flows
  npm run db:reset --preserve-tables platforms,credentials
                                                      # Reset DB but keep platforms and credentials tables
  npm run db:reset --dry-run --seed                   # Show what would be executed

Environment Variables:
  ALPTIS_USERNAME     Username for Alptis platform
  ALPTIS_PASSWORD     Password for Alptis platform
  SWISSLIFE_USERNAME  Username for Swisslife platform
  SWISSLIFE_PASSWORD  Password for Swisslife platform
`)
}

function escapeString(str) {
  if (str === null || str === undefined) return 'NULL'
  if (typeof str === 'number') return String(str)
  return `'${String(str).replace(/'/g, "''")}'`
}

function tableExists(db, tableName) {
  const result = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name=?
  `).get(tableName)
  return !!result
}

function backupTables(db, tableNames) {
  const backups = {}

  for (const tableName of tableNames) {
    if (!tableExists(db, tableName)) {
      console.log(`   [WARN] Table '${tableName}' does not exist, skipping backup`)
      continue
    }

    const rows = db.prepare(`SELECT * FROM ${tableName}`).all()
    
    if (rows.length === 0) {
      console.log(`   [INFO] Table '${tableName}' is empty, no data to backup`)
      backups[tableName] = []
      continue
    }

    backups[tableName] = rows
    console.log(`   [OK] Backed up ${rows.length} row(s) from '${tableName}'`)
  }

  return backups
}

function restoreTables(db, backups) {
  for (const [tableName, rows] of Object.entries(backups)) {
    if (!tableExists(db, tableName)) {
      console.log(`   [WARN] Table '${tableName}' does not exist in new schema, skipping restore`)
      continue
    }

    if (rows.length === 0) {
      console.log(`   [INFO] No data to restore for '${tableName}'`)
      continue
    }

    const columns = Object.keys(rows[0])
    const columnList = columns.join(', ')
    const placeholders = columns.map(() => '?').join(', ')

    const stmt = db.prepare(`INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders})`)

    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        const values = columns.map(col => row[col])
        stmt.run(...values)
      }
    })

    try {
      insertMany(rows)
      console.log(`   [OK] Restored ${rows.length} row(s) to '${tableName}'`)
    } catch (error) {
      console.log(`   [ERROR] Failed to restore '${tableName}': ${error.message}`)
    }
  }
}

async function main() {
  const options = parseArgs()

  if (options.help) {
    usage()
    return
  }

  console.log('=== Database Reset Tool ===')
  console.log('=' .repeat(50))

  try {
    if (options.dryRun) {
      console.log('[DRY RUN] No changes will be made')
      console.log()
    }

    let backups = {}

    if (options.preserveTables.length > 0) {
      console.log('Step 0: Backing up specified tables...')
      console.log(`   Tables to preserve: ${options.preserveTables.join(', ')}`)
      
      if (!options.dryRun) {
        const db = openDb()
        try {
          backups = backupTables(db, options.preserveTables)
        } finally {
          db.close()
        }
      } else {
        console.log(`   [DRY RUN] Would backup ${options.preserveTables.length} table(s)`)
      }
      console.log()
    }

    console.log('Step 1: Deleting existing database...')
    if (!options.dryRun) {
      deleteDatabase()
      console.log('   [OK] Database deleted')
    } else {
      console.log('   [DRY RUN] Would delete database files')
    }
    console.log()

    console.log('Step 2: Creating new database and running migrations...')
    if (!options.dryRun) {
      const db = openDb()
      try {
        await runMigrations(db, { dryRun: false })
      } finally {
        db.close()
      }
    } else {
      console.log('   [DRY RUN] Would create new database')
      console.log('   [DRY RUN] Would run all migrations')
    }
    console.log()

    if (options.preserveTables.length > 0 && Object.keys(backups).length > 0) {
      console.log('Step 2.5: Restoring preserved tables...')
      
      if (!options.dryRun) {
        const db = openDb()
        try {
          restoreTables(db, backups)
        } finally {
          db.close()
        }
      } else {
        console.log(`   [DRY RUN] Would restore ${Object.keys(backups).length} table(s)`)
      }
      console.log()
    }

    if (options.seed) {
      console.log('Step 3: Running seeders...')
      await runSeeders(null, {
        dryRun: options.dryRun,
        only: options.only,
        skip: options.skip
      })
    } else {
      console.log('Step 3: Skipping seeders (use --seed to enable)')
    }

    console.log()
    console.log('[SUCCESS] Database reset completed successfully!')

    if (!options.dryRun) {
      console.log()
      console.log('Next steps:')
      console.log('  Check status: npm run db:status')
      if (!options.seed) {
        console.log('  Seed data: npm run db:seed')
      }
      console.log('  Start app: npm run dev')
    }

  } catch (error) {
    console.error()
    console.error('[ERROR] Reset failed:', error.message)
    if (error.stack && process.env.DEBUG) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main().catch(err => {
  console.error('[ERROR] Unexpected error:', err.message)
  process.exit(1)
})