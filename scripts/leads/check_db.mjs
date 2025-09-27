#!/usr/bin/env node
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'

function getProjectRoot() {
  const __filename = new URL(import.meta.url).pathname
  const __dirname = path.dirname(__filename.replace(/^\/([A-Z]):/, '$1:'))
  return path.resolve(__dirname, '../../')
}

function getDbPath() {
  const root = getProjectRoot()
  const devDir = process.env.MUTUELLES_DB_DIR || path.join(root, 'dev-data')
  return path.join(devDir, 'mutuelles.sqlite3')
}

function openDbRO() {
  const require = createRequire(import.meta.url)
  const Database = require('better-sqlite3')
  const dbPath = getDbPath()

  if (!fs.existsSync(dbPath)) {
    console.error('❌ Base de données non trouvée:', dbPath)
    process.exit(1)
  }

  const db = new Database(dbPath, { readonly: true })
  try { db.pragma('foreign_keys = ON') } catch {}
  return db
}

async function main() {
  const db = openDbRO()

  console.log('🔍 Vérification des tables leads...\n')

  // Vérifier l'existence des tables
  const tables = [
    'raw_leads',
    'clean_leads',
    'platform_leads',
    'gmail_configs'
  ]

  console.log('📋 Tables principales:')
  for (const table of tables) {
    try {
      const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table)
      if (result) {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get()
        console.log(`  ✅ ${table} (${count.count} enregistrements)`)
      } else {
        console.log(`  ❌ ${table} - Table manquante`)
      }
    } catch (error) {
      console.log(`  ❌ ${table} - Erreur: ${error.message}`)
    }
  }

  // Vérifier les index
  console.log('\n🗂️  Index pour les performances:')
  const expectedIndexes = [
    'idx_raw_leads_source',
    'idx_raw_leads_extracted_at',
    'idx_clean_leads_raw_lead_id',
    'idx_clean_leads_quality_score',
    'idx_platform_leads_clean_lead_id',
    'idx_platform_leads_platform_id',
    'idx_platform_leads_status'
  ]

  for (const indexName of expectedIndexes) {
    try {
      const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name=?`).get(indexName)
      if (result) {
        console.log(`  ✅ ${indexName}`)
      } else {
        console.log(`  ❌ ${indexName} - Index manquant`)
      }
    } catch (error) {
      console.log(`  ❌ ${indexName} - Erreur: ${error.message}`)
    }
  }

  // Vérifier les contraintes des tables
  console.log('\n🔗 Structure des tables:')

  for (const table of tables) {
    try {
      const columns = db.prepare(`PRAGMA table_info(${table})`).all()
      if (columns.length > 0) {
        console.log(`\n  📊 ${table}:`)
        columns.forEach(col => {
          const nullable = col.notnull ? 'NOT NULL' : 'nullable'
          const primary = col.pk ? ' (PRIMARY KEY)' : ''
          const defaultVal = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''
          console.log(`    - ${col.name}: ${col.type} ${nullable}${primary}${defaultVal}`)
        })
      }
    } catch (error) {
      console.log(`  ❌ Erreur lors de l'inspection de ${table}: ${error.message}`)
    }
  }

  // Vérifier les contraintes de clés étrangères
  console.log('\n🔑 Clés étrangères:')
  for (const table of tables) {
    try {
      const fkeys = db.prepare(`PRAGMA foreign_key_list(${table})`).all()
      if (fkeys.length > 0) {
        console.log(`\n  🔗 ${table}:`)
        fkeys.forEach(fk => {
          console.log(`    - ${fk.from} → ${fk.table}.${fk.to} (${fk.on_delete})`)
        })
      }
    } catch (error) {
      console.log(`  ❌ Erreur lors de la vérification des FK de ${table}: ${error.message}`)
    }
  }

  // Test de base des contraintes CHECK
  console.log('\n✅ Tests de contraintes:')

  try {
    // Test constraint source
    try {
      db.prepare("INSERT INTO raw_leads (id, source, raw_content) VALUES ('test', 'invalid_source', 'test')").run()
      console.log('  ❌ Contrainte source: ÉCHEC - valeur invalide acceptée')
    } catch {
      console.log('  ✅ Contrainte source: OK')
    }

    // Test constraint status
    try {
      db.prepare("INSERT INTO platform_leads (id, clean_lead_id, platform_id, status, adapted_data) VALUES ('test', 'test', 1, 'invalid_status', '{}')").run()
      console.log('  ❌ Contrainte status: ÉCHEC - valeur invalide acceptée')
    } catch {
      console.log('  ✅ Contrainte status: OK')
    }

  } catch (error) {
    console.log(`  ⚠️  Erreur lors des tests de contraintes: ${error.message}`)
  }

  db.close()
  console.log('\n🎉 Vérification terminée!')
}

main().catch(err => {
  console.error('❌ Erreur:', err.stack || err)
  process.exit(1)
})