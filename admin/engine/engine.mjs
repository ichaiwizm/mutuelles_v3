// Unified engine: runs a flow using platform field-definitions + lead values
// No DB dependencies - credentials from .env or CLI flags only.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { chromium } from 'playwright-core'

export async function runHighLevelFlow({ fieldsFile, flowFile, leadFile, username, password, outRoot='admin/runs-cli', mode='dev_private', chrome=null, report='html', consoleLog=false, networkLog=false, har=false, video=false, dom='errors', jsinfo='errors', a11y=false, keepOpen=true, redact='(password|token|authorization|cookie)=([^;\\s]+)' }) {
  const fields = JSON.parse(fs.readFileSync(fieldsFile, 'utf-8'))
  const flow = JSON.parse(fs.readFileSync(flowFile, 'utf-8'))
  const lead = leadFile ? JSON.parse(fs.readFileSync(leadFile, 'utf-8')) : {}

  const platform = fields.platform || flow.platform
  const slug = flow.slug || path.basename(flowFile).replace(/\.json$/,'')

  ensureDir(outRoot)
  const runId = `${slug}-${tsId()}`
  const runDir = path.join(outRoot, slug, runId)
  ensureDir(runDir)

  const progressFile = path.join(runDir, 'progress.ndjson')
  const screenshotsDir = path.join(runDir, 'screenshots')
  const domDir = path.join(runDir, 'dom')
  const jsDir = path.join(runDir, 'js')
  const networkDir = path.join(runDir, 'network')
  const traceDir = path.join(runDir, 'trace')
  const videoDir = path.join(runDir, 'video')
  ensureDir(screenshotsDir); ensureDir(networkDir); ensureDir(domDir); ensureDir(jsDir)

  const emit = (evt) => { const rec = { ts:new Date().toISOString(), ...evt }; appendText(progressFile, JSON.stringify(rec)+'\n'); console.log('[run]', evt.type, evt.status||'', evt.message||'') }

  // Chrome detection
  const candidates = []
  if (chrome) candidates.push(chrome)
  const detected = detectChromePathFallback()
  if (detected) candidates.push(detected)
  const chromePath = candidates.find(p => { try { return p && fs.existsSync(p) } catch { return false } })
  const useChannel = !chromePath ? 'chrome' : null

  // Credentials provided by caller (.env or CLI flags)
  if (!username || !password) throw new Error('Identifiants manquants - utilisez .env (PLATFORM_USERNAME/PASSWORD ou FLOW_USERNAME/PASSWORD) ou --username/--password')

  const meta = { run:{ id:runId, slug, platform, startedAt:new Date().toISOString(), mode, chrome: chromePath, profileDir:null }, env:{ os:`${os.platform()} ${os.release()}`, node: process.versions.node }, options: { outRoot, mode, report } }

  const ctx = { redact, platform, fields, lead, username, password }

  const headless = !(mode === 'dev' || mode === 'dev_private')
  let browser = null, context = null, page = null, tracingStarted = false
  try {
    if (mode === 'dev' || mode === 'dev_private') {
      const launchOpts = { headless: false }
      if (chromePath) launchOpts.executablePath = chromePath
      if (useChannel) launchOpts.channel = useChannel
      browser = await chromium.launch(launchOpts)
      const ctxOpts = {}
      if (har) ctxOpts.recordHar = { path: path.join(networkDir,'har.har'), content:'embed' }
      if (video) ctxOpts.recordVideo = { dir: videoDir }
      context = await browser.newContext(ctxOpts)
    } else {
      const launchOpts = { headless: true }
      if (chromePath) launchOpts.executablePath = chromePath
      if (useChannel) launchOpts.channel = useChannel
      browser = await chromium.launch(launchOpts)
      const ctxOpts = {}
      if (har) ctxOpts.recordHar = { path: path.join(networkDir,'har.har'), content:'embed' }
      if (video) ctxOpts.recordVideo = { dir: videoDir }
      context = await browser.newContext(ctxOpts)
    }
    page = context.pages()[0] || await context.newPage()
    page.setDefaultTimeout(15000)
    context.on('page', (p) => { try { page = p; page.setDefaultTimeout(15000) } catch {} })
    const ensurePage = async () => {
      try { if (!page || page.isClosed()) { page = context.pages()[0] || await context.newPage(); page.setDefaultTimeout(15000) } } catch { try { page = await context.newPage() } catch {} }
      return page
    }

    // Support iframes: stack de contextes (page principale, puis frames)
    const contextStack = [page]
    const getCurrentContext = () => contextStack[contextStack.length - 1]

    if (consoleLog) {
      page.on('console', (msg) => { appendText(path.join(networkDir,'console.jsonl'), JSON.stringify({ type:'console', level: msg.type(), text: redactText(msg.text(), redact) })+'\n') })
      page.on('pageerror', (err) => { appendText(path.join(networkDir,'console.jsonl'), JSON.stringify({ type:'pageerror', message: String(err?.message||err) })+'\n') })
    }
    if (networkLog) {
      page.on('request', (r) => appendText(path.join(networkDir,'requests.jsonl'), JSON.stringify({ type:'request', method:r.method(), url:r.url(), postData:r.postData()?.slice(0,2048)||null, resourceType:r.resourceType() })+'\n'))
      page.on('response', async (res) => { try { const ct = res.headers()['content-type']||''; let body=null; if (/json|text|javascript|xml/.test(ct) && res.request().method()!=='OPTIONS'){ const t = await res.text(); body = t.length>50000 ? t.slice(0,50000)+'\n/* truncated */' : t } appendText(path.join(networkDir,'responses.jsonl'), JSON.stringify({ type:'response', url:res.url(), status:res.status(), contentType:ct, body })+'\n') } catch {} })
      page.on('requestfailed', (r) => appendText(path.join(networkDir,'requests.jsonl'), JSON.stringify({ type:'requestfailed', url:r.url(), method:r.method(), failure:r.failure()?.errorText||null })+'\n'))
    }

    if (flow.trace === 'on' || flow.trace === 'retain-on-failure') { await context.tracing.start({ screenshots:true, snapshots:true, sources:true }); tracingStarted = true }

    const stepsSummary = []
    emit({ type:'run', status:'start', message:`Run ${slug} (${mode})` })

    for (let i=0;i<flow.steps.length;i++) {
      const s = flow.steps[i]
      const label = s.label || s.type || `step-${i+1}`

      // Support pour skipIfNot: sauter le step si la condition leadKey est falsy
      if (s.skipIfNot) {
        const condValue = resolveValue({ leadKey: s.skipIfNot }, ctx)
        if (condValue === undefined || condValue === null || condValue === false || condValue === '' || (Array.isArray(condValue) && condValue.length === 0)) {
          console.log('[hl] step %d SKIPPED (skipIfNot: %s is falsy)', i, s.skipIfNot)
          stepsSummary.push({ index:i, type:s.type, ok:true, skipped:true, reason:'skipIfNot', ms: 0 })
          continue
        }
      }

      emit({ type:s.type, status:'start', stepIndex:i, message: describeHL(s) })
      const t0 = Date.now()
      const shotName = `step-${String(i+1).padStart(2,'0')}-${slugify(label)}.png`
      const shotPath = path.join(screenshotsDir, shotName)
      try {
        await ensurePage();
        await execHLStep(page, s, ctx, contextStack, getCurrentContext)
        await page.screenshot({ path: shotPath })
        await maybeCollect(stepCollectors(page, getCurrentContext(), i, s, { domDir, jsDir, a11y, domMode: dom, jsMode: jsinfo, ctx }))
        emit({ type:s.type, status:'success', stepIndex:i, screenshotPath: path.relative(runDir, shotPath) })
        stepsSummary.push({ index:i, type:s.type, ok:true, ms: Date.now()-t0, screenshot:`screenshots/${shotName}` })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const errName = `error-${String(i+1).padStart(2,'0')}.png`
        const errPath = path.join(screenshotsDir, errName)
        try { await ensurePage(); await page.screenshot({ path: errPath }) } catch {}
        await maybeCollect(stepCollectors(page, getCurrentContext(), i, s, { domDir, jsDir, a11y, domMode: dom, jsMode: jsinfo, onError: true, ctx }))
        emit({ type:s.type, status:'error', stepIndex:i, message: msg, screenshotPath: path.relative(runDir, errPath) })
        stepsSummary.push({ index:i, type:s.type, ok:false, error: msg, screenshot:`screenshots/${errName}` })
        break
      }
    }

    meta.run.finishedAt = new Date().toISOString()
    const manifest = { ...meta, steps: stepsSummary, artifacts: { screenshotsDir:'screenshots', trace: tracingStarted ? 'trace/trace.zip' : null, har: har ? 'network/har.har' : null, video: video ? 'video' : null, progress:'progress.ndjson' } }
    writeJson(path.join(runDir,'index.json'), manifest)
    writeText(path.join(runDir,'report.html'), renderReportHtml(manifest))
    if (tracingStarted) { ensureDir(traceDir); await context.tracing.stop({ path: path.join(traceDir,'trace.zip') }) }
    if (!keepOpen) {
      try { await context?.close() } catch {}
      try { await browser?.close() } catch {}
      emit({ type:'run', status:'success', message:`Terminé – artefacts: ${path.relative(process.cwd(), runDir)}` })
    } else {
      // keepOpen: attendre que l'utilisateur ferme le navigateur
      emit({ type:'run', status:'success', message:`Terminé – Navigateur laissé ouvert, fermez-le manuellement` })
      console.log('[hl] ⏸  keepOpen=true - Navigateur laissé ouvert. Fermez-le pour terminer.')

      await new Promise((resolve) => {
        // Pour les deux modes : détecter quand toutes les pages sont fermées
        const checkPagesInterval = setInterval(() => {
          try {
            const pages = context?.pages() || []
            if (pages.length === 0) {
              clearInterval(checkPagesInterval)
              console.log('[hl] ✓ Toutes les pages fermées')
              resolve()
            }
          } catch {
            clearInterval(checkPagesInterval)
            resolve()
          }
        }, 500)

        // En plus, écouter la fermeture du browser (si l'user ferme tout Chrome)
        if (browser) {
          browser.once('disconnected', () => {
            clearInterval(checkPagesInterval)
            console.log('[hl] ✓ Navigateur complètement fermé')
            resolve()
          })
        }
      })

      // Cleanup final
      try { await context?.close() } catch {}
      try { await browser?.close() } catch {}
    }
    return { runDir }
  } finally {
    // no-op
  }
}

