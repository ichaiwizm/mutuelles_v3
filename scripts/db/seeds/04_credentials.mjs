#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

let safeStorage = null
try {
  if (process.env.ELECTRON_RUN_AS_NODE !== '1') {
    const electron = await import('electron')
    safeStorage = electron.safeStorage
  }
} catch (err) {
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadDotEnv() {
  try {
    const projectRoot = path.resolve(__dirname, '../../../')
    const envFile = path.join(projectRoot, '.env')

    if (!fs.existsSync(envFile)) {
      console.log('     No .env file found, using system environment variables')
      return {}
    }

    const content = fs.readFileSync(envFile, 'utf-8')
    const env = {}
    let loadedCount = 0

    for (const raw of content.split(/\r?\n/)) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue

      const equalIndex = line.indexOf('=')
      if (equalIndex === -1) continue

      const key = line.substring(0, equalIndex).trim()
      let val = line.substring(equalIndex + 1).trim()

      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }

      env[key] = val
      process.env[key] = val
      loadedCount++
    }

    console.log(`     Loaded .env file successfully (${loadedCount} variables)`)

    const credKeys = ['ALPTIS_USERNAME', 'ALPTIS_PASSWORD', 'SWISSLIFE_USERNAME', 'SWISSLIFE_PASSWORD']
    for (const key of credKeys) {
      if (env[key]) {
        console.log(`       Found ${key}: ${env[key].substring(0, 3)}...`)
      }
    }

    return env
  } catch (err) {
    console.log('     Error loading .env:', err.message)
    return {}
  }
}

export default {
  name: 'credentials',
  description: 'Seed platform credentials from environment variables',
  required: false,

  async run(db, options = {}) {
    const { skipExisting = true, force = false } = options

    loadDotEnv()

    if (skipExisting && !force) {
      const existingCount = db.prepare('SELECT COUNT(*) as c FROM platform_credentials').get().c
      if (existingCount > 0) {
        console.log('     Credentials already seeded, skipping...')
        return { count: existingCount, skipped: true }
      }
    }

    const useBasicEncoding = !safeStorage || !safeStorage.isEncryptionAvailable()

    if (useBasicEncoding) {
      console.log('     Using basic encoding for CLI mode (passwords will need re-encryption in app)')
    }

    const platformRows = db.prepare('SELECT id, slug FROM platforms_catalog').all()
    const platformBySlug = Object.fromEntries(platformRows.map(p => [p.slug, p.id]))

    const insertCredential = db.prepare(`
      INSERT INTO platform_credentials(platform_id, username, password_encrypted, updated_at)
      VALUES(?, ?, ?, datetime('now'))
      ON CONFLICT(platform_id) DO UPDATE SET
        username=excluded.username,
        password_encrypted=excluded.password_encrypted,
        updated_at=excluded.updated_at
    `)

    let inserted = 0

    const credentialMappings = [
      {
        platform: 'alptis',
        username_env: 'ALPTIS_USERNAME',
        password_env: 'ALPTIS_PASSWORD'
      },
      {
        platform: 'swisslifeone',
        username_env: 'SWISSLIFEONE_USERNAME',
        password_env: 'SWISSLIFEONE_PASSWORD'
      }
    ]

    const transaction = db.transaction(() => {
      for (const mapping of credentialMappings) {
        const username = process.env[mapping.username_env]
        const password = process.env[mapping.password_env]

        console.log(`     Checking ${mapping.platform}:`)
        console.log(`       Looking for ${mapping.username_env}: ${username ? 'FOUND' : 'NOT FOUND'}`)
        console.log(`       Looking for ${mapping.password_env}: ${password ? 'FOUND' : 'NOT FOUND'}`)

        if (username && password) {
          const platformId = platformBySlug[mapping.platform]
          console.log(`       Platform ID for ${mapping.platform}: ${platformId}`)

          if (platformId) {
            try {
              let encryptedPassword

              if (useBasicEncoding) {
                encryptedPassword = Buffer.from(`CLI_ENCODED:${password}`, 'utf8')
              } else {
                encryptedPassword = safeStorage.encryptString(password)
              }

              insertCredential.run(platformId, username, encryptedPassword)
              inserted++

              console.log(`     Added credentials for ${mapping.platform} (${username})`)
            } catch (err) {
              console.log(`     Error encrypting password for ${mapping.platform}: ${err.message}`)
            }
          } else {
            console.log(`     Platform not found: ${mapping.platform}`)
            console.log(`       Available platforms: ${Object.keys(platformBySlug).join(', ')}`)
          }
        } else {
          console.log(`     Credentials incomplete for ${mapping.platform}`)
          if (!username) console.log(`       Missing ${mapping.username_env}`)
          if (!password) console.log(`       Missing ${mapping.password_env}`)
        }
      }
    })

    transaction()

    if (inserted === 0) {
      console.log('     No credentials found in environment variables')
      console.log('     To seed credentials, set environment variables:')
      for (const mapping of credentialMappings) {
        console.log(`       - ${mapping.username_env}=your_username`)
        console.log(`       - ${mapping.password_env}=your_password`)
      }
    }

    return { count: inserted }
  }
}