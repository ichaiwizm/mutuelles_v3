#!/usr/bin/env node
// Unified CLI runner: executes high-level flows with field-definitions + lead + flow
// No DB dependencies - credentials from .env or CLI flags only

import fs from 'node:fs'
import path from 'node:path'
import { runHighLevelFlow } from '../engine/engine.mjs'

function usage() {
  console.log(`Usage:
  admin/cli/run.mjs <platform> <flowSlugOrPath> [options]
  admin/cli/run.mjs <flowSlugOrPath> --fields <fieldsPath> [options]

Arguments:
  platform          Platform slug (ex: alptis, swisslife) - required unless --fields is used
  flowSlugOrPath    Flow slug or full path to .hl.json file

Options:
  --lead <name|path>    Lead file (name or path, default: random from admin/leads/)
  --fields <path>       Explicit path to field-definitions file (makes platform optional)
  --headless            Run in headless mode (default: visible with window kept open)
  --help, -h            Show this help

Examples:
  # Basic usage (credentials from .env, lead random, visible mode)
  admin/cli/run.mjs alptis alptis_sante_select_pro_full

  # With specific lead
  admin/cli/run.mjs alptis alptis_sante_select_pro_full --lead baptiste_deschamps

  # Headless mode (invisible, auto-close)
  admin/cli/run.mjs alptis alptis_sante_select_pro_full --headless

  # Using explicit field-definitions file
  admin/cli/run.mjs my_flow.hl.json --fields admin/field-definitions/custom.json

Credentials (.env file ONLY):
  Create a .env file at project root with:
    ALPTIS_USERNAME=your.email@example.com    (platform-specific, uppercase)
    ALPTIS_PASSWORD=YourPassword

    Or fallback generic:
    FLOW_USERNAME=email@example.com
    FLOW_PASSWORD=Password

  Resolution order (from .env only):
    1. <PLATFORM>_USERNAME / <PLATFORM>_PASSWORD (uppercase)
    2. <platform>_username / <platform>_password (lowercase)
    3. FLOW_USERNAME / FLOW_PASSWORD (generic fallback)

Note: The .env file is never committed to git (already in .gitignore).
`)
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    platform: null,
    flowSlugOrPath: null,
    lead: null,
    headless: false,
    fields: null
  }

  let positionalIndex = 0
  const take = (i) => args[++i]

  for (let i = 0; i < args.length; i++) {
    const a = args[i]

    // Handle flags
    if (a.startsWith('--')) {
      switch (a) {
        case '--lead': opts.lead = take(i); i++; break
        case '--fields': opts.fields = take(i); i++; break
        case '--headless': opts.headless = true; break
        case '--help':
        case '-h': usage(); process.exit(0)
        default: throw new Error('Unknown option: ' + a)
      }
    } else {
      // Positional arguments
      if (positionalIndex === 0) {
        opts.platform = a
        positionalIndex++
      } else if (positionalIndex === 1) {
        opts.flowSlugOrPath = a
        positionalIndex++
      } else {
        throw new Error('Too many positional arguments')
      }
    }
  }

  return opts
}

function findProjectRoot(start) {
  let dir = start
  for (let i = 0; i < 10; i++) {
    const p = path.join(dir, 'package.json')
    if (fs.existsSync(p)) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return process.cwd()
}

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
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
        val = val.slice(1, -1)
      }
      env[key] = val
      // Also set in process.env for engine compatibility
      if (process.env[key] === undefined) process.env[key] = val
    }
    return env
  } catch {
    return {}
  }
}

function platformEnvKeys(slug) {
  const base = String(slug || '').toUpperCase().replace(/[^A-Z0-9]/g, '_')
  return {
    user: [`${base}_USERNAME`, `${slug.toLowerCase()}_username`],
    pass: [`${base}_PASSWORD`, `${slug.toLowerCase()}_password`]
  }
}

function getEnvUser(slug, envObj) {
  const { user } = platformEnvKeys(slug)
  for (const k of user) {
    if (envObj[k] && envObj[k].length) return envObj[k]
  }
  return null
}

function getEnvPass(slug, envObj) {
  const { pass } = platformEnvKeys(slug)
  for (const k of pass) {
    if (envObj[k] && envObj[k].length) return envObj[k]
  }
  return null
}

function resolveFieldsFile(rootDir, platform, fieldsOption) {
  // Si --fields est fourni, utiliser ce chemin
  if (fieldsOption) {
    const resolved = path.resolve(fieldsOption)
    if (!fs.existsSync(resolved)) {
      throw new Error(`Field definitions file not found: ${resolved}`)
    }
    return resolved
  }

  // Sinon, utiliser platform
  if (!platform) {
    throw new Error('Either --fields or platform argument is required')
  }

  const fieldsFile = path.join(rootDir, 'admin', 'field-definitions', `${platform}.json`)
  if (!fs.existsSync(fieldsFile)) {
    throw new Error(`Field definitions not found: ${fieldsFile}`)
  }
  return fieldsFile
}

