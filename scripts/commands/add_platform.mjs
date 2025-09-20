#!/usr/bin/env node
import { openDb } from './_db.mjs'

function parseArgs() {
  const args = process.argv.slice(2)
  const out = { fields: [] }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    const next = () => args[++i]
    if (a === '--slug') out.slug = next()
    else if (a === '--name') out.name = next()
    else if (a === '--login') out.login = next()
    else if (a === '--base') out.base = next()
    else if (a === '--website') out.website = next()
    else if (a === '--select') out.select = true
    else if (a === '--field') out.fields.push(next())
    else if (a === '--help') out.help = true
  }
  return out
}

function usage() {
  console.log(`Usage:
  node scripts/commands/add_platform.mjs --slug alptis --name "Alptis" --login https://pro.alptis.org/ \
    [--base https://pro.alptis.org/] [--website https://www.alptis.org/] [--select] \
    --field username:text:required --field password:password:required:secure

Notes:
  --field syntaxe: key:type[:required][:secure]
  Ajoute deux pages par défaut: login (avec URL) et quote_form.
`)
}

async function main() {
  const args = parseArgs()
  if (args.help || !args.slug || !args.name || !args.login) {
    usage(); process.exit(args.help ? 0 : 1)
  }
  const db = openDb()
  const tx = db.transaction(() => {
    const upsertPlat = db.prepare(`INSERT INTO platforms_catalog(slug, name, status, base_url, website_url)
      VALUES(?, ?, 'ready', ?, ?)
      ON CONFLICT(slug) DO UPDATE SET name=excluded.name, base_url=excluded.base_url, website_url=excluded.website_url, updated_at = datetime('now')`)
    upsertPlat.run(args.slug, args.name, args.base ?? null, args.website ?? null)
    const plat = db.prepare('SELECT id FROM platforms_catalog WHERE slug = ?').get(args.slug)

    // selection (optionnel)
    if (args.select) db.prepare(`INSERT INTO user_platforms(platform_id, selected) VALUES(?, 1)
      ON CONFLICT(platform_id) DO UPDATE SET selected=1`).run(plat.id)

    // pages
    const upsertPage = db.prepare(`INSERT INTO platform_pages(platform_id, slug, name, type, url, status, order_index, active)
      VALUES(?, ?, ?, ?, ?, 'ready', ?, 1)
      ON CONFLICT(platform_id, slug) DO UPDATE SET name=excluded.name, type=excluded.type, url=excluded.url, status='ready', order_index=excluded.order_index, active=1`)
    const loginInfo = upsertPage.run(plat.id, 'login', 'Connexion', 'login', args.login, 1)
    upsertPage.run(plat.id, 'quote_form', 'Formulaire de devis', 'quote_form', null, 2)

    // fields de login
    const loginPage = db.prepare('SELECT id FROM platform_pages WHERE platform_id = ? AND slug = ?').get(plat.id, 'login')
    const insertField = db.prepare(`INSERT INTO platform_fields(page_id, key, label, type, required, secure, order_index)
      VALUES(?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(page_id, key) DO UPDATE SET label=excluded.label, type=excluded.type, required=excluded.required, secure=excluded.secure, order_index=excluded.order_index`)

    const defaults = args.fields.length ? [] : [ 'username:text:required', 'password:password:required:secure' ]
    const fields = args.fields.concat(defaults)
    let idx = 1
    for (const def of fields) {
      const parts = def.split(':')
      const key = parts[0]
      const type = parts[1] || 'text'
      const required = parts.includes('required') ? 1 : 0
      const secure = parts.includes('secure') ? 1 : 0
      const label = key === 'username' ? 'Identifiant' : key === 'password' ? 'Mot de passe' : key
      insertField.run(loginPage.id, key, label, type, required, secure, idx++)
    }
  })
  tx()
  console.log('OK platform added/updated:', args.slug)
}

main().catch(err => { console.error(err); process.exit(1) })