// ---------------- HL primitives ----------------
function getField(fields, key) {
  if (!fields?.fields) throw new Error('fields.fields manquant')
  const f = fields.fields.find((x)=>x.key===key)
  if (!f) throw new Error(`Champ introuvable: ${key}`)
  return f
}

async function execHLStep(page, s, ctx, contextStack, getCurrentContext) {
  // Utiliser le contexte courant (page ou frame) pour toutes les opérations
  const activeContext = getCurrentContext()

  switch (s.type) {
    case 'goto': {
      if (!s.url) throw new Error('URL manquante')
      // goto s'exécute toujours sur la page principale, pas dans un frame
      await page.goto(s.url, { waitUntil:'domcontentloaded' })
      return }
    case 'acceptConsent': {
      if (!s.selector) throw new Error('selector requis pour acceptConsent')
      try { await activeContext.waitForSelector(s.selector, { timeout: s.timeout_ms || 1500 }); await activeContext.click(s.selector) } catch {}
      return }
    case 'waitForField': {
      let f = getField(ctx.fields, s.field)
      const idx = extractDynamicIndex(s)
      if (idx != null && f?.metadata?.dynamicIndex) f = withDynamicIndex(f, idx)
      if (!f.selector) throw new Error(`Selector manquant pour ${s.field}`)
      await activeContext.waitForSelector(f.selector, { state: 'attached' })
      return }
    case 'fillField': {
      let f = getField(ctx.fields, s.field)
      const idx = extractDynamicIndex(s)
      if (idx != null && f?.metadata?.dynamicIndex) f = withDynamicIndex(f, idx)
      let value = resolveValue(s, ctx)

      // Parse templates in value if it's a string
      if (typeof value === 'string') {
        value = parseValueTemplates(value, ctx)
      }

      // Support pour optional: si la valeur est manquante, skip silencieusement
      if (value === undefined || value === null || value === '') {
        if (s.optional === true) {
          console.log('[hl] fillField %s = SKIPPED (optional, valeur manquante)', s.field)
          return
        }
        throw new Error(`Valeur manquante pour ${s.field} (leadKey=${s.leadKey||''}, value=${s.value||''})`)
      }
      if (!f.selector) throw new Error(`Selector manquant pour ${s.field}`)
      const v = String(value)
      const logv = String(s.field||'').toLowerCase().includes('password') ? '***' : v
      console.log('[hl] fillField %s = %s', s.field, logv)
      await activeContext.fill(f.selector, v)
      // Fermer le calendrier s'il s'ouvre automatiquement (date-picker)
      const isDateField = (s.field||'').toLowerCase().includes('date') || (f.label||'').toLowerCase().includes('date')
      if (isDateField) {
        try {
          await activeContext.press(f.selector, 'Escape')
          await new Promise(r => setTimeout(r, 300))
          console.log('[hl] fillField %s - calendrier fermé', s.field)
        } catch (err) {
          // Si Escape échoue, continuer quand même
          console.log('[hl] fillField %s - Escape ignoré: %s', s.field, err.message)
        }
      }
      return }
    case 'toggleField': {
      let f = getField(ctx.fields, s.field)
      const idx = extractDynamicIndex(s)
      if (idx != null && f?.metadata?.dynamicIndex) f = withDynamicIndex(f, idx)

      // Vérifier que metadata.toggle est présent
      if (!f?.metadata?.toggle) throw new Error(`metadata.toggle manquant pour ${s.field}`)
      if (!f.metadata.toggle.click_selector) throw new Error(`metadata.toggle.click_selector manquant pour ${s.field}`)
      if (!f.metadata.toggle.state_on_selector) throw new Error(`metadata.toggle.state_on_selector manquant pour ${s.field}`)

      const clickSel = f.metadata.toggle.click_selector
      const stateSel = f.metadata.toggle.state_on_selector
      console.log('[hl] toggleField %s -> %s', s.field, s.state)

      // Vérifier l'état actuel avant de cliquer
      const isCurrentlyOn = await activeContext.locator(stateSel).count() > 0

      if (s.state === 'on' && !isCurrentlyOn) {
        // Cliquer sur le toggle pour l'activer
        await activeContext.locator(clickSel).click({ force: true })
        console.log('[hl] toggleField %s - clicked to activate', s.field)
        // Attendre que l'animation/state update se termine
        await new Promise(r => setTimeout(r, 300))
        await activeContext.waitForSelector(stateSel, { state: 'attached', timeout: 20000 })
        console.log('[hl] toggleField %s - état ON confirmé', s.field)
      } else if (s.state === 'off' && isCurrentlyOn) {
        // Cliquer sur le toggle pour le désactiver
        await activeContext.locator(clickSel).click({ force: true })
        console.log('[hl] toggleField %s - clicked to deactivate', s.field)
        await new Promise(r => setTimeout(r, 300))
      } else {
        console.log('[hl] toggleField %s - already in desired state %s', s.field, s.state)
      }
      return }
    case 'selectField': {
      let f = getField(ctx.fields, s.field)
      const idx = extractDynamicIndex(s)
      if (idx != null && f?.metadata?.dynamicIndex) f = withDynamicIndex(f, idx)
      const value = resolveValue(s, ctx)
      // Support pour optional: si la valeur est manquante, skip silencieusement
      if (value === undefined || value === null) {
        if (s.optional === true) {
          console.log('[hl] selectField %s = SKIPPED (optional, valeur manquante)', s.field)
          return
        }
        throw new Error(`Valeur manquante pour ${s.field} (leadKey=${s.leadKey||''})`)
      }
      const open = f?.options?.open_selector || f.selector
      if (!open) throw new Error(`open_selector manquant pour ${s.field}`)
      await activeContext.click(open)
      // Petit wait pour que le dropdown s'ouvre complètement
      await new Promise(r => setTimeout(r, 300))
      // try find item by value mapping
      let item = f?.options?.items?.find((it)=>String(it.value)===String(value))
      if (!item) {
        // fallback by label
        item = f?.options?.items?.find((it)=>String(it.label).toLowerCase()===String(value).toLowerCase())
      }
      if (!item?.option_selector) throw new Error(`option_selector manquant pour ${s.field}:${value}`)
      console.log('[hl] selectField %s -> %s', s.field, String(value))
      // Attendre que l'option soit visible avant de cliquer
      await activeContext.waitForSelector(item.option_selector, { state: 'visible', timeout: 5000 })
      await activeContext.click(item.option_selector)
      return }
    case 'clickField': {
      let f = getField(ctx.fields, s.field)
      const idx = extractDynamicIndex(s)
      if (idx != null && f?.metadata?.dynamicIndex) f = withDynamicIndex(f, idx)

      // Support pour radio-group : chercher l'option basée sur la valeur du lead
      if (f.type === 'radio-group' && f.options) {
        const value = resolveValue(s, ctx)
        if (value === undefined || value === null) {
          if (s.optional === true) {
            console.log('[hl] clickField %s = SKIPPED (optional, radio-group, valeur manquante)', s.field)
            return
          }
          throw new Error(`Valeur manquante pour ${s.field} (leadKey=${s.leadKey||''})`)
        }
        const option = f.options.find(opt => String(opt.value) === String(value))
        if (!option) throw new Error(`Option radio non trouvée pour ${s.field}:${value}`)
        console.log('[hl] clickField (radio) %s = %s', s.field, value)
        await activeContext.click(option.selector)
        return
      }

      if (!f.selector) throw new Error(`Selector manquant pour ${s.field}`)

      // Si optional, vérifier d'abord si l'élément existe
      if (s.optional === true) {
        try {
          await activeContext.waitForSelector(f.selector, { state: 'attached', timeout: 1000 })
          await activeContext.click(f.selector)
          console.log('[hl] clickField %s (optional, found)', s.field)
        } catch (err) {
          console.log('[hl] clickField %s = SKIPPED (optional, not found)', s.field)
        }
        return
      }

      await activeContext.click(f.selector)
      return }
    case 'sleep': {
      await new Promise(r => setTimeout(r, s.timeout_ms || 0))
      return }
    case 'enterFrame': {
      if (!s.selector) throw new Error('selector requis pour enterFrame')
      // Toujours chercher l'iframe depuis la page principale
      const mainPage = contextStack[0]
      await mainPage.waitForSelector(s.selector, { timeout: s.timeout_ms || 15000 })
      const frameHandle = await mainPage.$(s.selector)
      if (!frameHandle) throw new Error(`Iframe introuvable: ${s.selector}`)
      const frame = await frameHandle.contentFrame()
      if (!frame) throw new Error(`Impossible d'accéder au contenu de l'iframe: ${s.selector}`)
      contextStack.push(frame)
      console.log('[hl] enterFrame %s - contexte empilé (profondeur: %d)', s.selector, contextStack.length)
      return }
    case 'exitFrame': {
      if (contextStack.length <= 1) {
        console.log('[hl] exitFrame - déjà au contexte principal, ignoré')
        return
      }
      contextStack.pop()
      console.log('[hl] exitFrame - contexte dépilé (profondeur: %d)', contextStack.length)
      return }
    default:
      throw new Error('Type inconnu (HL): ' + s.type)
  }
}

