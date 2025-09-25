#!/usr/bin/env node
// CLI runner: executes a flow JSON with Playwright, logs everything to disk only.
// Usage: ELECTRON_RUN_AS_NODE=1 electron scripts/cli/run_flow.mjs <slug|--file flow.json> [options]

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import { chromium } from 'playwright-core'
// Decrypt credentials via Electron DPAPI/safeStorage (when run via Electron)
import { createRequire } from 'node:module'
const __require = createRequire(import.meta.url)
let safeStorage
try { ({ safeStorage } = __require('electron')) } catch { safeStorage = null }

import { FlowSchema, getFlowsDir, listFlowFiles, readJsonFile } from '../flows/lib/flows_io.mjs'
import {
  openDbRO,
  getChromePathFromSettings,
  getDefaultProfile,
  getPlatformBySlug,
  getLoginUrl,
  getCredentials,
  detectChromePathFallback,
  resolveFlowFileBySlug,
  getProjectRoot
} from './lib/db_readers.mjs'

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    slug: null,
    file: null,
    mode: 'headless', // headless|dev|dev_private
    chrome: null,
    profileDir: null,
    trace: 'off', // off|on|retain-on-failure
    har: false,
    video: false,
    consoleLog: false,
    networkLog: false,
    dom: 'errors', // none|errors|steps|all
    jsinfo: 'errors', // none|errors|steps|all
    a11y: false,
    mutations: 'off', // off|errors|steps|all
    perf: false,
    // default redaction regex as plain string (compiled at runtime)
    redact: '(password|token|authorization|cookie)=([^;\\s]+)',
    outRoot: 'runs-cli',
    report: 'html', // html|json|none
    open: false,
    json: false,
    keepOpen: false,
    vars: {},
  }
  const take = (i) => args[++i]
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (!a.startsWith('--') && !opts.slug) { opts.slug = a; continue }
    switch (a) {
      case '--file': opts.file = take(i); i++; break
      case '--mode': opts.mode = take(i); i++; break
      case '--chrome': opts.chrome = take(i); i++; break
      case '--profile-dir': opts.profileDir = take(i); i++; break
      case '--trace': opts.trace = take(i); i++; break
      case '--har': opts.har = true; break
      case '--video': opts.video = true; break
      case '--console': opts.consoleLog = true; break
      case '--network': opts.networkLog = true; break
      case '--dom': opts.dom = take(i); i++; break
      case '--js': opts.jsinfo = take(i); i++; break
      case '--a11y': opts.a11y = true; break
      case '--mutations': opts.mutations = take(i); i++; break
      case '--perf': opts.perf = true; break
      case '--redact': opts.redact = take(i); i++; break
      case '--out-root': opts.outRoot = take(i); i++; break
      case '--report': opts.report = take(i); i++; break
      case '--open': opts.open = true; break
      case '--json': opts.json = true; break
      case '--keep-open': opts.keepOpen = true; break
      case '--vars': {
        const kv = take(i); i++
        const [k, ...rest] = String(kv).split('=')
        opts.vars[k] = rest.join('=')
        break }
      case '--help':
      case '-h':
        usage(); process.exit(0)
      default:
        if (!a.startsWith('--') && !opts.slug) { opts.slug = a }
        else throw new Error('Option inconnue: ' + a)
    }
  }
  return opts
}

function usage() {
  console.log(`Usage:
  npm run flows:run -- <slug> [options]
  npm run flows:run -- --file flows/<platform>/<slug>.json [options]

Options principaux:
  --mode headless|dev|dev_private   Mode d'exécution (défaut: headless)
  --trace on|retain-on-failure      Trace Playwright
  --har                             Capture HAR
  --video                           Capture vidéo (non persistant)
  --console                         Logs console page
  --network                         Logs réseau JSONL
  --dom errors|steps|all            Snapshots DOM
  --js errors|steps|all             JS listeners/sources pertinents
  --a11y                            Snapshot accessibilité
  --perf                            Perf entries par étape
  --out-root <dir>                  Dossier racine des runs (défaut: runs-cli)
  --open                            Ouvrir le rapport en fin
`)
}

