#!/usr/bin/env node
// Unified CLI runner: executes high-level flows with field-definitions + lead + flow
// No DB dependencies - credentials from .env or CLI flags only

import fs from 'node:fs'
import path from 'node:path'
import { runHighLevelFlow } from '../engine/engine.mjs'

function usage() {
  console.log(`Usage:
  admin/cli/run.mjs <platform> <flowSlugOrPath> [options]

Arguments:
  platform          Platform slug (ex: alptis, swisslife)
  flowSlugOrPath    Flow slug or full path to .hl.json file

Options:
  --lead <name|path>    Lead file (name or path, default: random from admin/leads/)
  --username <user>     Override username
  --password <pass>     Override password
  --headless            Run in headless mode (default: dev_private visible)
  --keep                Force keepOpen=true even in headless
  --no-keep             Force keepOpen=false even in dev_private
  --help, -h            Show this help

Examples:
  # Basic usage (credentials from .env)
  admin/cli/run.mjs alptis alptis_sante_select_pro_full

  # With specific lead
  admin/cli/run.mjs alptis alptis_sante_select_pro_full --lead baptiste_deschamps

  # Headless mode
  admin/cli/run.mjs alptis alptis_sante_select_pro_full --headless

  # With explicit credentials
  admin/cli/run.mjs alptis alptis_sante_select_pro_full --username user@example.com --password secret

Credentials resolution (priority order):
  1. CLI flags: --username / --password
  2. Platform-specific env: ALPTIS_USERNAME / ALPTIS_PASSWORD (uppercase)
  3. Platform-specific env: alptis_username / alptis_password (lowercase)
  4. Generic env: FLOW_USERNAME / FLOW_PASSWORD

Note: Credentials MUST be provided via .env file (recommended) or CLI flags.
      .env file should be at project root and never committed to git.
`)
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    platform: null,
    flowSlugOrPath: null,
    lead: null,
    username: null,
    password: null,
    headless: false,
    keepOpen: null // null = use default based on mode
  }

  let positionalIndex = 0
  const take = (i) => args[++i]

  for (let i = 0; i < args.length; i++) {
    const a = args[i]

    // Handle flags
    if (a.startsWith('--')) {
      switch (a) {
        case '--lead': opts.lead = take(i); i++; break
        case '--username': opts.username = take(i); i++; break
        case '--password': opts.password = take(i); i++; break
        case '--headless': opts.headless = true; break
        case '--keep': opts.keepOpen = true; break
        case '--no-keep': opts.keepOpen = false; break
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

function getEnvUser(slug) {
  const { user } = platformEnvKeys(slug)
  for (const k of user) {
    if (process.env[k] && process.env[k].length) return process.env[k]
  }
  return null
}

function getEnvPass(slug) {
  const { pass } = platformEnvKeys(slug)
  for (const k of pass) {
    if (process.env[k] && process.env[k].length) return process.env[k]
  }
  return null
}

function resolveFieldsFile(rootDir, platform) {
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

  // Otherwise, it's a slug - construct path
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

function resolveCredentials(platform, cliUsername, cliPassword) {
  // Priority 1: CLI flags
  if (cliUsername && cliPassword) {
    return { username: cliUsername, password: cliPassword }
  }

  // Priority 2: Platform-specific env (uppercase + lowercase)
  const envUser = getEnvUser(platform)
  const envPass = getEnvPass(platform)
  if (envUser && envPass) {
    return { username: envUser, password: envPass }
  }

  // Priority 3: Generic env
  const genericUser = process.env.FLOW_USERNAME || null
  const genericPass = process.env.FLOW_PASSWORD || null
  if (genericUser && genericPass) {
    return { username: genericUser, password: genericPass }
  }

  // Not found
  throw new Error(
    `Credentials not found for platform '${platform}'.\n` +
    `Please provide them via:\n` +
    `  1. .env file: ${platform.toUpperCase()}_USERNAME / ${platform.toUpperCase()}_PASSWORD\n` +
    `  2. .env file: FLOW_USERNAME / FLOW_PASSWORD (generic fallback)\n` +
    `  3. CLI flags: --username / --password`
  )
}

async function main() {
  const opts = parseArgs()

  if (!opts.platform || !opts.flowSlugOrPath) {
    console.error('Error: Missing required arguments <platform> and <flowSlugOrPath>\n')
    usage()
    process.exit(2)
  }

  const rootDir = findProjectRoot(process.cwd())

  // Load .env
  loadDotEnv(rootDir)

  // Resolve files
  const fieldsFile = resolveFieldsFile(rootDir, opts.platform)
  const flowFile = resolveFlowFile(rootDir, opts.platform, opts.flowSlugOrPath)
  const leadFile = resolveLeadFile(rootDir, opts.lead)

  // Resolve credentials
  const { username, password } = resolveCredentials(opts.platform, opts.username, opts.password)

  // Determine mode and keepOpen
  const mode = opts.headless ? 'headless' : 'dev_private'
  const keepOpen = opts.keepOpen !== null
    ? opts.keepOpen
    : (opts.headless ? false : true)

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
      report: 'html',
      dom: 'errors',
      jsinfo: 'errors'
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