function resolveValue(step, ctx) {
  if (step.value !== undefined) return step.value
  if (typeof step.leadKey === 'string') return getByPath(ctx.lead, step.leadKey)
  return undefined
}

function parseValueTemplates(value, ctx) {
  if (!value || typeof value !== 'string') return value

  let result = value

  // Replace {credentials.username}
  result = result.replace(/\{credentials\.username\}/g, ctx.username || '')
  // Replace {credentials.password}
  result = result.replace(/\{credentials\.password\}/g, ctx.password || '')

  // Replace {env.VAR}
  result = result.replace(/\{env\.([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, varName) => {
    return process.env[varName] || ''
  })

  // Replace {lead.path.to.value}
  result = result.replace(/\{lead\.([^}]+)\}/g, (match, path) => {
    const val = getByPath(ctx.lead, path)
    return val !== undefined && val !== null ? String(val) : ''
  })

  return result
}

function getByPath(obj, pth) { try { return pth.split('.').reduce((o,k)=>o?.[k], obj) } catch { return undefined } }
function pickLead(lead, keys) { for (const k of keys) { const v = getByPath(lead, k); if (v !== undefined) return v } return null }

// ---------------- utilities (shared style) ----------------
function pad2(n){return String(n).padStart(2,'0')}
function tsId(){ const d=new Date(); const s=`${d.getFullYear()}${pad2(d.getMonth()+1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`; const r=Math.random().toString(36).slice(2,8); return `${s}-${r}` }
function ensureDir(p){ fs.mkdirSync(p, { recursive:true }) }
function writeJson(file, data){ ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(data,null,2), 'utf-8') }
function writeText(file, data){ ensureDir(path.dirname(file)); fs.writeFileSync(file, data, 'utf-8') }
function appendText(file, data){ ensureDir(path.dirname(file)); fs.appendFileSync(file, data, 'utf-8') }

