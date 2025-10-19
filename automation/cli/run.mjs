#!/usr/bin/env node
// Simplified CLI runner: executes high-level flows with automatic platform detection
// Loads leads from database, credentials from .env

import fs from 'node:fs'
import path from 'node:path'
import { config as loadDotEnv } from 'dotenv'
import minimist from 'minimist'
import { runHighLevelFlow } from '../engine/index.mjs'
import { getDb } from '../../src/shared/db/connection.mjs'
import { getLeadById, getLeadDisplayName } from '../../src/shared/db/queries/leads.mjs'

// Load .env file
loadDotEnv()

function usage() {
  console.log(`Usage:
  automation/cli/run.mjs <flowSlug> --lead-id <uuid> [options]

Arguments:
  flowSlug              Flow slug (ex: alptis_login, swisslifeone_slsis)

Options:
  --lead-id <uuid>      Lead ID from database (required)
  --headless            Run in headless mode (default: visible with window kept open)
  --help, -h            Show this help

Examples:
  # Basic usage (platform auto-detected, credentials from .env, visible mode)
  npm run flows:run alptis_login -- --lead-id abc-123-def-456

  # Headless mode (invisible, auto-close)
  npm run flows:run swisslifeone_slsis -- --lead-id abc-123 --headless

  # List available leads in database
  npm run db:status

Credentials (.env file):
  Create a .env file at project root with:
    ALPTIS_USERNAME=your.email@example.com    (platform-specific, uppercase)
    ALPTIS_PASSWORD=YourPassword

    Or fallback generic:
    FLOW_USERNAME=email@example.com
    FLOW_PASSWORD=Password

  Resolution order:
    1. <PLATFORM>_USERNAME / <PLATFORM>_PASSWORD (uppercase)
    2. FLOW_USERNAME / FLOW_PASSWORD (generic fallback)

Note: The .env file is never committed to git (already in .gitignore).
`)
}

async function main() {
  const args = minimist(process.argv.slice(2), {
    boolean: ['headless', 'help', 'h'],
    string: ['lead-id'],
    alias: { h: 'help' }
  })

  const [flowSlug] = args._
  const { headless, help } = args
  const leadId = args['lead-id']

  if (help) {
    usage()
    process.exit(0)
  }

  if (!flowSlug) {
    console.error('Error: Missing required argument <flowSlug>\n')
    usage()
    process.exit(2)
  }

  if (!leadId) {
    console.error('Error: --lead-id is required\n')
    console.error('Use "npm run db:status" to see available leads\n')
    usage()
    process.exit(2)
  }

  const rootDir = process.cwd()

  // Resolve flow file path
  let flowFile
  if (flowSlug.includes('/') || flowSlug.includes('\\')) {
    // Full path provided
    flowFile = path.resolve(flowSlug)
  } else {
    // Slug provided - scan data/flows for matching slug
    const flowsDir = path.join(rootDir, 'data', 'flows')
    const found = findFlowFileBySlug(flowsDir, flowSlug)
    if (!found) {
      console.error(`Error: Flow not found with slug: ${flowSlug}`)
      console.error(`Searched in: ${flowsDir}`)
      process.exit(1)
    }
    flowFile = found
  }

  if (!fs.existsSync(flowFile)) {
    console.error(`Error: Flow file not found: ${flowFile}`)
    process.exit(1)
  }

  // Load flow to get platform
  const flow = JSON.parse(fs.readFileSync(flowFile, 'utf-8'))
  const platform = flow.platform
  if (!platform) {
    console.error(`Error: Flow file missing 'platform' field: ${flowFile}`)
    process.exit(1)
  }

  // Resolve field-definitions
  const fieldsFile = path.join(rootDir, 'data', 'field-definitions', `${platform}.json`)
  if (!fs.existsSync(fieldsFile)) {
    console.error(`Error: Field definitions not found: ${fieldsFile}`)
    process.exit(1)
  }

  // Load lead from database
  const db = getDb()
  const lead = getLeadById(db, leadId)
  if (!lead) {
    console.error(`Error: Lead not found with ID: ${leadId}`)
    console.error('Use "npm run db:status" to see available leads')
    process.exit(1)
  }

  // Resolve credentials from .env (2 levels only)
  const platformUpper = platform.toUpperCase().replace(/[^A-Z0-9]/g, '_')
  const username = process.env[`${platformUpper}_USERNAME`] || process.env.FLOW_USERNAME
  const password = process.env[`${platformUpper}_PASSWORD`] || process.env.FLOW_PASSWORD

  if (!username || !password) {
    console.error(`Error: Credentials not found for platform '${platform}' in .env file.`)
    console.error(`Please add to .env at project root:`)
    console.error(`  ${platformUpper}_USERNAME=your.email@example.com`)
    console.error(`  ${platformUpper}_PASSWORD=YourPassword`)
    console.error(`Or use generic fallback:`)
    console.error(`  FLOW_USERNAME=email@example.com`)
    console.error(`  FLOW_PASSWORD=Password`)
    process.exit(1)
  }

  // Determine mode and keepOpen
  const mode = headless ? 'headless' : 'dev_private'
  const keepOpen = !headless

  console.log('[run] Configuration:')
  console.log(`  Platform: ${platform} (auto-detected)`)
  console.log(`  Fields: ${path.relative(rootDir, fieldsFile)}`)
  console.log(`  Flow: ${path.relative(rootDir, flowFile)}`)
  console.log(`  Lead ID: ${lead.id}`)
  console.log(`  Lead name: ${getLeadDisplayName(lead)}`)
  console.log(`  User: ${String(username).slice(0, 3)}***`)
  console.log(`  Mode: ${mode}`)
  console.log(`  Keep open: ${keepOpen}`)
  console.log('')

  try {
    await runHighLevelFlow({
      fieldsFile,
      flowFile,
      leadData: lead.data,
      username,
      password,
      mode,
      keepOpen,
      outRoot: 'data/runs',
      dom: 'all'
    })

    console.log('[run] ✓ Execution completed successfully')
  } catch (err) {
    console.error('[run] ✗ Execution failed:', err.message)
    if (err.stack) console.error(err.stack)
    process.exit(1)
  }
}

/**
 * Recursively search for a flow file by slug in the flows directory
 */
function findFlowFileBySlug(dir, slug) {
  if (!fs.existsSync(dir)) return null

  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, ent.name)

    if (ent.isDirectory()) {
      const found = findFlowFileBySlug(fullPath, slug)
      if (found) return found
    } else if (ent.isFile() && ent.name.endsWith('.hl.json')) {
      try {
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
        if (content.slug === slug) return fullPath
      } catch {}
    }
  }

  return null
}

main().catch(err => {
  console.error('Fatal error:', err.stack || err)
  process.exit(1)
})
