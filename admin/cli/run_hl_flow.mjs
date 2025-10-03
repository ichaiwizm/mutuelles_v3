#!/usr/bin/env node
// Run high-level flow: fields-definitions + lead + flow
import fs from 'node:fs'
import path from 'node:path'
import { runHighLevelFlow } from '../engine/hl_engine.mjs'
import { createRequire } from 'node:module'
const __require = createRequire(import.meta.url)
let safeStorage
try { ({ safeStorage } = __require('electron')) } catch { safeStorage = null }
import { openDbRO, getPlatformBySlug, getCredentials } from './lib/db_readers.mjs'

function usage(){
  console.log(`Usage:\n  ELECTRON_RUN_AS_NODE=1 electron admin/cli/run_hl_flow.mjs --platform <slug> --flow flows/<platform>/<slug>.hl.json --lead leads/<platform>/<lead>.json [--fields field-definitions/<platform>.json] [--mode dev|dev_private|headless]`)
}

function parseArgs(){
  const args = process.argv.slice(2)
  const opts = { platform:null, fields:null, flow:null, lead:null, mode:'headless' }
  const take = (i)=>args[++i]
  for (let i=0;i<args.length;i++){
    const a = args[i]
    switch(a){
      case '--platform': opts.platform = take(i); i++; break
      case '--fields': opts.fields = take(i); i++; break
      case '--flow': opts.flow = take(i); i++; break
      case '--lead': opts.lead = take(i); i++; break
      case '--mode': opts.mode = take(i); i++; break
      case '--help': case '-h': usage(); process.exit(0)
      default: if (!a.startsWith('--')) { opts.flow = a } else throw new Error('Option inconnue: '+a)
    }
  }
  return opts
}

function findProjectRoot(start){ let dir=start; for(let i=0;i<10;i++){ const p=path.join(dir,'package.json'); if(fs.existsSync(p)) return dir; const parent=path.dirname(dir); if(parent===dir) break; dir=parent } return process.cwd() }

async function main(){
  const opts = parseArgs()
  if (!opts.platform && !opts.fields) { console.error('--platform ou --fields requis'); usage(); process.exit(2) }
  const root = findProjectRoot(process.cwd())
  const fields = path.resolve(opts.fields || path.join(root,'field-definitions', `${opts.platform}.json`))
  const flow = path.resolve(opts.flow || '')
  const lead = path.resolve(opts.lead || '')
  if (!fs.existsSync(fields)) { console.error('field-definitions introuvable:', fields); process.exit(2) }
  if (!fs.existsSync(flow)) { console.error('flow introuvable:', flow); process.exit(2) }
  if (!fs.existsSync(lead)) { console.error('lead introuvable:', lead); process.exit(2) }
  // Resolve credentials from DB only
  const db = openDbRO()
  const plat = getPlatformBySlug(db, opts.platform)
  const creds = getCredentials(db, plat.id)
  if (!creds?.username || !creds?.password_encrypted) throw new Error('Identifiants introuvables en DB pour '+opts.platform)
  let password = null
  try { if (safeStorage?.isEncryptionAvailable?.() && creds.password_encrypted) { password = safeStorage.decryptString(creds.password_encrypted) } } catch {}
  if (!password) throw new Error('Déchiffrement du mot de passe impossible (safeStorage)')
  const username = creds.username

  await runHighLevelFlow({ fieldsFile:fields, flowFile:flow, leadFile:lead, username, password, mode:opts.mode })
}

main().catch(e=>{ console.error(e?.stack||e); process.exit(1) })
