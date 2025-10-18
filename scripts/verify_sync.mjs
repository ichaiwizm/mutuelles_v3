#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { openDbRW, getProjectRoot, listFlowFiles, readJsonFile, normalizeFlowObject } from './flows/lib/flows_io.mjs'

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

// Normalise un objet JSON pour comparaison
function normalizeJson(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort(), 2)
}

// Compare deux objets JSON
function areJsonEqual(obj1, obj2) {
  return normalizeJson(obj1) === normalizeJson(obj2)
}

// Vérification des flows
function verifyFlows(db) {
  console.log(colorize('\n━━━ FLOWS ━━━', 'bold'))

  const stats = { synced: 0, different: 0, onlyInFiles: 0, onlyInDb: 0 }

  // Récupérer tous les flows depuis les fichiers
  const flowFiles = listFlowFiles()
  const flowsFromFiles = new Map()

  for (const filePath of flowFiles) {
    try {
      const flow = normalizeFlowObject(readJsonFile(filePath))
      flowsFromFiles.set(flow.slug, { flow, filePath })
    } catch (err) {
      console.log(colorize(`  ✗ Erreur lecture ${path.basename(filePath)}: ${err.message}`, 'red'))
    }
  }

  // Récupérer tous les flows depuis la DB
  const flowsFromDb = new Map()
  const dbRows = db.prepare(`
    SELECT f.slug, f.flow_json
    FROM flows_catalog f
    WHERE f.flow_json IS NOT NULL
  `).all()

  for (const row of dbRows) {
    try {
      const flow = normalizeFlowObject(JSON.parse(row.flow_json))
      flowsFromDb.set(row.slug, flow)
    } catch (err) {
      console.log(colorize(`  ✗ Erreur parsing DB flow ${row.slug}: ${err.message}`, 'red'))
    }
  }

  // Comparer
  for (const [slug, fileData] of flowsFromFiles) {
    if (flowsFromDb.has(slug)) {
      const fileFlow = fileData.flow
      const dbFlow = flowsFromDb.get(slug)

      if (areJsonEqual(fileFlow, dbFlow)) {
        console.log(colorize(`  ✓ ${slug}`, 'green'))
        stats.synced++
      } else {
        console.log(colorize(`  ⚠ ${slug} - différences détectées`, 'yellow'))
        stats.different++
      }
    } else {
      console.log(colorize(`  ✗ ${slug} - uniquement dans fichiers`, 'red'))
      stats.onlyInFiles++
    }
  }

  for (const [slug] of flowsFromDb) {
    if (!flowsFromFiles.has(slug)) {
      console.log(colorize(`  ✗ ${slug} - uniquement dans DB`, 'red'))
      stats.onlyInDb++
    }
  }

  console.log(`\n  Synchronisés: ${colorize(stats.synced, 'green')} | Différences: ${colorize(stats.different, 'yellow')} | Fichiers seuls: ${colorize(stats.onlyInFiles, 'red')} | DB seule: ${colorize(stats.onlyInDb, 'red')}`)

  return stats
}

// Vérification des field definitions
function verifyFieldDefinitions(db) {
  console.log(colorize('\n━━━ FIELD DEFINITIONS ━━━', 'bold'))

  const stats = { synced: 0, different: 0, onlyInFiles: 0, onlyInDb: 0 }

  const fieldDefsDir = path.join(getProjectRoot(), 'admin', 'field-definitions')

  // Récupérer tous les field definitions depuis les fichiers
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
  }

  // Récupérer tous les field definitions depuis la DB
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

  // Comparer
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
  console.log(colorize('\n═══ VÉRIFICATION SYNCHRONISATION JSON ↔ DB ═══\n', 'blue'))

  const db = openDbRW()

  try {
    const flowsStats = verifyFlows(db)
    const fieldsStats = verifyFieldDefinitions(db)

    // Résumé global
    const flowsIssues = flowsStats.different + flowsStats.onlyInFiles + flowsStats.onlyInDb
    const fieldsIssues = fieldsStats.different + fieldsStats.onlyInFiles + fieldsStats.onlyInDb
    const totalIssues = flowsIssues + fieldsIssues

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
  console.error(colorize('\nERRERUR:', 'red'), err.message)
  process.exit(1)
})
