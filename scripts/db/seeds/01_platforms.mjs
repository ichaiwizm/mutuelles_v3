#!/usr/bin/env node
export default {
  name: 'platforms',
  description: 'Seed basic platforms (Swisslife, Alptis) with their pages and fields',
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

    const insertPlatform = db.prepare(`INSERT INTO platforms_catalog(slug, name, status) VALUES(?, ?, 'ready')`)
    const insertPage = db.prepare(`INSERT INTO platform_pages(platform_id, slug, name, type, url, status, order_index) VALUES(?, ?, ?, ?, ?, 'ready', ?)`)
    const insertField = db.prepare(`INSERT INTO platform_fields(page_id, key, label, type, required, secure, order_index) VALUES(?, ?, ?, ?, ?, ?, ?)`)
    const insertUserPlatform = db.prepare(`INSERT INTO user_platforms(platform_id, selected) VALUES(?, 1)`)

    const platforms = [
      { slug: 'swisslife', name: 'Swisslife' },
      { slug: 'alptis', name: 'Alptis' }
    ]

    let totalItems = 0

    const transaction = db.transaction(() => {
      for (const p of platforms) {
        // Insert platform
        const info = insertPlatform.run(p.slug, p.name)
        const pid = Number(info.lastInsertRowid)
        totalItems++

        // Select platform by default
        insertUserPlatform.run(pid)

        // Create login page
        const loginUrl = p.slug === 'alptis' ? 'https://pro.alptis.org/' : null
        const loginInfo = insertPage.run(pid, 'login', 'Connexion', 'login', loginUrl, 1)
        const loginId = Number(loginInfo.lastInsertRowid)
        totalItems++

        // Add login fields
        insertField.run(loginId, 'username', 'Identifiant', 'text', 1, 0, 1)
        insertField.run(loginId, 'password', 'Mot de passe', 'password', 1, 1, 2)
        totalItems += 2

        // Create quote form page
        insertPage.run(pid, 'quote_form', 'Formulaire de devis', 'quote_form', null, 2)
        totalItems++
      }
    })

    transaction()

    return { count: totalItems }
  }
}