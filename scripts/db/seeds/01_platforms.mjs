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

    // Check if already seeded
    if (skipExisting) {
      const count = db.prepare('SELECT COUNT(*) as c FROM platforms_catalog').get().c
      if (count > 0) {
        console.log('     Platforms already seeded, skipping...')
        return { count: count, skipped: true }
      }
    }

    // Get project root
    const projectRoot = path.resolve(__dirname, '../../../')

    // Platform configurations
    const platforms = [
      {
        slug: 'alptis',
        name: 'Alptis',
        status: 'ready',
        base_url: 'https://pro.alptis.org/',
        website_url: 'https://www.alptis.org/',
        field_definitions_file: 'admin/field-definitions/alptis.json',
        ui_form_file: 'admin/carriers/alptis.ui.json'
      },
      {
        slug: 'swisslifeone',
        name: 'Swiss Life One',
        status: 'ready',
        base_url: null,
        website_url: 'https://www.swisslife.fr/',
        field_definitions_file: 'admin/field-definitions/swisslifeone.json',
        ui_form_file: 'admin/carriers/swisslifeone.ui.json'
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
          // Load field definitions JSON
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

          // Load UI form JSON
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

          // Prepare value mappings for platform
          let valueMappingsJson = null
          if (platform.slug === 'swisslifeone') {
            // SwissLife specific value mappings
            const valueMappings = {
              // Map ayantDroit field values from domain (1/2) to platform (CLIENT/CONJOINT)
              'slsis_enfant_0_ayant_droit': { '1': 'CLIENT', '2': 'CONJOINT' },
              'slsis_enfant_1_ayant_droit': { '1': 'CLIENT', '2': 'CONJOINT' },
              'slsis_enfant_2_ayant_droit': { '1': 'CLIENT', '2': 'CONJOINT' },
              'slsis_enfant_3_ayant_droit': { '1': 'CLIENT', '2': 'CONJOINT' },
              'slsis_enfant_4_ayant_droit': { '1': 'CLIENT', '2': 'CONJOINT' },
              'slsis_enfant_5_ayant_droit': { '1': 'CLIENT', '2': 'CONJOINT' },
              'slsis_enfant_6_ayant_droit': { '1': 'CLIENT', '2': 'CONJOINT' },
              'slsis_enfant_7_ayant_droit': { '1': 'CLIENT', '2': 'CONJOINT' },
              'slsis_enfant_8_ayant_droit': { '1': 'CLIENT', '2': 'CONJOINT' },
              'slsis_enfant_9_ayant_droit': { '1': 'CLIENT', '2': 'CONJOINT' },
              'slsis_enfant_10_ayant_droit': { '1': 'CLIENT', '2': 'CONJOINT' }
            }
            valueMappingsJson = JSON.stringify(valueMappings)
            console.log(`       Added value mappings for ${platform.slug}`)
          }

          // Insert platform with selected=1 (selected by default)
          insertPlatform.run(
            platform.slug,
            platform.name,
            platform.status,
            platform.base_url,
            platform.website_url,
            1, // selected = true
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
