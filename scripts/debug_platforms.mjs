#!/usr/bin/env node
/**
 * Debug script to check platforms_catalog state
 */

import { openDbRW } from './flows/lib/flows_io.mjs'

function main() {
  console.log('🔍 Checking platforms_catalog state...\n')

  const db = openDbRW()
  try {
    // Check all platforms
    const platforms = db.prepare(`
      SELECT
        id,
        slug,
        name,
        selected,
        CASE
          WHEN field_definitions_json IS NOT NULL THEN 'YES'
          ELSE 'NO'
        END as has_field_defs,
        CASE
          WHEN value_mappings_json IS NOT NULL THEN 'YES'
          ELSE 'NO'
        END as has_value_mappings
      FROM platforms_catalog
      ORDER BY id
    `).all()

    console.log('📊 Platforms in database:')
    console.log('─'.repeat(80))
    platforms.forEach(p => {
      console.log(`ID: ${p.id} | Slug: ${p.slug.padEnd(15)} | Selected: ${p.selected} | FieldDefs: ${p.has_field_defs} | ValueMaps: ${p.has_value_mappings}`)
    })
    console.log('─'.repeat(80))
    console.log()

    // Show platforms with field definitions
    const withFieldDefs = platforms.filter(p => p.has_field_defs === 'YES')
    console.log(`✅ Platforms with field definitions: ${withFieldDefs.length}`)
    withFieldDefs.forEach(p => console.log(`   - ${p.slug} (selected: ${p.selected})`))
    console.log()

    // Show selected platforms
    const selected = platforms.filter(p => p.selected === 1)
    console.log(`✅ Selected platforms: ${selected.length}`)
    selected.forEach(p => console.log(`   - ${p.slug}`))
    console.log()

    // Show the problem
    const needSelection = platforms.filter(p => p.has_field_defs === 'YES' && p.selected === 0)
    if (needSelection.length > 0) {
      console.log(`⚠️  PROBLEM: ${needSelection.length} platforms have field definitions but are not selected:`)
      needSelection.forEach(p => console.log(`   - ${p.slug}`))
      console.log()
      console.log('💡 Fix: Run this SQL to select them:')
      needSelection.forEach(p => {
        console.log(`   UPDATE platforms_catalog SET selected = 1 WHERE slug = '${p.slug}';`)
      })
      console.log()
      console.log('Or use: npm run db:seed -- --only platforms')
    }

  } finally {
    try { db.close() } catch {}
  }
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
