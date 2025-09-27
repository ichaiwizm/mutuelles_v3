#!/usr/bin/env node
import { runMigrations, getMigrationStatus } from './core/migrator.mjs'

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    dryRun: false,
    target: null,
    status: false,
    help: false
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = () => args[++i]

    switch (arg) {
      case '--dry-run':
        opts.dryRun = true
        break
      case '--target':
        opts.target = next()
        break
      case '--status':
        opts.status = true
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
📊 Database Migration Tool

Usage:
  npm run db:migrate [options]

Options:
  --dry-run           Show migrations that would be run
  --target <version>  Run migrations up to specific version
  --status            Show migration status
  --help, -h          Show this help

Examples:
  npm run db:migrate                # Run all pending migrations
  npm run db:migrate --dry-run      # Show what would be migrated
  npm run db:migrate --target 002   # Migrate up to version 002
  npm run db:migrate --status       # Show migration status
`)
}

async function main() {
  const options = parseArgs()

  if (options.help) {
    usage()
    return
  }

  console.log('=== Database Migration Tool ===')
  console.log('=' .repeat(50))

  try {
    if (options.status) {
      const status = await getMigrationStatus()

      console.log('Migration Status:')
      console.log(`   Total migrations: ${status.total}`)
      console.log(`   Executed: ${status.executed}`)
      console.log(`   Pending: ${status.pending}`)
      console.log()

      if (status.migrations.length > 0) {
        console.log('Migrations:')
        for (const migration of status.migrations) {
          const status = migration.executed ? '[OK]' : '[PENDING]'
          const timestamp = migration.executed_at ? ` (${migration.executed_at})` : ''
          console.log(`  ${status} ${migration.version}: ${migration.name}${timestamp}`)
        }
      }
    } else {
      await runMigrations(null, {
        dryRun: options.dryRun,
        target: options.target
      })
    }

  } catch (error) {
    console.error()
    console.error('[ERROR] Migration failed:', error.message)
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