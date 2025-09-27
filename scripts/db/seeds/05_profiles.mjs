#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Conditional Electron import - only available when running in Electron context
let app = null
try {
  if (process.env.ELECTRON_RUN_AS_NODE !== '1') {
    const electron = await import('electron')
    app = electron.app
  }
} catch (err) {
  // Running in Node.js context, app not available
}

export default {
  name: 'profiles',
  description: 'Seed Chrome profiles for testing',
  required: false,

  async run(db, options = {}) {
    const { skipExisting = true, count = 2 } = options

    // Check if profiles already exist
    if (skipExisting) {
      const existingCount = db.prepare('SELECT COUNT(*) as c FROM profiles').get().c
      if (existingCount > 0) {
        console.log('     Profiles already seeded, skipping...')
        return { count: existingCount, skipped: true }
      }
    }

    const insertProfile = db.prepare(`
      INSERT INTO profiles(name, user_data_dir, browser_channel, created_at)
      VALUES(?, ?, ?, datetime('now'))
    `)

    const testProfiles = [
      {
        name: 'Profil Dev',
        browser_channel: 'chrome'
      },
      {
        name: 'Profil Test',
        browser_channel: 'chrome'
      },
      {
        name: 'Profil Alptis',
        browser_channel: 'chrome'
      }
    ]

    let inserted = 0

    const transaction = db.transaction(() => {
      for (const profile of testProfiles.slice(0, count)) {
        try {
          // Create user data directory
          const userDataDir = createProfileDir(profile.name)

          insertProfile.run(
            profile.name,
            userDataDir,
            profile.browser_channel
          )

          inserted++
          console.log(`     Created profile: ${profile.name}`)
          console.log(`       Directory: ${userDataDir}`)

        } catch (err) {
          console.log(`     Error creating profile ${profile.name}: ${err.message}`)
        }
      }
    })

    transaction()

    return { count: inserted }
  }
}

function createProfileDir(profileName) {
  // Get profiles base directory
  let profilesBaseDir
  if (app && app.getPath) {
    profilesBaseDir = path.join(app.getPath('userData'), 'profiles')
  } else {
    // Fallback to a temporary directory when Electron is not available
    profilesBaseDir = path.join(os.tmpdir(), 'mutuelles-profiles')
  }

  fs.mkdirSync(profilesBaseDir, { recursive: true })

  // Create unique slug for profile directory
  const slug = profileName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const timestamp = Date.now()
  const profileDir = path.join(profilesBaseDir, `${slug}-${timestamp}`)

  // Create profile directory
  fs.mkdirSync(profileDir, { recursive: true })

  // Create basic Chrome profile structure
  const defaultDir = path.join(profileDir, 'Default')
  fs.mkdirSync(defaultDir, { recursive: true })

  // Create minimal Local State file
  const localState = {
    profile: {
      info_cache: {
        Default: {
          name: profileName,
          shortcut_name: profileName
        }
      }
    }
  }

  fs.writeFileSync(
    path.join(profileDir, 'Local State'),
    JSON.stringify(localState, null, 2)
  )

  // Create minimal Preferences file
  const preferences = {
    profile: {
      name: profileName,
      default_content_setting_values: {
        notifications: 2
      }
    },
    browser: {
      check_default_browser: false
    }
  }

  fs.writeFileSync(
    path.join(defaultDir, 'Preferences'),
    JSON.stringify(preferences, null, 2)
  )

  return profileDir
}