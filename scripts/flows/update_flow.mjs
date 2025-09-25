#!/usr/bin/env node
import path from 'node:path'
import { readJsonFile, normalizeFlowObject, upsertFlowInDb, openDbRW } from './lib/flows_io.mjs'

function usage() {
  console.log(`Usage:\n  node scripts/flows/update_flow.mjs <file.json>\n`)
}

async function main() {
  const file = process.argv[2]
  if (!file) { usage(); process.exit(1) }
  const abs = path.resolve(file)
  const obj = readJsonFile(abs)
  const flow = normalizeFlowObject(obj)
  const db = openDbRW()
  try {
    upsertFlowInDb(db, flow, { mode: 'update' })
    console.log('Updated flow:', flow.slug)
  } finally { try { db.close() } catch {} }
}

main().catch(err => { console.error(err.stack || err); process.exit(1) })
