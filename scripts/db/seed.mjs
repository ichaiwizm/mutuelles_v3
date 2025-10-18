#!/usr/bin/env node
import { runSeeders, getSeedersInfo } from './core/seeder.mjs'

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    dryRun: false,
    only: null,
    skip: [],
    list: false,
    help: false,
    // Seeder-specific options
    skipExisting: true,
    force: false
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = () => args[++i]

    switch (arg) {
      case '--dry-run':
        opts.dryRun = true
        break
      case '--only':
        opts.only = next()
        break
      case '--skip':
        opts.skip = next()?.split(',').map(s => s.trim()) || []
        break
      case '--list':
        opts.list = true
        break
      case '--force':
        opts.force = true
        opts.skipExisting = false
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
🌱 Database Seeder Tool

Usage:
  npm run db:seed [options]

Options:
  --dry-run           Show seeders that would be run
  --only <seeders>    Run only specific seeders (comma-separated)
  --skip <seeders>    Skip specific seeders (comma-separated)
  --force             Force re-seed even if data exists
  --list              List available seeders
  --help, -h          Show this help

Examples:
  npm run db:seed                    # Run all seeders
  npm run db:seed --dry-run          # Show what would be seeded
  npm run db:seed --only platforms,credentials
                                    # Seed only platforms and credentials
  npm run db:seed --skip credentials # Skip credentials seeder
  npm run db:seed --force            # Force re-seed all data
  npm run db:seed --list             # List available seeders

Seeders:
  platforms    Seed basic platforms (Alptis, Swisslife)
  credentials  Seed credentials from environment variables
  profiles     Seed Chrome profiles for testing

Environment Variables (for credentials):
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

  console.log('=== Database Seeder Tool ===')
  console.log('=' .repeat(50))

  try {
    if (options.list) {
      const info = await getSeedersInfo()

      console.log('Available Seeders:')
      console.log(`   Total: ${info.total}`)
      console.log()

      for (const seeder of info.seeders) {
        const required = seeder.required ? '[REQUIRED]' : '[OPTIONAL]'
        console.log(`  ${seeder.name}`)
        console.log(`     ${seeder.description}`)
        console.log(`     ${required}`)
        console.log(`     File: ${seeder.filename}`)
        console.log()
      }
    } else {
      await runSeeders(null, {
        dryRun: options.dryRun,
        only: options.only,
        skip: options.skip,
        skipExisting: options.skipExisting,
        force: options.force
      })
    }

  } catch (error) {
    console.error()
    console.error('[ERROR] Seeding failed:', error.message)
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