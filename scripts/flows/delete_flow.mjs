#!/usr/bin/env node
import { backupDbFile, softDeleteFlow, hardDeleteFlow, openDbRW } from './lib/flows_io.mjs'

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { slug: null, hard: false }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    const next = () => args[++i]
    if (a === '--slug') opts.slug = next()
    else if (a === '--hard') opts.hard = true
    else if (!a.startsWith('--')) opts.slug = a
  }
  return opts
}

function usage() {
  console.log(`Usage:\n  node scripts/flows/delete_flow.mjs --slug <slug> [--hard]\n  Par défaut: soft delete (active=0). --hard supprime définitivement (efface aussi steps et historique).`)
}

async function main() {
  const opts = parseArgs()
  if (!opts.slug) { usage(); process.exit(1) }
  const db = openDbRW()
  try {
    if (opts.hard) {
      const bak = await backupDbFile('-before-hard-delete')
      console.log('Backup DB:', bak)
      hardDeleteFlow(db, opts.slug)
      console.log('Hard-deleted flow:', opts.slug)
    } else {
      softDeleteFlow(db, opts.slug)
      console.log('Soft-deleted (active=0):', opts.slug)
    }
  } finally { try { db.close() } catch {} }
}

main().catch(err => { console.error(err.stack || err); process.exit(1) })