function pad2(n) { return String(n).padStart(2, '0') }
function tsId() {
  const d = new Date()
  const s = `${d.getFullYear()}${pad2(d.getMonth()+1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`
  const r = Math.random().toString(36).slice(2, 8)
  return `${s}-${r}`
}

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }) }
function writeJson(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8') }
function writeText(file, data) { ensureDir(path.dirname(file)); fs.writeFileSync(file, data, 'utf-8') }
function appendText(file, data) { ensureDir(path.dirname(file)); fs.appendFileSync(file, data, 'utf-8') }

function redactText(s, redactRe) {
  try { return s.replace(new RegExp(redactRe, 'gi'), '$1=***') } catch { return s }
}

async function main() {
  const opts = parseArgs()
  if (!opts.slug && !opts.file) { usage(); process.exit(2) }

  // Resolve flow file
  let flowFile = opts.file ? path.resolve(opts.file) : resolveFlowFileBySlug(opts.slug)
  if (!flowFile || !fs.existsSync(flowFile)) {
    console.error('Flow introuvable. Fournir --file <file.json> ou un slug existant dans le dossier flows/.')
    process.exit(2)
  }
  const flowObj = readJsonFile(flowFile)
  const flow = FlowSchema.parse(flowObj)

  const projectRoot = getProjectRoot()
  const outRoot = path.resolve(projectRoot, opts.outRoot || 'runs-cli')
  const runId = `${flow.slug}-${tsId()}`
  const runDir = path.join(outRoot, flow.slug, runId)
  ensureDir(runDir)
  // Load .env from project root (does not override existing env)
  loadDotEnv(projectRoot)

  // Open DB read-only (for platform, urls, chrome path, profile, and credentials)
  const db = openDbRO()
  const platform = getPlatformBySlug(db, flow.platform)
  const loginUrlFallback = getLoginUrl(db, platform.id)
  // Resolve Chrome path robustly: prefer --chrome if exists, then DB if exists, then detect, else fall back to channel "chrome".
  const candidates = []
  if (opts.chrome) candidates.push(opts.chrome)
  const stored = getChromePathFromSettings(db)
  if (stored) candidates.push(stored)
  const detected = detectChromePathFallback()
  if (detected) candidates.push(detected)
  let chromePath = candidates.find(p => { try { return p && fs.existsSync(p) } catch { return false } })
  const useChannel = !chromePath ? 'chrome' : null
  if (!chromePath && !useChannel) { console.error('Chrome introuvable. Indiquez --chrome <path>.'); process.exit(3) }

  // Credentials resolution priority: --vars > .env per-platform > DB safeStorage > FLOW_* env
  let username = opts.vars.username || getEnvUser(platform.slug) || null
  let password = opts.vars.password || getEnvPass(platform.slug) || null

  if (!username || !password) {
    const creds = getCredentials(db, platform.id)
    if (creds) {
      if (!username) username = creds.username
      if (!password) {
        let decrypted = null
        try { if (safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()) { decrypted = safeStorage.decryptString(creds.password_encrypted) } } catch {}
        if (decrypted) password = decrypted
      }
    }
  }

  if (!username) username = process.env.FLOW_USERNAME || null
  if (!password) password = process.env.FLOW_PASSWORD || null

  if (!username || !password) {
    console.error('Identifiants manquants. Utilisez .env (ex: ALPTIS_USERNAME/PASSWORD ou SWISSLIFE_USERNAME/PASSWORD), l\'app (safeStorage), ou --vars username=... --vars password=...')
    process.exit(2)
  }

  const redactRe = opts.redact
  const meta = {
    run: { id: runId, slug: flow.slug, platform: platform.slug, startedAt: new Date().toISOString(), mode: opts.mode, chrome: chromePath, profileDir: null },
    env: { os: `${os.platform()} ${os.release()}`, node: process.versions.node },
    options: { ...opts }
  }

  const progressFile = path.join(runDir, 'progress.ndjson')
  const screenshotsDir = path.join(runDir, 'screenshots')
  const domDir = path.join(runDir, 'dom')
  const jsDir = path.join(runDir, 'js')
  const networkDir = path.join(runDir, 'network')
  const traceDir = path.join(runDir, 'trace')
  const videoDir = path.join(runDir, 'video')
  ensureDir(screenshotsDir); ensureDir(networkDir)

  const emit = (evt) => {
    const rec = { ts: new Date().toISOString(), ...evt }
    const line = JSON.stringify(rec)
    appendText(progressFile, line + '\n')
    if (!opts.json) console.log('[run]', evt.type, evt.status || '', evt.message || '')
  }

  // Launch browser/context
  const headless = !(opts.mode === 'dev' || opts.mode === 'dev_private')
  let browser = null
  let context = null
  let page = null
  let tracingStarted = false
  try {
    if (opts.mode === 'dev') {
      let profile = opts.profileDir
      if (!profile) {
        const prof = getDefaultProfile(db)
        if (!prof?.user_data_dir) {
          console.error('Profil Chrome introuvable. Spécifiez --profile-dir ou initialisez un profil via l\'app.')
          process.exit(2)
        }
        profile = prof.user_data_dir
      }
      meta.run.profileDir = profile
      const pctxOpts = { headless }
      if (chromePath) pctxOpts.executablePath = chromePath
      if (useChannel) pctxOpts.channel = useChannel
      if (opts.har) pctxOpts.recordHar = { path: path.join(networkDir, 'har.har'), content: 'embed' }
      // recordVideo is unsupported on persistent context; ignore gracefully
      context = await chromium.launchPersistentContext(profile, pctxOpts)
    } else if (opts.mode === 'dev_private') {
      {
        const launchOpts = { headless: false }
        if (chromePath) launchOpts.executablePath = chromePath
        if (useChannel) launchOpts.channel = useChannel
        browser = await chromium.launch(launchOpts)
      }
      const ctxOpts = {}
      if (opts.har) ctxOpts.recordHar = { path: path.join(networkDir, 'har.har'), content: 'embed' }
      if (opts.video) ctxOpts.recordVideo = { dir: videoDir }
      context = await browser.newContext(ctxOpts)
    } else {
      // headless default
      {
        const launchOpts = { headless: true }
        if (chromePath) launchOpts.executablePath = chromePath
        if (useChannel) launchOpts.channel = useChannel
        browser = await chromium.launch(launchOpts)
      }
      const ctxOpts = {}
      if (opts.har) ctxOpts.recordHar = { path: path.join(networkDir, 'har.har'), content: 'embed' }
      if (opts.video) ctxOpts.recordVideo = { dir: videoDir }
      context = await browser.newContext(ctxOpts)
    }

    page = context.pages()[0] || await context.newPage()
    page.setDefaultTimeout(15000)

    // Observability hooks
    if (opts.consoleLog) {
      page.on('console', (msg) => {
        const rec = { type: 'console', level: msg.type(), text: redactText(msg.text(), redactRe) }
        appendText(path.join(networkDir, 'console.jsonl'), JSON.stringify(rec) + '\n')
      })
      page.on('pageerror', (err) => {
        const rec = { type: 'pageerror', message: String(err?.message || err) }
        appendText(path.join(networkDir, 'console.jsonl'), JSON.stringify(rec) + '\n')
      })
    }
    if (opts.networkLog) {
      page.on('request', (r) => {
        const rec = { type:'request', method: r.method(), url: r.url(), postData: r.postData()?.slice(0,2048) || null, resourceType: r.resourceType() }
        appendText(path.join(networkDir, 'requests.jsonl'), JSON.stringify(rec) + '\n')
      })
      page.on('response', async (res) => {
        try {
          const headers = res.headers()
          const contentType = headers['content-type'] || ''
          let body = null
          if (/json|text|javascript|xml/.test(contentType) && res.request().method() !== 'OPTIONS') {
            const txt = await res.text()
            body = txt.length > 50000 ? txt.slice(0,50000) + '\n/* truncated */' : txt
          }
          const rec = { type:'response', url: res.url(), status: res.status(), contentType, body }
          appendText(path.join(networkDir, 'responses.jsonl'), JSON.stringify(rec) + '\n')
        } catch {}
      })
      page.on('requestfailed', (r) => {
        const rec = { type:'requestfailed', url: r.url(), method: r.method(), failure: r.failure()?.errorText || null }
        appendText(path.join(networkDir, 'requests.jsonl'), JSON.stringify(rec) + '\n')
      })
    }

    if (opts.trace && opts.trace !== 'off') {
      await context.tracing.start({ screenshots: true, snapshots: true, sources: true })
      tracingStarted = true
    }

    // Steps execution
    const stepsSummary = []
    emit({ type: 'run', status: 'start', message: `Run ${flow.slug} (${opts.mode})` })

    const execCtx = { username, password, platform_id: platform.id, loginUrlFallback }

    for (let i = 0; i < flow.steps.length; i++) {
      const s = flow.steps[i]
      const label = s.screenshot_label || `${s.type}-${i+1}`
      emit({ type: s.type, status: 'start', stepIndex: i, message: describeStep(s) })
      const t0 = Date.now()
      const shotName = `step-${String(i+1).padStart(2,'0')}-${slugify(label)}.png`
      const shotPath = path.join(screenshotsDir, shotName)
      try {
        await execStep(page, s, execCtx)
        await page.screenshot({ path: shotPath })
        await maybeCollect(stepCollectors(page, i, s, { domDir, jsDir, a11y: opts.a11y, domMode: opts.dom, jsMode: opts.jsinfo }))
        emit({ type: s.type, status: 'success', stepIndex: i, screenshotPath: path.relative(runDir, shotPath) })
        stepsSummary.push({ index: i, type: s.type, ok: true, ms: Date.now()-t0, screenshot: `screenshots/${shotName}` })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const errName = `error-${String(i+1).padStart(2,'0')}.png`
        const errPath = path.join(screenshotsDir, errName)
        try { await page.screenshot({ path: errPath }) } catch {}
        // collect DOM/JS on error regardless of modes if set to errors
        await maybeCollect(stepCollectors(page, i, s, { domDir, jsDir, a11y: opts.a11y, domMode: opts.dom, jsMode: opts.jsinfo, onError: true }))
        emit({ type: s.type, status: 'error', stepIndex: i, message: msg, screenshotPath: path.relative(runDir, errPath) })
        stepsSummary.push({ index: i, type: s.type, ok: false, error: msg, screenshot: `screenshots/${errName}` })
        // stop-on-error behavior: always stop
        break
      }
    }

    // Persist manifest and report
    const finishedAt = new Date().toISOString()
    meta.run.finishedAt = finishedAt
    const manifest = { ...meta, steps: stepsSummary, artifacts: {
      screenshotsDir: 'screenshots',
      trace: tracingStarted ? 'trace/trace.zip' : null,
      har: opts.har ? 'network/har.har' : null,
      video: opts.video ? 'video' : null,
      progress: 'progress.ndjson'
    }}
    writeJson(path.join(runDir, 'index.json'), manifest)
    if (opts.report && opts.report !== 'none') writeText(path.join(runDir, 'report.html'), renderReportHtml(manifest))

    if (tracingStarted) {
      ensureDir(traceDir)
      await context.tracing.stop({ path: path.join(traceDir, 'trace.zip') })
    }

    // Close unless asked to keep open
    if (!opts.keepOpen) {
      try { await context?.close() } catch {}
      try { await browser?.close() } catch {}
    }

    emit({ type:'run', status: 'success', message: `Terminé – artefacts: ${path.relative(process.cwd(), runDir)}` })
    if (opts.open) {
      try { await openPath(runDir) } catch {}
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    appendText(progressFile, JSON.stringify({ ts:new Date().toISOString(), type:'run', status:'error', message: msg }) + '\n')
    console.error('Erreur:', msg)
    process.exit(1)
  }
}

function slugify(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') }

function describeStep(s) {
  switch (s.type) {
    case 'goto': return `Aller sur ${s.url || ''}`
    case 'fill': return `Remplir ${s.selector}`
    case 'click': return `Cliquer ${s.selector}`
    case 'tryClick': return `Essayer clic ${s.selector}`
    case 'waitFor': return `Attendre ${s.selector}`
    case 'assertText': return `Vérifier texte ${s.selector}`
    case 'screenshot': return `Capture écran`
    case 'sleep': return `Pause ${s.timeout_ms||0}ms`
    default: return s.type
  }
}

async function execStep(page, s, ctx) {
  if (s.timeout_ms) page.setDefaultTimeout(s.timeout_ms)
  switch (s.type) {
    case 'goto': {
      let target = s.url || null
      if (!target) target = ctx.loginUrlFallback || null
      if (!target) throw new Error('URL manquante (goto)')
      await page.goto(target, { waitUntil: 'domcontentloaded' })
      return }
    case 'waitFor':
      if (!s.selector) throw new Error('Sélecteur manquant')
      await page.waitForSelector(s.selector)
      return
    case 'fill': {
      if (!s.selector) throw new Error('Sélecteur manquant')
      const raw = String(s.value || '').replace('{username}', ctx.username).replace('{password}', ctx.password)
      await page.fill(s.selector, raw)
      return }
    case 'click':
      if (!s.selector) throw new Error('Sélecteur manquant')
      await page.click(s.selector)
      return
    case 'tryClick':
      if (!s.selector) throw new Error('Sélecteur manquant')
      try {
        await page.waitForSelector(s.selector, { timeout: s.timeout_ms || 1000 })
        await page.click(s.selector)
      } catch {}
      return
    case 'assertText':
      if (!s.selector || !s.assert_text) throw new Error('Paramètres manquants')
      await page.waitForSelector(s.selector)
      const txt = await page.locator(s.selector).innerText()
      if (!txt.includes(String(s.assert_text))) throw new Error('Texte attendu introuvable')
      return
    case 'screenshot':
      return
    case 'sleep':
      await new Promise(r => setTimeout(r, s.timeout_ms || 0))
      return
    default:
      throw new Error('Type d\'étape inconnu: ' + s.type)
  }
}

async function maybeCollect(promiseOrNull) { if (!promiseOrNull) return; try { await promiseOrNull } catch {} }

function wants(mode, onError) {
  // returns predicate to decide if we should collect on this phase
  return (value) => {
    if (!value || value === 'none') return false
    if (value === 'all') return true
    if (value === 'steps' && !onError) return true
    if (value === 'errors' && onError) return true
    return false
  }
}

function stepCollectors(page, index, step, { domDir, jsDir, a11y, domMode, jsMode, onError = false }) {
  const should = wants(null, onError)
  const tasks = []
  if (should(domMode)) tasks.push(collectDom(page, index, step, domDir))
  if (a11y && should(domMode)) tasks.push(collectA11y(page, index, domDir))
  if (should(jsMode) && step.selector) tasks.push(collectJsListeners(page, index, step.selector, jsDir))
  return Promise.allSettled(tasks)
}

async function collectDom(page, index, step, domDir) {
  const full = await page.content()
  const p1 = path.join(domDir, `step-${String(index+1).padStart(2,'0')}.html`)
  writeText(p1, full)
  if (step.selector) {
    const focus = await page.evaluate((sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const region = el.closest('form, section, article, main, [role="region"], [role="dialog"]') || el.parentElement || el
      const style = el instanceof Element ? getComputedStyle(el) : null
      const styles = style ? {
        display: style.display, visibility: style.visibility, opacity: style.opacity,
        position: style.position, width: style.width, height: style.height
      } : null
      return { selector: sel, outerHTML: el.outerHTML, regionOuterHTML: region.outerHTML, styles }
    }, step.selector)
    if (focus) writeText(path.join(domDir, `step-${String(index+1).padStart(2,'0')}.focus.html`), `<!-- selector: ${focus.selector} -->\n${focus.regionOuterHTML}`)
  }
}

async function collectA11y(page, index, domDir) {
  try {
    const snap = await page.accessibility.snapshot({ interestingOnly: false })
    writeJson(path.join(domDir, `step-${String(index+1).padStart(2,'0')}.a11y.json`), snap)
  } catch {}
}

async function collectJsListeners(page, index, selector, jsDir) {
  try {
    const client = await page.context().newCDPSession(page)
    await client.send('DOM.enable')
    await client.send('DOMDebugger.enable')
    await client.send('Debugger.enable')
    const evalRes = await client.send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(selector)})`, objectGroup: 'cli-runner', includeCommandLineAPI: true, returnByValue: false })
    const objId = evalRes.result.objectId
    if (!objId) return
    const evts = await client.send('DOMDebugger.getEventListeners', { objectId: objId, depth: -1, pierce: true })
    const listeners = evts.listeners || []
    const out = []
    for (const l of listeners) {
      const info = { type: l.type, useCapture: l.useCapture, passive: l.passive, once: l.once, scriptId: l.scriptId, lineNumber: l.lineNumber, columnNumber: l.columnNumber }
      try {
        if (l.scriptId) {
          const src = await client.send('Debugger.getScriptSource', { scriptId: l.scriptId })
          const dir = path.join(jsDir, 'scripts')
          const name = `script-${l.scriptId}.js`
          writeText(path.join(dir, name), src.scriptSource || '')
          info.scriptFile = `js/scripts/${name}`
        }
      } catch {}
      out.push(info)
    }
    writeJson(path.join(jsDir, `step-${String(index+1).padStart(2,'0')}.listeners.json`), out)
  } catch {}
}

function renderReportHtml(manifest) {
  const data = JSON.stringify(manifest)
  // Avoid nested backticks: use classic string concatenation inside the embedded script
  return "<!doctype html>"+
"<html lang=\"fr\"><head>"+
"<meta charset=\"utf-8\"/>"+
"<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/>"+
"<title>Run "+escapeHtml(manifest.run?.id||'')+"</title>"+
"<style>"+
"body{font-family:system-ui,Segoe UI,Arial,sans-serif;margin:20px;background:#0b0c10;color:#e6e6e6}"+
".h{display:flex;gap:12px;align-items:center}"+
".tag{padding:2px 6px;border-radius:4px;background:#1f2833;color:#66fcf1;font-size:12px}"+
"table{border-collapse:collapse;width:100%;margin-top:16px}"+
"th,td{border-bottom:1px solid #2b2f36;padding:8px;text-align:left;font-size:14px}"+
"tr:hover{background:#13161c}"+
"img{max-width:320px;border:1px solid #2b2f36;border-radius:4px}"+
".ok{color:#7CFC00}.err{color:#ff6b6b}"+
".small{opacity:.7;font-size:12px}"+
".mono{font-family:ui-monospace,Consolas,monospace}"+
"</style></head><body>"+
"<div class=\"h\">"+
  "<h1 style=\"margin:0\">Flow: "+escapeHtml(manifest.run?.slug||'')+"</h1>"+
  "<span class=\"tag\">"+escapeHtml(manifest.run?.mode||'')+"</span>"+
  "<span class=\"small\">Chrome: <span class=\"mono\">"+escapeHtml(manifest.run?.chrome||'')+"</span></span>"+
  "<span class=\"small\">Début: "+escapeHtml(manifest.run?.startedAt||'')+"</span>"+
  "<span class=\"small\">Fin: "+escapeHtml(manifest.run?.finishedAt||'')+"</span>"+
  "<a class=\"small\" href=\"index.json\" target=\"_blank\">index.json</a>"+
  (manifest.artifacts?.trace?"<a class=\"small\" href=\"trace/trace.zip\">trace.zip</a>":"")+
  (manifest.artifacts?.har?"<a class=\"small\" href=\"network/har.har\">har.har</a>":"")+
"</div>"+
"<table><thead><tr><th>#</th><th>Type</th><th>Statut</th><th>Durée</th><th>Capture</th><th>Liens</th></tr></thead>"+
"<tbody id=\"rows\"></tbody></table>"+
"<script>\n"+
"const data = "+data+";\n"+
"const tbody = document.getElementById('rows');\n"+
"for (const s of (data.steps||[])) {\n"+
"  const tr = document.createElement('tr');\n"+
"  tr.innerHTML = '<td>'+ (s.index+1) +'</td>' +\n"+
"    '<td>'+ s.type +'</td>' +\n"+
"    '<td class=\\\"' + (s.ok?'ok':'err') + '\\\">' + (s.ok?'OK':'ERREUR') + '</td>' +\n"+
"    '<td>'+ (s.ms||'') +' ms</td>' +\n"+
"    '<td>' + (s.screenshot?'<img src=\\\"'+s.screenshot+'\\\"/>':'') + '</td>' +\n"+
"    '<td class=\\\"small\\\">' + linkIf('DOM','dom/step-'+pad(s.index+1)+'.html') + ' ' + linkIf('FOCUS','dom/step-'+pad(s.index+1)+'.focus.html') + ' ' + linkIf('LISTENERS','js/step-'+pad(s.index+1)+'.listeners.json') + '</td>';\n"+
"  tbody.appendChild(tr);\n"+
"}\n"+
"function pad(n){return String(n).padStart(2,'0')}\n"+
"function linkIf(label, href){return '<a href=\\\"'+href+'\\\" target=\\\"_blank\\\">'+label+'</a>'}\n"+
"</script>"+
"</body></html>"
}

function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}

async function openPath(target) {
  const { spawn } = await import('node:child_process')
  const plat = process.platform
  if (plat === 'win32') spawn('explorer', [path.resolve(target)], { detached: true })
  else if (plat === 'darwin') spawn('open', [target], { detached: true })
  else spawn('xdg-open', [target], { detached: true })
}

main().catch(err => { console.error(err.stack || err); process.exit(1) })

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
