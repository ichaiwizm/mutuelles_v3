#!/usr/bin/env node
import path from 'node:path'
import { listFlowFiles, readJsonFile, normalizeFlowObject, getFlowsDir } from './lib/flows_io.mjs'

function usage() {
  console.log(`Usage:\n  node scripts/flows/lint_flows.mjs [dir]`)
}

async function main() {
  const dir = process.argv[2] ? path.resolve(process.argv[2]) : getFlowsDir()
  const files = listFlowFiles(dir)
  if (files.length === 0) { console.log('No flow files found in', dir); return }
  let errors = 0
  for (const file of files) {
    try {
      const obj = readJsonFile(file)
      normalizeFlowObject(obj)
      console.log('OK', file)
    } catch (e) {
      errors++
      console.error('ERR', file, '\n ', e.message)
    }
  }
  if (errors > 0) process.exit(2)
}

main().catch(err => { console.error(err.stack || err); process.exit(1) })

