#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { listFlowFiles, readJsonFile, normalizeFlowObject, upsertFlowInDb, listFlowsFromDb, backupDbFile, getFlowsDir, openDbRW } from './lib/flows_io.mjs'

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { dir: null, apply: false, deactivateMissing: false }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    const next = () => args[++i]
    if (a === '--dir') opts.dir = next()
    else if (a === '--apply') opts.apply = true
    else if (a === '--deactivate-missing') opts.deactivateMissing = true
  }
  return opts
}

function usage() {
  console.log(`Usage:\n  node scripts/flows/sync_flows.mjs [--dir flows] [--apply] [--deactivate-missing]\n  Par défaut dry-run. --apply pour écrire dans la DB.`)
}

async function main() {
  const opts = parseArgs()
  const dir = path.resolve(opts.dir || getFlowsDir())
  const files = listFlowFiles(dir)
  if (files.length === 0) { console.log('No flow files found in', dir); return }

  const db = openDbRW()
  try {
    const inDb = listFlowsFromDb(db, { includeInactive: true })
    const inDbBySlug = Object.fromEntries(inDb.map(f => [f.slug, f]))

    const planned = []
    for (const file of files) {
      const obj = readJsonFile(file)
      const flow = normalizeFlowObject(obj)
      const exists = !!inDbBySlug[flow.slug]
      planned.push({ action: exists ? 'update' : 'add', flow, file })
    }

    const filesSlugs = new Set(planned.map(p => p.flow.slug))
    const toDeactivate = opts.deactivateMissing ? inDb.filter(f => !filesSlugs.has(f.slug) && f.active) : []

    console.log('Plan:')
    for (const p of planned) console.log('-', p.action.toUpperCase(), p.flow.slug, 'from', path.relative(process.cwd(), p.file))
    for (const f of toDeactivate) console.log('- DEACTIVATE', f.slug, '(missing file)')
    if (!opts.apply) { console.log('\nDry-run only. Use --apply to execute.'); return }

    const bak = await backupDbFile('-before-sync')
    console.log('Backup DB:', bak)

    for (const p of planned) {
      upsertFlowInDb(db, p.flow, { mode: p.action })
      console.log(p.action === 'add' ? 'Added' : 'Updated', p.flow.slug)
    }
    if (toDeactivate.length) {
      const stmt = db.prepare('UPDATE flows_catalog SET active=0 WHERE slug=?')
      for (const f of toDeactivate) { stmt.run(f.slug); console.log('Deactivated', f.slug) }
    }
  } finally { try { db.close() } catch {} }
}

main().catch(err => { console.error(err.stack || err); process.exit(1) })
