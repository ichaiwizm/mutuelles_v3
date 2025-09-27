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
  --seed              Run seeders after reset
  --dry-run           Show what would be done without executing
  --only <seeders>    Run only specific seeders (comma-separated)
  --skip <seeders>    Skip specific seeders (comma-separated)
  --help, -h          Show this help

Examples:
  npm run db:reset                    # Reset DB with fresh schema
  npm run db:reset --seed             # Reset and run all seeders
  npm run db:reset --seed --only platforms,flows
                                     # Reset and seed only platforms and flows
  npm run db:reset --dry-run --seed   # Show what would be executed

Environment Variables:
  ALPTIS_USERNAME     Username for Alptis platform
  ALPTIS_PASSWORD     Password for Alptis platform
  SWISSLIFE_USERNAME  Username for Swisslife platform
  SWISSLIFE_PASSWORD  Password for Swisslife platform
`)
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

    // Step 1: Delete existing database
    console.log('Step 1: Deleting existing database...')
    if (!options.dryRun) {
      deleteDatabase()
      console.log('   [OK] Database deleted')
    } else {
      console.log('   [DRY RUN] Would delete database files')
    }
    console.log()

    // Step 2: Create new database and run migrations
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

    // Step 3: Run seeders (if requested)
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

// Run the script
main().catch(err => {
  console.error('[ERROR] Unexpected error:', err.message)
  process.exit(1)
})