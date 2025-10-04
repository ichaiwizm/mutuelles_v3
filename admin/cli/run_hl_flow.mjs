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
  console.log(`Usage:\n  ELECTRON_RUN_AS_NODE=1 electron admin/cli/run_hl_flow.mjs \\\n+    --platform <slug> \\\n+    --flow admin/flows/<platform>/<slug>.hl.json \\\n+    --lead admin/leads/<lead>.json \\\n+    [--fields admin/field-definitions/<platform>.json] \\\n+    [--mode dev|dev_private|headless]`)
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
  const fields = path.resolve(opts.fields || path.join(root,'admin','field-definitions', `${opts.platform}.json`))
  const flow = path.resolve(opts.flow || '')
  const lead = path.resolve(opts.lead || '')
  if (!fs.existsSync(fields)) { console.error('field-definitions introuvable:', fields); process.exit(2) }
  if (!fs.existsSync(flow)) { console.error('flow introuvable:', flow); process.exit(2) }
  if (!fs.existsSync(lead)) { console.error('lead introuvable:', lead); process.exit(2) }

  // Load .env from project root
  loadDotEnv(root)

  // Credentials resolution priority: DB (safeStorage) > .env per-platform > env vars > temp file
  // NEVER hardcoded credentials in CLI code
  let username = null
  let password = null

  // Priority 1: Database with safeStorage (platform-specific)
  console.log('[hl] Resolving credentials from DB for platform=%s…', opts.platform)
  try {
    const db = openDbRO()
    const plat = getPlatformBySlug(db, opts.platform)
    if (plat) {
      const creds = getCredentials(db, plat.id)
      if (creds?.username && creds?.password_encrypted) {
        let decrypted = null
        if (safeStorage?.isEncryptionAvailable?.()) {
          try {
            decrypted = safeStorage.decryptString(creds.password_encrypted)
            username = creds.username
            password = decrypted
            console.log('[hl] ✓ Using credentials from DB (safeStorage) user=%s***', String(username).slice(0,3))
          } catch (err) {
            console.log('[hl] ✗ safeStorage decryption failed: %s', err.message)
          }
        } else {
          console.log('[hl] ✗ safeStorage not available (Electron context required)')
        }
      }
    }
  } catch (err) {
    console.log('[hl] ✗ DB lookup failed: %s', err.message)
  }

  // Priority 2: .env per-platform (ALPTIS_USERNAME/PASSWORD, etc.)
  if (!username || !password) {
    const envUser = getEnvUser(opts.platform)
    const envPass = getEnvPass(opts.platform)
    if (envUser && envPass) {
      username = envUser
      password = envPass
      console.log('[hl] ✓ Using credentials from .env user=%s***', String(username).slice(0,3))
    }
  }

  // Priority 3: Environment variables (ADMIN_CRED_USER/PASS or FLOW_USERNAME/PASSWORD)
  if (!username || !password) {
    username = username || process.env.ADMIN_CRED_USER || process.env.FLOW_USERNAME || null
    password = password || process.env.ADMIN_CRED_PASS || process.env.FLOW_PASSWORD || null
    if (username && password) {
      console.log('[hl] ✓ Using credentials from env vars user=%s***', String(username).slice(0,3))
    }
  }

  // Priority 4: Temporary file (from parent process)
  if (!username || !password) {
    const credFile = process.env.ADMIN_CRED_FILE || null
    if (credFile) {
      try {
        const raw = fs.readFileSync(credFile, 'utf-8')
        const obj = JSON.parse(raw)
        username = obj?.username || null
        password = obj?.password || null
        console.log('[hl] ✓ Using credentials from temp file user=%s***', String(username||'').slice(0,3))
        try { fs.unlinkSync(credFile) } catch {}
      } catch (e) {
        console.log('[hl] ✗ Failed to read ADMIN_CRED_FILE: %s', String(e?.message||e))
      }
    }
  }

  // Final check
  if (!username || !password) {
    throw new Error(`Identifiants manquants pour ${opts.platform}. Ajoutez-les dans la DB (app UI) ou dans .env (${opts.platform.toUpperCase()}_USERNAME/PASSWORD)`)
  }

  await runHighLevelFlow({ fieldsFile:fields, flowFile:flow, leadFile:lead, username, password, mode:opts.mode, keepOpen: opts.keepOpen })
}

main().catch(e=>{ console.error(e?.stack||e); process.exit(1) })

// ----- helpers: .env loader & per-platform env keys -----
function loadDotEnv(rootDir) {
  try {
    const file = path.join(rootDir, '.env')
    if (!fs.existsSync(file)) return {}
    const content = fs.readFileSync(file, 'utf-8')
    const env = {}
    for (const raw of content.split(/\r?\n/)) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_\.-]*)\s*=\s*(.*)\s*$/)
      if (!m) continue
      const key = m[1]
      let val = m[2]
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) val = val.slice(1, -1)
      env[key] = val
      if (process.env[key] === undefined) process.env[key] = val
    }
    return env
  } catch { return {} }
}

function platformEnvKeys(slug) {
  const base = String(slug || '').toUpperCase().replace(/[^A-Z0-9]/g, '_')
  return {
    user: [ `${base}_USERNAME`, `${slug.toLowerCase()}_username` ],
    pass: [ `${base}_PASSWORD`, `${slug.toLowerCase()}_password` ]
  }
}

function getEnvUser(slug) {
  const { user } = platformEnvKeys(slug)
  for (const k of user) { if (process.env[k] && process.env[k].length) return process.env[k] }
  return null
}
function getEnvPass(slug) {
  const { pass } = platformEnvKeys(slug)
  for (const k of pass) { if (process.env[k] && process.env[k].length) return process.env[k] }
  return null
}
