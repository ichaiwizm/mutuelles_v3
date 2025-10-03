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
  const opts = { platform:null, fields:null, flow:null, lead:null, mode:'headless', keepOpen:false }
  const take = (i)=>args[++i]
  for (let i=0;i<args.length;i++){
    const a = args[i]
    switch(a){
      case '--platform': opts.platform = take(i); i++; break
      case '--fields': opts.fields = take(i); i++; break
      case '--flow': opts.flow = take(i); i++; break
      case '--lead': opts.lead = take(i); i++; break
      case '--mode': opts.mode = take(i); i++; break
      case '--keep-open': opts.keepOpen = true; break
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
  // Credentials from parent via file, then via env, else DB fallback
  let username = null
  let password = null
  const credFile = process.env.ADMIN_CRED_FILE || null
  if (credFile) {
    try {
      const raw = fs.readFileSync(credFile, 'utf-8')
      const obj = JSON.parse(raw)
      username = obj?.username || null
      password = obj?.password || null
      console.log('[hl] using credentials from file (masked) user=%s', String(username||'').slice(0,3)+'***')
      try { fs.unlinkSync(credFile) } catch {}
    } catch (e) {
      console.log('[hl] failed to read ADMIN_CRED_FILE, fallback to env: %s', String(e?.message||e))
    }
  }
  if (!username || !password) {
    username = process.env.ADMIN_CRED_USER || null
    password = process.env.ADMIN_CRED_PASS || null
    if (username && password) console.log('[hl] using credentials from parent env (masked) user=%s', String(username).slice(0,3)+'***')
  }
  if (!username || !password) {
    console.log('[hl] ADMIN_CRED_* not set; resolving credentials from DB…')
    const db = openDbRO()
    const plat = getPlatformBySlug(db, opts.platform)
    const creds = getCredentials(db, plat.id)
    if (!creds?.username || !creds?.password_encrypted) throw new Error('Identifiants introuvables en DB pour '+opts.platform)
    let decrypted = null
    try { if (safeStorage?.isEncryptionAvailable?.() && creds.password_encrypted) { decrypted = safeStorage.decryptString(creds.password_encrypted) } } catch {}
    if (!decrypted) throw new Error('Déchiffrement du mot de passe impossible (safeStorage)')
    username = creds.username
    password = decrypted
  }

  await runHighLevelFlow({ fieldsFile:fields, flowFile:flow, leadFile:lead, username, password, mode:opts.mode, keepOpen: opts.keepOpen })
}

main().catch(e=>{ console.error(e?.stack||e); process.exit(1) })
