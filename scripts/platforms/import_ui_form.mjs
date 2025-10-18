#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { openDbRW } from '../flows/lib/flows_io.mjs'

function usage() {
  console.log(`Usage:
  node scripts/platforms/import_ui_form.mjs <file.json>

Import UI form definition from JSON file to platforms_catalog.ui_form_json

Example:
  node scripts/platforms/import_ui_form.mjs data/carriers/swisslifeone.ui.json
`)
}

function readUiFormFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const data = JSON.parse(raw)
  validateUiFormJson(data)
  return data
}

function validateUiFormJson(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('JSON root must be an object')
  }
  if (!data.platform || typeof data.platform !== 'string') {
    throw new Error('Missing required field: platform (string)')
  }
  if (!data.version || typeof data.version !== 'number') {
    throw new Error('Missing required field: version (number)')
  }
  if (!Array.isArray(data.sections) || data.sections.length === 0) {
    throw new Error('Missing required field: sections (non-empty array)')
  }
  // Basic per-section validation
  for (const s of data.sections) {
    if (!s || typeof s !== 'object') throw new Error('Invalid section object')
    if (!s.id || typeof s.id !== 'string') throw new Error('Section missing id (string)')
    if (!Array.isArray(s.fields)) throw new Error(`Section ${s.id}: fields must be an array`)
    for (const f of s.fields) {
      if (!f || typeof f !== 'object') throw new Error(`Section ${s.id}: invalid field object`)
      if (!f.domainKey || typeof f.domainKey !== 'string') throw new Error(`Section ${s.id}: field missing domainKey`)
      if (!f.widget || typeof f.widget !== 'string') throw new Error(`Section ${s.id}: field missing widget`)
    }
  }
}

function importUiForm(db, data) {
  const plat = db.prepare('SELECT id FROM platforms_catalog WHERE slug = ?').get(data.platform)
  if (!plat) {
    throw new Error(`Plateforme introuvable: ${data.platform}`)
  }

  const res = db.prepare(`
    UPDATE platforms_catalog
    SET ui_form_json = ?, updated_at = datetime('now')
    WHERE slug = ?
  `).run(JSON.stringify(data, null, 2), data.platform)

  if (res.changes === 0) {
    throw new Error(`Échec mise à jour ui_form_json pour ${data.platform}`)
  }

  return { platform: data.platform, sections: data.sections.length }
}

async function main() {
  const file = process.argv[2]
  if (!file) { usage(); process.exit(1) }
  const abs = path.resolve(file)
  if (!fs.existsSync(abs)) {
    console.error(`Fichier introuvable: ${abs}`)
    process.exit(1)
  }

  try {
    const data = readUiFormFile(abs)
    const db = openDbRW()
    try {
      const out = importUiForm(db, data)
      console.log(`✓ UI form importé pour: ${out.platform}`)
      console.log(`  Sections: ${out.sections}`)
    } finally { try { db.close() } catch {} }
  } catch (err) {
    console.error(`ERREUR: ${err.message}`)
    process.exit(1)
  }
}

main().catch(err => { console.error(err.stack || err); process.exit(1) })

