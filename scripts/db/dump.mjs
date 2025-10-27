#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { getDbPath, openDb, getProjectRoot } from './core/connection.mjs'

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    schemaOnly: false,
    dataOnly: false,
    output: null,
    help: false
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '--schema-only':
        opts.schemaOnly = true
        break
      case '--data-only':
        opts.dataOnly = true
        break
      case '--output':
      case '-o':
        opts.output = args[++i]
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
📦 Database Dump Tool

Usage:
  npm run db:dump [options]

Options:
  --schema-only       Export only table schemas (no data)
  --data-only         Export only data (no schema)
  --output, -o <file> Custom output filename (default: dump_YYYYMMDD_HHMMSS.sql)
  --help, -h          Show this help

Examples:
  # Full dump (schema + data)
  npm run db:dump

  # Schema only
  npm run db:dump -- --schema-only

  # Data only
  npm run db:dump -- --data-only

  # Custom output
  npm run db:dump -- --output my_backup.sql

Output:
  Dumps are saved in: dev-data/
`)
}

function getTimestamp() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

function escapeString(str) {
  if (str === null || str === undefined) return 'NULL'
  if (typeof str === 'number') return String(str)
  return `'${String(str).replace(/'/g, "''")}'`
}

function getTableSchema(db, tableName) {
  const sql = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(tableName)
  return sql?.sql || null
}

function getTableData(db, tableName) {
  const rows = db.prepare(`SELECT * FROM ${tableName}`).all()
  if (rows.length === 0) return []

  const columns = Object.keys(rows[0])
  const inserts = []

  for (const row of rows) {
    const values = columns.map(col => escapeString(row[col])).join(',')
    inserts.push(`INSERT INTO ${tableName} VALUES(${values});`)
  }

  return inserts
}

function getIndexes(db, tableName) {
  const indexes = db.prepare(`
    SELECT sql FROM sqlite_master
    WHERE type='index' AND tbl_name=? AND sql IS NOT NULL
  `).all(tableName)

  return indexes.map(idx => idx.sql)
}

function getAllTables(db) {
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table'
    AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all()

  return tables.map(t => t.name)
}

async function main() {
  const options = parseArgs()

  if (options.help) {
    usage()
    return
  }

  if (options.schemaOnly && options.dataOnly) {
    console.error('[ERROR] Cannot use --schema-only and --data-only together')
    process.exit(1)
  }

  const dbPath = getDbPath()
  if (!fs.existsSync(dbPath)) {
    console.error(`[ERROR] Database not found: ${dbPath}`)
    console.error('Run: npm run db:reset to create it')
    process.exit(1)
  }

  const root = getProjectRoot()
  const devDir = process.env.MUTUELLES_DB_DIR || path.join(root, 'dev-data')
  const defaultFilename = `dump_${getTimestamp()}.sql`
  const outputFile = options.output
    ? path.resolve(options.output)
    : path.join(devDir, defaultFilename)

  console.log('=== Database Dump ===')
  console.log(`Database: ${dbPath}`)
  console.log(`Output: ${outputFile}`)
  console.log(`Mode: ${options.schemaOnly ? 'Schema only' : options.dataOnly ? 'Data only' : 'Full dump'}`)
  console.log()

  const db = openDb()
  const tables = getAllTables(db)

  const dumpLines = []

  dumpLines.push('-- SQLite Database Dump')
  dumpLines.push(`-- Generated: ${new Date().toISOString()}`)
  dumpLines.push(`-- Database: ${dbPath}`)
  dumpLines.push(`-- Tables: ${tables.length}`)
  dumpLines.push('')
  dumpLines.push('PRAGMA foreign_keys=OFF;')
  dumpLines.push('BEGIN TRANSACTION;')
  dumpLines.push('')

  if (!options.dataOnly) {
    dumpLines.push('-- =====================')
    dumpLines.push('-- SCHEMA')
    dumpLines.push('-- =====================')
    dumpLines.push('')

    for (const table of tables) {
      const schema = getTableSchema(db, table)
      if (schema) {
        dumpLines.push(`-- Table: ${table}`)
        dumpLines.push(schema + ';')
        dumpLines.push('')
      }
    }

    dumpLines.push('-- Indexes')
    for (const table of tables) {
      const indexes = getIndexes(db, table)
      for (const idx of indexes) {
        dumpLines.push(idx + ';')
      }
    }
    dumpLines.push('')
  }

  if (!options.schemaOnly) {
    dumpLines.push('-- =====================')
    dumpLines.push('-- DATA')
    dumpLines.push('-- =====================')
    dumpLines.push('')

    let totalRows = 0
    for (const table of tables) {
      const inserts = getTableData(db, table)
      if (inserts.length > 0) {
        dumpLines.push(`-- Data for table: ${table} (${inserts.length} rows)`)
        dumpLines.push(...inserts)
        dumpLines.push('')
        totalRows += inserts.length
      }
    }

    console.log(`Total rows exported: ${totalRows}`)
  }

  dumpLines.push('COMMIT;')
  dumpLines.push('PRAGMA foreign_keys=ON;')

  db.close()

  fs.writeFileSync(outputFile, dumpLines.join('\n'), 'utf-8')

  const stats = fs.statSync(outputFile)
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2)

  console.log()
  console.log('✓ Dump completed successfully')
  console.log(`  File: ${outputFile}`)
  console.log(`  Size: ${sizeMB} MB`)
  console.log(`  Tables: ${tables.length}`)
}

main().catch(err => {
  console.error('[ERROR] Dump failed:', err.message)
  if (err.stack && process.env.DEBUG) {
    console.error(err.stack)
  }
  process.exit(1)
})
