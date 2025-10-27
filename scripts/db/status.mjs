#!/usr/bin/env node
import fs from 'node:fs'
import { getDbPath, openDb } from './core/connection.mjs'
import { getMigrationStatus } from './core/migrator.mjs'
import { getSeedersInfo } from './core/seeder.mjs'

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    verbose: false,
    help: false
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '--verbose':
      case '-v':
        opts.verbose = true
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
📊 Database Status Tool

Usage:
  npm run db:status [options]

Options:
  --verbose, -v       Show detailed information
  --help, -h          Show this help

This tool shows:
  - Database file information
  - Migration status
  - Data statistics
  - Available seeders
`)
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getTableStats(db) {
  const tables = [
    'platforms_catalog',
    'user_platforms',
    'platform_credentials',
    'profiles',
    'flows_catalog',
    'flow_steps',
    'flows_runs',
    'raw_leads',
    'clean_leads',
    'platform_leads'
  ]

  const stats = {}
  for (const table of tables) {
    try {
      const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get()
      stats[table] = result.count
    } catch (err) {
      stats[table] = 'N/A'
    }
  }

  return stats
}

async function main() {
  const options = parseArgs()

  if (options.help) {
    usage()
    return
  }

  console.log('=== Database Status ===')
  console.log('=' .repeat(50))

  try {
    const dbPath = getDbPath()
    console.log('Database File:')

    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath)
      console.log(`   Path: ${dbPath}`)
      console.log(`   Size: ${formatBytes(stats.size)}`)
      console.log(`   Modified: ${stats.mtime.toISOString()}`)

      const walPath = dbPath + '-wal'
      const shmPath = dbPath + '-shm'

      if (fs.existsSync(walPath)) {
        const walStats = fs.statSync(walPath)
        console.log(`   WAL file: ${formatBytes(walStats.size)}`)
      }

      if (fs.existsSync(shmPath)) {
        console.log(`   SHM file: present`)
      }
    } else {
      console.log(`   [ERROR] Database does not exist: ${dbPath}`)
      console.log('   Run: npm run db:reset to create it')
      return
    }

    console.log()

    console.log('Migration Status:')
    const migrationStatus = await getMigrationStatus()
    console.log(`   Total migrations: ${migrationStatus.total}`)
    console.log(`   Executed: ${migrationStatus.executed}`)
    console.log(`   Pending: ${migrationStatus.pending}`)

    if (options.verbose && migrationStatus.migrations.length > 0) {
      console.log('   Migrations:')
      for (const migration of migrationStatus.migrations) {
        const status = migration.executed ? '[OK]' : '[PENDING]'
        const timestamp = migration.executed_at ? ` (${migration.executed_at})` : ''
        console.log(`     ${status} ${migration.version}: ${migration.name}${timestamp}`)
      }
    }

    console.log()

    console.log('Data Statistics:')
    const db = openDb()
    try {
      const tableStats = getTableStats(db)

      const categories = {
        'Platforms': ['platforms_catalog', 'user_platforms', 'platform_credentials'],
        'Profiles': ['profiles'],
        'Flows': ['flows_catalog', 'flow_steps', 'flows_runs'],
        'Leads': ['raw_leads', 'clean_leads', 'platform_leads']
      }

      for (const [category, tables] of Object.entries(categories)) {
        console.log(`   ${category}:`)
        for (const table of tables) {
          const count = tableStats[table]
          const displayName = table.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          console.log(`     ${displayName}: ${count}`)
        }
      }

    } finally {
      db.close()
    }

    console.log()

    if (options.verbose) {
      console.log('Available Seeders:')
      const seedersInfo = await getSeedersInfo()
      console.log(`   Total seeders: ${seedersInfo.total}`)

      for (const seeder of seedersInfo.seeders) {
        const required = seeder.required ? '[REQ] ' : '[OPT] '
        console.log(`   ${required}${seeder.name}: ${seeder.description}`)
      }
      console.log()
    }

    console.log('Quick Actions:')
    console.log('   Reset database: npm run db:reset')
    console.log('   Reset with data: npm run db:reset --seed')
    console.log('   Run migrations: npm run db:migrate')
    console.log('   Seed data: npm run db:seed')

  } catch (error) {
    console.error()
    console.error('[ERROR] Status check failed:', error.message)
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