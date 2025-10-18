#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { openDbRW } from '../flows/lib/flows_io.mjs'

function usage() {
  console.log(`Usage:
  node scripts/platforms/import_field_definitions.mjs <file.json>

Import field definitions from JSON file to platforms_catalog.field_definitions_json

Exemple:
  node scripts/platforms/import_field_definitions.mjs data/field-definitions/alptis.json
`)
}

function readFieldDefinitionsFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const data = JSON.parse(content)

  // Validation basique
  if (!data.platform || typeof data.platform !== 'string') {
    throw new Error('Le fichier doit contenir un champ "platform"')
  }

  if (!Array.isArray(data.fields) || data.fields.length === 0) {
    throw new Error('Le fichier doit contenir un tableau "fields" non vide')
  }

  return data
}

function importFieldDefinitions(db, data) {
  // Vérifier que la plateforme existe
  const platform = db.prepare('SELECT id, slug FROM platforms_catalog WHERE slug = ?').get(data.platform)
  if (!platform) {
    throw new Error(`Plateforme introuvable: ${data.platform}`)
  }

  // Mettre à jour platforms_catalog avec field_definitions_json
  const result = db.prepare(`
    UPDATE platforms_catalog
    SET field_definitions_json = ?, updated_at = datetime('now')
    WHERE slug = ?
  `).run(
    JSON.stringify(data, null, 2),
    data.platform
  )

  if (result.changes === 0) {
    throw new Error(`Échec de la mise à jour des field definitions pour la plateforme: ${data.platform}`)
  }

  return {
    platform: data.platform,
    fieldsCount: data.fields.length
  }
}

async function main() {
  const file = process.argv[2]
  if (!file) {
    usage()
    process.exit(1)
  }

  const absolutePath = path.resolve(file)

  if (!fs.existsSync(absolutePath)) {
    console.error(`Fichier introuvable: ${absolutePath}`)
    process.exit(1)
  }

  try {
    const data = readFieldDefinitionsFile(absolutePath)

    const db = openDbRW()
    try {
      const result = importFieldDefinitions(db, data)
      console.log(`✓ Field definitions importées pour la plateforme: ${result.platform}`)
      console.log(`  Nombre de champs: ${result.fieldsCount}`)
    } finally {
      try { db.close() } catch {}
    }
  } catch (err) {
    console.error(`ERREUR: ${err.message}`)
    process.exit(1)
  }
}

main().catch(err => {
  console.error(err.stack || err)
  process.exit(1)
})
