#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { openDb } from './connection.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function loadSeeders() {
  const seedsDir = path.resolve(__dirname, '../seeds')

  if (!fs.existsSync(seedsDir)) {
    return []
  }

  const files = fs.readdirSync(seedsDir)
    .filter(f => f.endsWith('.mjs'))
    .sort()

  const seeders = []
  for (const file of files) {
    const filePath = path.join(seedsDir, file)
    const module = await import(`file://${filePath}`)
    const seeder = module.default

    if (!seeder || !seeder.name || !seeder.run) {
      throw new Error(`Seeder ${file} is invalid: missing name or run function`)
    }

    seeders.push({
      ...seeder,
      filename: file
    })
  }

  return seeders
}

export async function runSeeders(db = null, options = {}) {
  const database = db || openDb()
  const {
    dryRun = false,
    only = null,
    skip = [],
    ...seederOptions
  } = options

  try {
    const allSeeders = await loadSeeders()
    let seedersToRun = allSeeders

    if (only) {
      const onlyList = Array.isArray(only) ? only : only.split(',').map(s => s.trim())
      seedersToRun = seedersToRun.filter(s => onlyList.includes(s.name))
    }

    if (skip.length > 0) {
      const skipList = Array.isArray(skip) ? skip : skip.split(',').map(s => s.trim())
      seedersToRun = seedersToRun.filter(s => !skipList.includes(s.name))
    }

    if (seedersToRun.length === 0) {
      console.log('[ERROR] No seeders to run (check your filters)')
      return { executed: 0, skipped: allSeeders.length }
    }

    console.log('Seeders status:')
    console.log(`   - Total seeders: ${allSeeders.length}`)
    console.log(`   - To execute: ${seedersToRun.length}`)

    if (dryRun) {
      console.log('\n[DRY RUN] Seeders that would be executed:')
      for (const seeder of seedersToRun) {
        console.log(`   - ${seeder.name}${seeder.description ? ': ' + seeder.description : ''}`)
      }
      return { executed: 0, skipped: seedersToRun.length }
    }

    console.log('\nExecuting seeders:')

    let executed = 0
    for (const seeder of seedersToRun) {
      console.log(`   Running ${seeder.name}...`)

      try {
        const result = await seeder.run(database, seederOptions)

        if (result && result.count !== undefined) {
          console.log(`   [OK] ${seeder.name} - ${result.count} items seeded`)
        } else {
          console.log(`   [OK] ${seeder.name}`)
        }

        executed++
      } catch (err) {
        console.error(`   [ERROR] ${seeder.name} - ${err.message}`)

        if (seeder.required !== false) {
          throw err
        } else {
          console.log(`   [WARN] Skipping non-required seeder: ${seeder.name}`)
        }
      }
    }

    console.log(`\n[OK] Successfully executed ${executed} seeders`)
    return { executed, skipped: allSeeders.length - seedersToRun.length }

  } finally {
    if (!db) {
      database?.close()
    }
  }
}

export async function getSeedersInfo() {
  const seeders = await loadSeeders()

  return {
    total: seeders.length,
    seeders: seeders.map(s => ({
      name: s.name,
      description: s.description || 'No description',
      required: s.required !== false,
      filename: s.filename
    }))
  }
}