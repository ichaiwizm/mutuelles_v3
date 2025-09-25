#!/usr/bin/env node
import path from 'node:path'
import fs from 'node:fs'
import { getFlowsDir, writeJsonFile, getFlowFromDb, listFlowsFromDb, openDbRW } from './lib/flows_io.mjs'

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { all: false, outDir: null, slug: null }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    const next = () => args[++i]
    if (a === '--all') opts.all = true
    else if (a === '--slug') opts.slug = next()
    else if (a === '--out') opts.outDir = next()
    else if (!a.startsWith('--')) opts.slug = a
  }
  return opts
}

function usage() {
  console.log(`Usage:\n  node scripts/flows/export_flow.mjs --slug <slug> [--out flows]\n  node scripts/flows/export_flow.mjs --all [--out flows]`)
}

async function main() {
  const opts = parseArgs()
  if (!opts.all && !opts.slug) { usage(); process.exit(1) }
  const outDir = opts.outDir || getFlowsDir()
  fs.mkdirSync(outDir, { recursive: true })
  const db = openDbRW()
  try {
    if (opts.all) {
      const items = listFlowsFromDb(db, { includeInactive: true })
      if (items.length === 0) { console.log('No flows in DB.'); return }
      for (const it of items) {
        const f = getFlowFromDb(db, it.slug)
        const file = path.join(outDir, f.platform, `${f.slug}.json`)
        writeJsonFile(file, f)
        console.log('Exported', file)
      }
    } else {
      const f = getFlowFromDb(db, opts.slug)
      if (!f) throw new Error('Flow not found: ' + opts.slug)
      const file = path.join(outDir, f.platform, `${f.slug}.json`)
      writeJsonFile(file, f)
      console.log('Exported', file)
    }
  } finally { try { db.close() } catch {}
  }
}

main().catch(err => { console.error(err.stack || err); process.exit(1) })