// ---------------- dynamic index helpers ----------------
function extractDynamicIndex(step){
  // Try to infer index from leadKey: collection[N] or collection.N.xxx
  const lk = typeof step.leadKey === 'string' ? step.leadKey : ''

  // Match array bracket notation: collection[N]
  let m = lk.match(/\[(\d+)\]/)
  if (m) return Number(m[1])

  // Match dot notation: collection.N.xxx or collection.N at end
  m = lk.match(/\.(\d+)(?:\.|$)/)
  if (m) return Number(m[1])

  // Otherwise, attempt from a value template like {lead.collection[N].xxx}
  if (typeof step.value === 'string') {
    m = step.value.match(/\{\s*lead\.[^}]*\[(\d+)\]/)
    if (m) return Number(m[1])
  }

  return null
}

function withDynamicIndex(fieldDef, i){
  const clone = JSON.parse(JSON.stringify(fieldDef))

  // Système de templating générique basé sur placeholder {i}
  const placeholder = clone?.metadata?.dynamicIndex?.placeholder || '{i}'
  const indexBase = clone?.metadata?.dynamicIndex?.indexBase ?? 0
  const actualIndex = i + indexBase

  const apply = (sel) => {
    if (!sel || typeof sel !== 'string') return sel
    // Escape placeholder for regex (handles {i}, {{i}}, etc.)
    const escapedPlaceholder = placeholder.replace(/[{}]/g, '\\$&')
    return sel.replace(new RegExp(escapedPlaceholder, 'g'), String(actualIndex))
  }

  if (clone.selector) clone.selector = apply(clone.selector)
  if (clone?.options?.open_selector) clone.options.open_selector = apply(clone.options.open_selector)
  // Apply to all items if they have selectors with placeholders
  if (clone?.options?.items) {
    for (const item of clone.options.items) {
      if (item.option_selector) item.option_selector = apply(item.option_selector)
    }
  }

  return clone
}
function redactText(s, r){ try { return s.replace(new RegExp(r,'gi'), '$1=***') } catch { return s } }
function detectChromePathCandidates(){ const local = process.env.LOCALAPPDATA || ''; return ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',`${local}/Google/Chrome/Application/chrome.exe`].map(p=>path.normalize(p)) }
function detectChromePathFallback(){ for (const p of detectChromePathCandidates()) { try { if (fs.existsSync(p)) return p } catch {} } return undefined }
function slugify(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') }

async function maybeCollect(p){
  if (!p) return
  try {
    await p
  } catch (err) {
    console.error('[maybeCollect] Erreur lors de la capture:', err.message)
  }
}
function wants(_mode, onError){ return v => { if (!v || v==='none') return false; if (v==='all') return true; if (v==='steps' && !onError) return true; if (v==='errors' && onError) return true; return false } }
function stepCollectors(page, activeContext, index, step, { domDir, jsDir, a11y, domMode, jsMode, onError=false, ctx }){
  const should = wants(null, onError)
  const tasks = []
  if (should(domMode)) tasks.push(collectDom(activeContext, index, step, domDir))
  if (a11y && should(domMode)) tasks.push(collectA11y(activeContext, index, domDir))

  // Résoudre le selector depuis field-definitions si nécessaire
  let selectorForJS = step.selector
  if (!selectorForJS && step.field && ctx?.fields) {
    try {
      let field = getField(ctx.fields, step.field)

      // Gérer les dynamic fields avec {i}
      const dynamicIdx = extractDynamicIndex(step)
      if (dynamicIdx != null && field?.metadata?.dynamicIndex) {
        field = withDynamicIndex(field, dynamicIdx)
        console.log(`[stepCollectors] Dynamic field '${step.field}' résolu avec index ${dynamicIdx}`)
      }

      selectorForJS = field?.selector
      if (!selectorForJS) {
        console.warn(`[stepCollectors] Pas de selector pour field '${step.field}' au step ${index+1}`)
      }
    } catch (err) {
      console.warn(`[stepCollectors] Erreur résolution field '${step.field}':`, err.message)
    }
  }

  if (should(jsMode) && selectorForJS) {
    tasks.push(collectJsListeners(page, activeContext, index, step, selectorForJS, jsDir))
  }

  return Promise.allSettled(tasks)
}

function renderReportHtml(manifest){
  const data = JSON.stringify(manifest)
  return "<!doctype html>"+"<html lang=\"fr\"><head>"+"<meta charset=\"utf-8\"/>"+"<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/>"+"<title>Run "+escapeHtml(manifest.run?.id||'')+"</title>"+"<style>body{font-family:system-ui,Segoe UI,Arial,sans-serif;margin:20px;background:#0b0c10;color:#e6e6e6}.h{display:flex;gap:12px;align-items:center}.tag{padding:2px 6px;border-radius:4px;background:#1f2833;color:#66fcf1;font-size:12px}table{border-collapse:collapse;width:100%;margin-top:16px}th,td{border-bottom:1px solid #2b2f36;padding:8px;text-align:left;font-size:14px}tr:hover{background:#13161c}img{max-width:320px;border:1px solid #2b2f36;border-radius:4px}.ok{color:#7CFC00}.err{color:#ff6b6b}.small{opacity:.7;font-size:12px}.mono{font-family:ui-monospace,Consolas,monospace}</style></head><body>"+"<div class=\"h\">"+"<h1 style=\"margin:0\">Flow: "+escapeHtml(manifest.run?.slug||'')+"</h1>"+"<span class=\"tag\">"+escapeHtml(manifest.run?.mode||'')+"</span>"+"<span class=\"small\">Chrome: <span class=\"mono\">"+escapeHtml(manifest.run?.chrome||'')+"</span></span>"+"<span class=\"small\">Début: "+escapeHtml(manifest.run?.startedAt||'')+"</span>"+"<span class=\"small\">Fin: "+escapeHtml(manifest.run?.finishedAt||'')+"</span>"+"<a class=\"small\" href=\"index.json\" target=\"_blank\">index.json</a>"+(manifest.artifacts?.trace?"<a class=\"small\" href=\"trace/trace.zip\">trace.zip</a>":"")+(manifest.artifacts?.har?"<a class=\"small\" href=\"network/har.har\">har.har</a>":"")+"</div>"+"<table><thead><tr><th>#</th><th>Type</th><th>Statut</th><th>Durée</th><th>Capture</th><th>Liens</th></tr></thead>"+"<tbody id=\"rows\"></tbody></table>"+"<script>\nconst data = "+data+";\nconst tbody = document.getElementById('rows');\nfor (const s of (data.steps||[])) {\n  const tr = document.createElement('tr');\n  tr.innerHTML = '<td>'+ (s.index+1) +'</td>' + '<td>'+ s.type +'</td>' + '<td class=\\\"' + (s.ok?'ok':'err') + '\\\">' + (s.ok?'OK':'ERREUR') + '</td>' + '<td>'+ (s.ms||'') +' ms</td>' + '<td>' + (s.screenshot?'<img src=\\\"'+s.screenshot+'\\\"/>':'') + '</td>' + '<td class=\\\"small\\\">' + linkIf('DOM','dom/step-'+pad(s.index+1)+'.html') + ' ' + linkIf('FOCUS','dom/step-'+pad(s.index+1)+'.focus.html') + ' ' + linkIf('LISTENERS','js/step-'+pad(s.index+1)+'.listeners.json') + '</td>';\n  tbody.appendChild(tr);\n}\nfunction pad(n){return String(n).padStart(2,'0')}\nfunction linkIf(label, href){return '<a href=\\\"'+href+'\\\" target=\\\"_blank\\\">'+label+'</a>'}\n</script>"+"</body></html>"
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])) }

