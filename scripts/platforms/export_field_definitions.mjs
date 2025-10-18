#!/usr/bin/env node
import path from 'node:path'
import fs from 'node:fs'
import { openDbRW, getProjectRoot, ensureDir } from '../flows/lib/flows_io.mjs'

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { all: false, outDir: null, platform: null }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    const next = () => args[++i]
    if (a === '--all') opts.all = true
    else if (a === '--platform') opts.platform = next()
    else if (a === '--out') opts.outDir = next()
    else if (!a.startsWith('--')) opts.platform = a
  }
  return opts
}

function usage() {
  console.log(`Usage:
  node scripts/platforms/export_field_definitions.mjs --platform <slug> [--out dir]
  node scripts/platforms/export_field_definitions.mjs --all [--out dir]

Options:
  --platform <slug>  Exporter les field definitions d'une plateforme
  --all              Exporter toutes les plateformes
  --out <dir>        Répertoire de sortie (défaut: data/field-definitions)

Exemples:
  # Exporter une plateforme
  node scripts/platforms/export_field_definitions.mjs --platform alptis

  # Exporter toutes les plateformes
  node scripts/platforms/export_field_definitions.mjs --all

  # Exporter vers un répertoire custom
  node scripts/platforms/export_field_definitions.mjs --all --out /tmp/field-defs
`)
}

function getFieldDefinitionsDir() {
  return path.join(getProjectRoot(), 'data', 'field-definitions')
}

function exportPlatformFields(db, platformSlug, outDir) {
  const row = db.prepare(`
    SELECT field_definitions_json
    FROM platforms_catalog
    WHERE slug = ?
  `).get(platformSlug)

  if (!row) {
    throw new Error(`Plateforme introuvable: ${platformSlug}`)
  }

  if (!row.field_definitions_json) {
    throw new Error(`Aucune field definition trouvée pour la plateforme: ${platformSlug}`)
  }

  // Parser et re-formater le JSON
  const fieldDefs = JSON.parse(row.field_definitions_json)

  // Écrire dans le fichier
  ensureDir(outDir)
  const filePath = path.join(outDir, `${platformSlug}.json`)
  fs.writeFileSync(filePath, JSON.stringify(fieldDefs, null, 2) + '\n', 'utf-8')

  return {
    filePath,
    fieldsCount: fieldDefs.fields?.length || 0
  }
}

async function main() {
  const opts = parseArgs()
  if (!opts.all && !opts.platform) {
    usage()
    process.exit(1)
  }

  const outDir = opts.outDir || getFieldDefinitionsDir()
  const db = openDbRW()

  try {
    if (opts.all) {
      // Exporter toutes les plateformes avec field definitions
      const rows = db.prepare(`
        SELECT slug
        FROM platforms_catalog
        WHERE field_definitions_json IS NOT NULL
        ORDER BY slug
      `).all()

      if (rows.length === 0) {
        console.log('Aucune plateforme avec field definitions trouvée')
        return
      }

      console.log(`Export de ${rows.length} plateforme(s)...`)
      for (const row of rows) {
        const result = exportPlatformFields(db, row.slug, outDir)
        console.log(`  ✓ ${row.slug} → ${path.relative(process.cwd(), result.filePath)} (${result.fieldsCount} champs)`)
      }
      console.log(`\n✓ ${rows.length} plateforme(s) exportée(s) vers ${outDir}`)
    } else {
      // Exporter une plateforme
      const result = exportPlatformFields(db, opts.platform, outDir)
      console.log(`✓ Field definitions exportées pour: ${opts.platform}`)
      console.log(`  → ${path.relative(process.cwd(), result.filePath)}`)
      console.log(`  Champs: ${result.fieldsCount}`)
    }
  } finally {
    try { db.close() } catch {}
  }
}

main().catch(err => {
  console.error('ERREUR:', err.message)
  process.exit(1)
})
