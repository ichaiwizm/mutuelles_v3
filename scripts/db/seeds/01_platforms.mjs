#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default {
  name: 'platforms',
  description: 'Seed platforms (Alptis, SwissLife) with their JSON configurations',
  required: true,

  async run(db, options = {}) {
    const { skipExisting = true } = options

    if (skipExisting) {
      const count = db.prepare('SELECT COUNT(*) as c FROM platforms_catalog').get().c
      if (count > 0) {
        console.log('     Platforms already seeded, skipping...')
        return { count: count, skipped: true }
      }
    }

    const projectRoot = path.resolve(__dirname, '../../../')

    const platforms = [
      {
        slug: 'alptis',
        name: 'Alptis',
        status: 'ready',
        base_url: 'https://pro.alptis.org/',
        website_url: 'https://www.alptis.org/',
        field_definitions_file: 'data/field-definitions/alptis.json',
        ui_form_file: 'data/carriers/alptis.ui.json'
      },
      {
        slug: 'swisslifeone',
        name: 'Swiss Life One',
        status: 'ready',
        base_url: null,
        website_url: 'https://www.swisslife.fr/',
        field_definitions_file: 'data/field-definitions/swisslifeone.json',
        ui_form_file: 'data/carriers/swisslifeone.ui.json'
      }
    ]

    const insertPlatform = db.prepare(`
      INSERT INTO platforms_catalog(
        slug, name, status, base_url, website_url,
        selected, field_definitions_json, ui_form_json, value_mappings_json
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    let totalInserted = 0

    const transaction = db.transaction(() => {
      for (const platform of platforms) {
        try {
          let fieldDefinitionsJson = null
          if (platform.field_definitions_file) {
            const fieldDefPath = path.join(projectRoot, platform.field_definitions_file)
            if (fs.existsSync(fieldDefPath)) {
              fieldDefinitionsJson = fs.readFileSync(fieldDefPath, 'utf-8')
              console.log(`       Loaded field definitions for ${platform.slug}`)
            } else {
              console.log(`       ⚠️  Field definitions file not found: ${fieldDefPath}`)
            }
          }

          let uiFormJson = null
          if (platform.ui_form_file) {
            const uiFormPath = path.join(projectRoot, platform.ui_form_file)
            if (fs.existsSync(uiFormPath)) {
              uiFormJson = fs.readFileSync(uiFormPath, 'utf-8')
              console.log(`       Loaded UI form for ${platform.slug}`)
            } else {
              console.log(`       ⚠️  UI form file not found: ${uiFormPath}`)
            }
          }

          // Deprecated: value_mappings_json was used by legacy JSON flows.
          // New architecture maps values directly in TypeScript selectors.
          // Keep null to avoid storing unused config in DB.
          let valueMappingsJson = null

          insertPlatform.run(
            platform.slug,
            platform.name,
            platform.status,
            platform.base_url,
            platform.website_url,
            1,
            fieldDefinitionsJson,
            uiFormJson,
            valueMappingsJson
          )

          totalInserted++
          console.log(`     ✓ Inserted platform: ${platform.name} (${platform.slug})`)

        } catch (err) {
          console.log(`     ✗ Error inserting platform ${platform.slug}: ${err.message}`)
        }
      }
    })

    transaction()

    return { count: totalInserted }
  }
}
