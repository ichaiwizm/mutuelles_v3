#!/usr/bin/env node
/**
 * Fix script to auto-select platforms with field definitions
 */

import { openDbRW } from './flows/lib/flows_io.mjs'

function main() {
  console.log('🔧 Auto-selecting platforms with field definitions...\n')

  const db = openDbRW()
  try {
    // Find platforms with field definitions but not selected
    const platforms = db.prepare(`
      SELECT id, slug, name
      FROM platforms_catalog
      WHERE field_definitions_json IS NOT NULL AND selected = 0
    `).all()

    if (platforms.length === 0) {
      console.log('✅ All platforms with field definitions are already selected!')
      return
    }

    console.log(`📋 Found ${platforms.length} platforms to select:`)
    platforms.forEach(p => console.log(`   - ${p.slug} (${p.name})`))
    console.log()

    // Update them
    const stmt = db.prepare(`
      UPDATE platforms_catalog
      SET selected = 1
      WHERE field_definitions_json IS NOT NULL AND selected = 0
    `)

    const result = stmt.run()
    console.log(`✅ Updated ${result.changes} platforms`)
    console.log()

    // Verify
    const selected = db.prepare(`
      SELECT slug, name
      FROM platforms_catalog
      WHERE selected = 1
      ORDER BY slug
    `).all()

    console.log(`📊 Currently selected platforms: ${selected.length}`)
    selected.forEach(p => console.log(`   ✓ ${p.slug} (${p.name})`))
    console.log()
    console.log('✅ Done! You can now run: npm run platforms:test')

  } finally {
    try { db.close() } catch {}
  }
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