async function collectDom(activeContext, index, step, domDir){
  try {
    // Vérifier que le contexte existe et n'est pas fermé
    if (!activeContext || activeContext.isClosed?.()) {
      console.warn(`[collectDom] Contexte fermé pour step ${index+1}`)
      return
    }

    const full = await activeContext.content()

    if (!full || full.trim().length < 100) {
      console.warn(`[collectDom] DOM vide ou trop court pour step ${index+1}: ${full?.length || 0} chars`)
    }

    writeText(path.join(domDir, `step-${String(index+1).padStart(2,'0')}.html`), full)
  } catch (err) {
    console.error(`[collectDom] Erreur step ${index+1}:`, err.message)
  }
}
async function collectA11y(activeContext, index, domDir){
  try {
    // A11y snapshot est seulement disponible sur Page, pas sur Frame
    if (!activeContext.accessibility) {
      return
    }
    const snap = await activeContext.accessibility.snapshot({ interestingOnly:false })
    writeJson(path.join(domDir, `step-${String(index+1).padStart(2,'0')}.a11y.json`), snap)
  } catch {}
}

async function collectJsListeners(page, activeContext, index, step, selector, jsDir){
  try {
    console.log(`[collectJsListeners] Step ${index+1}: Début capture pour selector: "${selector}"`)

    // CDP fonctionne seulement avec la page principale, pas les frames
    if (!activeContext.context) {
      console.log(`[collectJsListeners] Step ${index+1}: Skipped (frame context, CDP not supported)`)
      return
    }

    const client = await page.context().newCDPSession(page)
    console.log(`[collectJsListeners] Step ${index+1}: CDP session créée`)

    await client.send('DOM.enable')
    await client.send('Debugger.enable')

    const evalRes = await client.send('Runtime.evaluate', {
      expression: `document.querySelector(${JSON.stringify(selector)})`,
      includeCommandLineAPI:true,
      returnByValue:false
    })

    const objId = evalRes.result.objectId
    if (!objId) {
      console.warn(`[collectJsListeners] Step ${index+1}: Élément non trouvé pour selector "${selector}"`)
      return
    }

    console.log(`[collectJsListeners] Step ${index+1}: Élément trouvé, objId=${objId}`)

    const evts = await client.send('DOMDebugger.getEventListeners', {
      objectId: objId,
      depth:-1,
      pierce:true
    })

    const listeners = evts.listeners||[]
    console.log(`[collectJsListeners] Step ${index+1}: ${listeners.length} listener(s) trouvé(s)`)

    const listenersData = []
    for (const l of listeners){
      const info = {
        type:l.type,
        useCapture:l.useCapture,
        passive:l.passive,
        once:l.once,
        scriptId:l.scriptId,
        lineNumber:l.lineNumber,
        columnNumber:l.columnNumber
      }

      try {
        if (l.scriptId){
          const src = await client.send('Debugger.getScriptSource', { scriptId:l.scriptId })
          const dir = path.join(jsDir,'scripts')
          const name = `script-${l.scriptId}.js`
          writeText(path.join(dir,name), src.scriptSource||'')
          info.scriptFile = `js/scripts/${name}`
        }
      } catch (scriptErr) {
        console.warn(`[collectJsListeners] Step ${index+1}: Erreur récupération script ${l.scriptId}:`, scriptErr.message)
      }

      listenersData.push(info)
    }

    // Créer objet avec metadata + listeners
    const output = {
      metadata: {
        stepIndex: index,
        stepType: step.type,
        stepLabel: step.label || null,
        stepField: step.field || null,
        selector: selector,
        timestamp: new Date().toISOString(),
        objectId: objId,
        listenersCount: listeners.length
      },
      listeners: listenersData
    }

    const filePath = path.join(jsDir, `step-${String(index+1).padStart(2,'0')}.listeners.json`)
    writeJson(filePath, output)
    console.log(`[collectJsListeners] Step ${index+1}: Fichier écrit: ${filePath}`)

  } catch (err) {
    console.error(`[collectJsListeners] Step ${index+1} ERREUR:`, err.message)
    console.error(`[collectJsListeners] Selector était: "${selector}"`)
    if (err.stack) console.error(err.stack)
  }
}

export function describeHL(s){ switch (s.type){ case 'goto': return `Aller sur ${s.url}`; case 'fillField': return `Remplir ${s.field}`; case 'toggleField': return `Toggle ${s.field} -> ${s.state}`; case 'selectField': return `Sélectionner ${s.field}`; case 'waitForField': return `Attendre ${s.field}`; case 'clickField': return `Cliquer ${s.field}`; case 'acceptConsent': return 'Consentement'; case 'sleep': return `Pause ${s.timeout_ms||0}ms`; case 'enterFrame': return `Entrer dans iframe ${s.selector}`; case 'exitFrame': return `Sortir de l'iframe`; default: return s.type } }
