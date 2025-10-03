#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { openDbRW } from '../db/core/connection.mjs'

function usage() {
  console.log(`
Usage:
  node scripts/metadata/import_fields.mjs <file.json>

Import field definitions from JSON file to database.

Example:
  node scripts/metadata/import_fields.mjs admin/field-definitions/alptis.json
`)
}

function validateFieldDefinitionsJson(data) {
  if (!data.platform || typeof data.platform !== 'string') {
    throw new Error('Missing or invalid platform field')
  }

  if (!Array.isArray(data.fields)) {
    throw new Error('Missing or invalid fields array')
  }

  for (const field of data.fields) {
    if (!field.key || !field.type || !field.selector) {
      throw new Error(`Field missing required properties: ${JSON.stringify(field)}`)
    }
  }

  if (data.dependencies && !Array.isArray(data.dependencies)) {
    throw new Error('Dependencies must be an array if provided')
  }
}

function importFieldDefinitions(db, data) {
  const transaction = db.transaction(() => {
    // Clear existing definitions for this platform
    db.prepare('DELETE FROM field_dependencies WHERE platform_slug = ?').run(data.platform)
    db.prepare('DELETE FROM field_definitions WHERE platform_slug = ?').run(data.platform)

    // Insert field definitions
    const fieldStmt = db.prepare(`
      INSERT INTO field_definitions
      (platform_slug, field_key, field_type, label, selector, options, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    for (const field of data.fields) {
      fieldStmt.run(
        data.platform,
        field.key,
        field.type,
        field.label || null,
        field.selector,
        field.options ? JSON.stringify(field.options) : null,
        field.metadata ? JSON.stringify(field.metadata) : null
      )
    }

    // Insert dependencies if provided
    if (data.dependencies) {
      const depStmt = db.prepare(`
        INSERT INTO field_dependencies
        (platform_slug, trigger_field, trigger_value, dependent_field, action, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      for (const dep of data.dependencies) {
        if (dep.shows) {
          for (const field of dep.shows) {
            depStmt.run(
              data.platform,
              dep.trigger,
              dep.value || null,
              field,
              'show',
              dep.metadata ? JSON.stringify(dep.metadata) : null
            )
          }
        }
        if (dep.hides) {
          for (const field of dep.hides) {
            depStmt.run(
              data.platform,
              dep.trigger,
              dep.value || null,
              field,
              'hide',
              dep.metadata ? JSON.stringify(dep.metadata) : null
            )
          }
        }
        if (dep.enables) {
          for (const field of dep.enables) {
            depStmt.run(
              data.platform,
              dep.trigger,
              dep.value || null,
              field,
              'enable',
              dep.metadata ? JSON.stringify(dep.metadata) : null
            )
          }
        }
        if (dep.disables) {
          for (const field of dep.disables) {
            depStmt.run(
              data.platform,
              dep.trigger,
              dep.value || null,
              field,
              'disable',
              dep.metadata ? JSON.stringify(dep.metadata) : null
            )
          }
        }
      }
    }
  })

  transaction()
}

async function main() {
  const file = process.argv[2]
  if (!file) {
    usage()
    process.exit(1)
  }

  const absolutePath = path.resolve(file)

  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`)
    process.exit(1)
  }

  let data
  try {
    const content = fs.readFileSync(absolutePath, 'utf8')
    data = JSON.parse(content)
  } catch (err) {
    console.error(`Failed to parse JSON file: ${err.message}`)
    process.exit(1)
  }

  try {
    validateFieldDefinitionsJson(data)
  } catch (err) {
    console.error(`Invalid JSON structure: ${err.message}`)
    process.exit(1)
  }

  const db = openDbRW()
  try {
    importFieldDefinitions(db, data)
    console.log(`Successfully imported field definitions for platform: ${data.platform}`)
    console.log(`- Fields: ${data.fields.length}`)
    console.log(`- Dependencies: ${data.dependencies ? data.dependencies.length : 0}`)
  } catch (err) {
    console.error(`Failed to import field definitions: ${err.message}`)
    process.exit(1)
  } finally {
    try { db.close() } catch {}
  }
}

main().catch(err => {
  console.error(err.stack || err)
  process.exit(1)
})