function resolveFlowFile(rootDir, platform, flowSlugOrPath) {
  // If it's a path (contains / or \), resolve it
  if (flowSlugOrPath.includes('/') || flowSlugOrPath.includes('\\')) {
    const resolved = path.resolve(flowSlugOrPath)
    if (!fs.existsSync(resolved)) {
      throw new Error(`Flow file not found: ${resolved}`)
    }
    return resolved
  }

  // Otherwise, it's a slug - construct path (requires platform)
  if (!platform) {
    throw new Error('Platform is required when using flow slug (or use full path with --fields)')
  }

  const flowFile = path.join(rootDir, 'admin', 'flows', platform, `${flowSlugOrPath}.hl.json`)
  if (!fs.existsSync(flowFile)) {
    throw new Error(`Flow file not found: ${flowFile}\nTip: Use full path or ensure flow slug exists`)
  }
  return flowFile
}

function resolveLeadFile(rootDir, leadOption) {
  // If --lead provided
  if (leadOption) {
    // If it's a path, resolve it
    if (leadOption.includes('/') || leadOption.includes('\\')) {
      const resolved = path.resolve(leadOption)
      if (!fs.existsSync(resolved)) {
        throw new Error(`Lead file not found: ${resolved}`)
      }
      return resolved
    }

    // Otherwise, it's a name - look in admin/leads/
    const leadFile = path.join(rootDir, 'admin', 'leads', `${leadOption}.json`)
    if (!fs.existsSync(leadFile)) {
      throw new Error(`Lead file not found: ${leadFile}`)
    }
    return leadFile
  }

  // No --lead provided: pick random from admin/leads/
  const leadsDir = path.join(rootDir, 'admin', 'leads')
  if (!fs.existsSync(leadsDir)) {
    throw new Error(`Leads directory not found: ${leadsDir}`)
  }

  const files = fs.readdirSync(leadsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(leadsDir, f))

  if (files.length === 0) {
    throw new Error(`No lead files found in ${leadsDir}`)
  }

  const randomFile = files[Math.floor(Math.random() * files.length)]
  console.log(`[run] Using random lead: ${path.basename(randomFile)}`)
  return randomFile
}

function resolveCredentials(platform, envObj) {
  // Priority 1: Platform-specific env (uppercase + lowercase)
  const envUser = getEnvUser(platform, envObj)
  const envPass = getEnvPass(platform, envObj)
  if (envUser && envPass) {
    return { username: envUser, password: envPass }
  }

  // Priority 2: Generic env fallback
  const genericUser = envObj.FLOW_USERNAME || null
  const genericPass = envObj.FLOW_PASSWORD || null
  if (genericUser && genericPass) {
    return { username: genericUser, password: genericPass }
  }

  // Not found
  throw new Error(
    `Credentials not found for platform '${platform}' in .env file.\n` +
    `Please add to .env at project root:\n` +
    `  ${platform.toUpperCase()}_USERNAME=your.email@example.com\n` +
    `  ${platform.toUpperCase()}_PASSWORD=YourPassword\n` +
    `Or use generic fallback:\n` +
    `  FLOW_USERNAME=email@example.com\n` +
    `  FLOW_PASSWORD=Password`
  )
}

async function main() {
  const opts = parseArgs()

  if (!opts.flowSlugOrPath) {
    console.error('Error: Missing required argument <flowSlugOrPath>\n')
    usage()
    process.exit(2)
  }

  if (!opts.platform && !opts.fields) {
    console.error('Error: Either <platform> or --fields must be provided\n')
    usage()
    process.exit(2)
  }

  const rootDir = findProjectRoot(process.cwd())

  // Load .env into object
  const envObj = loadDotEnv(rootDir)

  // Resolve files
  const fieldsFile = resolveFieldsFile(rootDir, opts.platform, opts.fields)
  const flowFile = resolveFlowFile(rootDir, opts.platform, opts.flowSlugOrPath)
  const leadFile = resolveLeadFile(rootDir, opts.lead)

  // Resolve credentials from .env object only
  // Si --fields est utilisé sans platform, déduire platform du flow ou utiliser FLOW_*
  const platformForCreds = opts.platform || 'FLOW'
  const { username, password } = resolveCredentials(platformForCreds, envObj)

  // Determine mode and keepOpen (automatic behavior)
  const mode = opts.headless ? 'headless' : 'dev_private'
  const keepOpen = opts.headless ? false : true

  console.log('[run] Configuration:')
  console.log(`  Platform: ${opts.platform}`)
  console.log(`  Fields: ${path.relative(rootDir, fieldsFile)}`)
  console.log(`  Flow: ${path.relative(rootDir, flowFile)}`)
  console.log(`  Lead: ${path.relative(rootDir, leadFile)}`)
  console.log(`  User: ${String(username).slice(0, 3)}***`)
  console.log(`  Mode: ${mode}`)
  console.log(`  Keep open: ${keepOpen}`)
  console.log('')

  try {
    await runHighLevelFlow({
      fieldsFile,
      flowFile,
      leadFile,
      username,
      password,
      mode,
      keepOpen,
      outRoot: 'admin/runs-cli',
      dom: 'all'           // Capture DOM à chaque step
    })

    console.log('[run] ✓ Execution completed successfully')
  } catch (err) {
    console.error('[run] ✗ Execution failed:', err.message)
    if (err.stack) console.error(err.stack)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal error:', err.stack || err)
  process.exit(1)
})
