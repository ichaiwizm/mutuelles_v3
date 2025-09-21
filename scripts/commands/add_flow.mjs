#!/usr/bin/env node
import fs from 'node:fs'
import { openDb } from './_db.mjs'

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    const next = () => args[++i]
    if (a === '--platform') out.platform = next()
    else if (a === '--slug') out.slug = next()
    else if (a === '--name') out.name = next()
    else if (a === '--steps') out.steps = next()
    else if (a === '--inactive') out.active = false
    else if (a === '--help') out.help = true
  }
  // Fallback positionnel: platform slug name steps
  if (!out.platform && args.length >= 4 && !args[0].startsWith('--')) {
    out.platform = args[0]
    out.slug = args[1]
    out.name = args[2]
    out.steps = args[3]
  }
  return out
}

function usage() {
  console.log(`Usage:
  node scripts/commands/add_flow.mjs --platform alptis --slug alptis_login --name "Connexion Alptis" --steps steps.json [--inactive]

steps.json (exemple):
[
  { "type":"goto" },
  { "type":"waitFor", "selector":"#username" },
  { "type":"fill", "selector":"#username", "value":"{username}" },
  { "type":"fill", "selector":"#password", "value":"{password}" },
  { "type":"click", "selector":"button[type=submit]" },
  { "type":"screenshot", "screenshot_label":"after-submit" }
]
`)
}

async function main() {
  const args = parseArgs()
  if (args.help || !args.platform || !args.slug || !args.name || !args.steps) {
    usage(); process.exit(args.help ? 0 : 1)
  }
  const steps = JSON.parse(fs.readFileSync(args.steps, 'utf-8'))
  const db = openDb()
  const tx = db.transaction(() => {
    const plat = db.prepare('SELECT id FROM platforms_catalog WHERE slug = ?').get(args.platform)
    if (!plat?.id) throw new Error('Plateforme inconnue: ' + args.platform)
    const active = args.active === false ? 0 : 1
    const upsertFlow = db.prepare(`INSERT INTO flows_catalog(platform_id, slug, name, active) VALUES(?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET platform_id=excluded.platform_id, name=excluded.name, active=excluded.active`)
    const info = upsertFlow.run(plat.id, args.slug, args.name, active)
    const flow = db.prepare('SELECT id FROM flows_catalog WHERE slug = ?').get(args.slug)
    db.prepare('DELETE FROM flow_steps WHERE flow_id = ?').run(flow.id)
    const insertStep = db.prepare(`INSERT INTO flow_steps(flow_id, order_index, type, selector, value, url, screenshot_label, timeout_ms, assert_text)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    steps.forEach((s, idx) => {
      insertStep.run(flow.id, idx+1, s.type, s.selector ?? null, s.value ?? null, s.url ?? null, s.screenshot_label ?? null, s.timeout_ms ?? null, s.assert_text ?? null)
    })
  })
  tx()
  console.log('OK flow added/updated:', args.slug)
}

main().catch(err => { console.error(err); process.exit(1) })
