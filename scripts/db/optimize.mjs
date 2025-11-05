#!/usr/bin/env node
import { openDb } from './core/connection.mjs'

try {
  const db = openDb()
  db.exec('PRAGMA wal_checkpoint(TRUNCATE);')
  db.exec('PRAGMA optimize;')
  db.exec('VACUUM;')
  db.close()
  console.log('✓ Database optimized (checkpoint, optimize, vacuum)')
} catch (err) {
  console.error('✗ Optimize failed:', err.message)
  process.exit(1)
}

