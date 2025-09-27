#!/usr/bin/env node

// Conditional Electron import - only available when running in Electron context
let safeStorage = null
try {
  if (process.env.ELECTRON_RUN_AS_NODE !== '1') {
    const electron = await import('electron')
    safeStorage = electron.safeStorage
  }
} catch (err) {
  // Running in Node.js context, safeStorage not available
}

export default {
  name: 'credentials',
  description: 'Seed platform credentials from environment variables',
  required: false,

  async run(db, options = {}) {
    const { skipExisting = true, force = false } = options

    // Check if credentials already exist
    if (skipExisting && !force) {
      const existingCount = db.prepare('SELECT COUNT(*) as c FROM platform_credentials').get().c
      if (existingCount > 0) {
        console.log('     Credentials already seeded, skipping...')
        return { count: existingCount, skipped: true }
      }
    }

    // Check if safeStorage is available
    if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
      console.log('     Encryption not available (safeStorage), skipping credentials seeding')
      return { count: 0, skipped: true, reason: 'encryption_unavailable' }
    }

    // Get platform mappings
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

    // Credential mappings from environment variables
    const credentialMappings = [
      {
        platform: 'alptis',
        username_env: 'ALPTIS_USERNAME',
        password_env: 'ALPTIS_PASSWORD'
      },
      {
        platform: 'swisslife',
        username_env: 'SWISSLIFE_USERNAME',
        password_env: 'SWISSLIFE_PASSWORD'
      }
    ]

    const transaction = db.transaction(() => {
      for (const mapping of credentialMappings) {
        const username = process.env[mapping.username_env]
        const password = process.env[mapping.password_env]

        if (username && password) {
          const platformId = platformBySlug[mapping.platform]

          if (platformId) {
            try {
              const encryptedPassword = safeStorage.encryptString(password)

              insertCredential.run(platformId, username, encryptedPassword)
              inserted++

              console.log(`     Added credentials for ${mapping.platform} (${username})`)
            } catch (err) {
              console.log(`     Error encrypting password for ${mapping.platform}: ${err.message}`)
            }
          } else {
            console.log(`     Platform not found: ${mapping.platform}`)
          }
        } else {
          console.log(`     Credentials not found in environment for ${mapping.platform}`)
          console.log(`       Expected: ${mapping.username_env} and ${mapping.password_env}`)
        }
      }
    })

    if (inserted > 0) {
      transaction()
    }

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