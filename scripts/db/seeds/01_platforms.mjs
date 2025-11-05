#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default {
  name: 'platforms',
  description: 'Seed platforms (Alptis, SwissLife) with minimal info',
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

    const platforms = [
      {
        slug: 'alptis',
        name: 'Alptis',
        status: 'ready',
        base_url: 'https://pro.alptis.org/',
        website_url: 'https://www.alptis.org/'
      },
      {
        slug: 'swisslifeone',
        name: 'Swiss Life One',
        status: 'ready',
        base_url: null,
        website_url: 'https://www.swisslife.fr/'
      }
    ]

    const insertPlatform = db.prepare(`
      INSERT INTO platforms_catalog(
        slug, name, status, base_url, website_url, selected
      ) VALUES(?, ?, ?, ?, ?, ?)
    `)

    let totalInserted = 0

    const transaction = db.transaction(() => {
      for (const platform of platforms) {
        try {
          insertPlatform.run(
            platform.slug,
            platform.name,
            platform.status,
            platform.base_url,
            platform.website_url,
            1
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
