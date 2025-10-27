#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

let app = null
try {
  if (process.env.ELECTRON_RUN_AS_NODE !== '1') {
    const electron = await import('electron')
    app = electron.app
  }
} catch (err) {
}

export default {
  name: 'profiles',
  description: 'Seed Chrome profiles for testing',
  required: false,

  async run(db, options = {}) {
    const { skipExisting = true } = options

    if (skipExisting) {
      const existingCount = db.prepare('SELECT COUNT(*) as c FROM profiles').get().c
      if (existingCount > 0) {
        console.log('     Profiles already seeded, skipping...')
        return { count: existingCount, skipped: true }
      }
    }

    const insertProfile = db.prepare(`
      INSERT INTO profiles(name, user_data_dir, browser_channel, created_at, initialized_at)
      VALUES(?, ?, ?, datetime('now'), datetime('now'))
    `)

    const profile = {
      name: 'Profil Test',
      browser_channel: 'chrome'
    }

    let inserted = 0

    const transaction = db.transaction(() => {
      try {
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
    })

    transaction()

    return { count: inserted }
  }
}

function createProfileDir(profileName) {
  let profilesBaseDir
  if (app && app.getPath) {
    profilesBaseDir = path.join(app.getPath('userData'), 'profiles')
  } else {
    const appDataPath = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    profilesBaseDir = path.join(appDataPath, 'mutuelles_v3', 'profiles')
  }

  fs.mkdirSync(profilesBaseDir, { recursive: true })

  const slug = profileName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const timestamp = Date.now()
  const profileDir = path.join(profilesBaseDir, `${slug}-${timestamp}`)

  fs.mkdirSync(profileDir, { recursive: true })

  const defaultDir = path.join(profileDir, 'Default')
  fs.mkdirSync(defaultDir, { recursive: true })

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