#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
}

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`
}

function getProjectRoot() {
  return path.resolve(__dirname, '..')
}

function readJsonFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(content)
}

function normalizeJson(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort(), 2)
}

// Compare deux objets JSON
function areJsonEqual(obj1, obj2) {
  return normalizeJson(obj1) === normalizeJson(obj2)
}

function openDbRW() {
  const dbPath = path.join(getProjectRoot(), 'mutuelles.db')
  return new Database(dbPath, { fileMustExist: true })
}

function verifyFieldDefinitions(db) {
  console.log(colorize('\n━━━ FIELD DEFINITIONS ━━━', 'bold'))

  const stats = { synced: 0, different: 0, onlyInFiles: 0, onlyInDb: 0 }

  // Correction: admin -> data
  const fieldDefsDir = path.join(getProjectRoot(), 'data', 'field-definitions')

  const fieldDefsFromFiles = new Map()

  if (fs.existsSync(fieldDefsDir)) {
    const files = fs.readdirSync(fieldDefsDir).filter(f => f.endsWith('.json'))

    for (const file of files) {
      const filePath = path.join(fieldDefsDir, file)
      try {
        const data = readJsonFile(filePath)
        const platform = data.platform || path.basename(file, '.json')
        fieldDefsFromFiles.set(platform, data)
      } catch (err) {
        console.log(colorize(`  ✗ Erreur lecture ${file}: ${err.message}`, 'red'))
      }
    }
  } else {
    console.log(colorize(`  ⚠ Répertoire ${fieldDefsDir} introuvable`, 'yellow'))
  }

  const fieldDefsFromDb = new Map()
  const dbRows = db.prepare(`
    SELECT slug, field_definitions_json
    FROM platforms_catalog
    WHERE field_definitions_json IS NOT NULL
  `).all()

  for (const row of dbRows) {
    try {
      const data = JSON.parse(row.field_definitions_json)
      fieldDefsFromDb.set(row.slug, data)
    } catch (err) {
      console.log(colorize(`  ✗ Erreur parsing DB ${row.slug}: ${err.message}`, 'red'))
    }
  }

  for (const [platform, fileData] of fieldDefsFromFiles) {
    if (fieldDefsFromDb.has(platform)) {
      const dbData = fieldDefsFromDb.get(platform)

      if (areJsonEqual(fileData, dbData)) {
        console.log(colorize(`  ✓ ${platform}`, 'green'))
        stats.synced++
      } else {
        console.log(colorize(`  ⚠ ${platform} - différences détectées`, 'yellow'))
        stats.different++
      }
    } else {
      console.log(colorize(`  ✗ ${platform} - uniquement dans fichiers`, 'red'))
      stats.onlyInFiles++
    }
  }

  for (const [platform] of fieldDefsFromDb) {
    if (!fieldDefsFromFiles.has(platform)) {
      console.log(colorize(`  ✗ ${platform} - uniquement dans DB`, 'red'))
      stats.onlyInDb++
    }
  }

  console.log(`\n  Synchronisés: ${colorize(stats.synced, 'green')} | Différences: ${colorize(stats.different, 'yellow')} | Fichiers seuls: ${colorize(stats.onlyInFiles, 'red')} | DB seule: ${colorize(stats.onlyInDb, 'red')}`)

  return stats
}

async function main() {
  console.log(colorize('\n═══ VÉRIFICATION SYNCHRONISATION FIELD DEFINITIONS (JSON ↔ DB) ═══\n', 'blue'))
  console.log(colorize('Note: Les flows sont maintenant gérés uniquement en JSON (data/flows/)', 'gray'))

  const db = openDbRW()

  try {
    const fieldsStats = verifyFieldDefinitions(db)

    const totalIssues = fieldsStats.different + fieldsStats.onlyInFiles + fieldsStats.onlyInDb

    console.log(colorize('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bold'))
    if (totalIssues === 0) {
      console.log(colorize('✓ Tout est synchronisé !', 'green'))
    } else {
      console.log(colorize(`⚠ ${totalIssues} problème(s) de synchronisation`, 'yellow'))
    }
    console.log('')

    process.exit(totalIssues > 0 ? 1 : 0)

  } finally {
    try { db.close() } catch {}
  }
}

main().catch(err => {
  console.error(colorize('\nERREUR:', 'red'), err.message)
  process.exit(1)
})
