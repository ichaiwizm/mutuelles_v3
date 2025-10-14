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
        await safeScreenshot(page, shotPath)
        await maybeCollect(stepCollectors(page, getCurrentContext(), i, s, { domDir, jsDir, a11y, domMode: dom, jsMode: jsinfo, ctx }))
        emit({ type:s.type, status:'success', stepIndex:i, screenshotPath: path.relative(runDir, shotPath) })
        stepsSummary.push({ index:i, type:s.type, ok:true, ms: Date.now()-t0, screenshot:`screenshots/${shotName}` })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const errName = `error-${String(i+1).padStart(2,'0')}.png`
        const errPath = path.join(screenshotsDir, errName)
        try { await ensurePage(); await safeScreenshot(page, errPath) } catch {}
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
function getFieldByKey(fields, key) {
  if (!fields?.fields) throw new Error('fields.fields manquant')
  const f = fields.fields.find((x)=>x.key===key)
  if (!f) throw new Error(`Champ introuvable: ${key}`)
  return f
}

function getFieldByDomain(fields, domainKey) {
  if (!fields?.fields) throw new Error('fields.fields manquant')
  const f = fields.fields.find((x)=>x.domainKey===domainKey)
  if (!f) throw new Error(`Champ introuvable (domain): ${domainKey}`)
  return f
}

function resolveFieldDef(ctx, step) {
  const hasDomain = typeof step.domainField === 'string' && step.domainField.length > 0
  const hasKey = typeof step.field === 'string' && step.field.length > 0
  if (hasDomain) return getFieldByDomain(ctx.fields, step.domainField)
  if (hasKey) return getFieldByKey(ctx.fields, step.field)
  throw new Error('Step incomplet: ni field ni domainField')
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
      let f = resolveFieldDef(ctx, s)
      const idx = extractDynamicIndex(s)
      if (idx != null && f?.metadata?.dynamicIndex) f = withDynamicIndex(f, idx)
      if (!f.selector) throw new Error(`Selector manquant pour ${s.field||s.domainField}`)
      await activeContext.waitForSelector(f.selector, { state: 'attached' })
      return }
    case 'waitForNetworkIdle': {
      // Attendre que le réseau soit idle (sur la page principale)
      const timeout = typeof s.timeout_ms === 'number' ? s.timeout_ms : 20000
      await page.waitForLoadState('networkidle', { timeout })
      return }
    case 'fillField': {
      let f = resolveFieldDef(ctx, s)
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
          console.log('[hl] fillField %s = SKIPPED (optional, valeur manquante)', s.field||s.domainField)
          return
        }
        throw new Error(`Valeur manquante pour ${s.field||s.domainField} (leadKey=${s.leadKey||''}, value=${s.value||''})`)
      }
      if (!f.selector) throw new Error(`Selector manquant pour ${s.field||s.domainField}`)
      const v = String(value)
      const logName = s.field || s.domainField || ''
      const logv = String(logName).toLowerCase().includes('password') ? '***' : v
      console.log('[hl] fillField %s = %s', logName, logv)

      // Vérifier si la méthode jQuery est demandée explicitement
      const useJQueryMethod = s.method === 'jquery'

      if (useJQueryMethod) {
        // Méthode jQuery: utiliser evaluate pour manipuler jQuery datepicker directement
        try {
          const result = await activeContext.evaluate(({selector, value}) => {
            const elem = document.querySelector(selector)
            if (!elem) return { success: false, error: 'Element not found' }

            // Vérifier si jQuery est disponible
            if (typeof jQuery === 'undefined' && typeof $ === 'undefined') {
              return { success: false, error: 'jQuery not available' }
            }

            const $ = jQuery || window.$
            const $elem = $(elem)

            // Fermer le datepicker s'il est ouvert
            if ($elem.datepicker) {
              try {
                $elem.datepicker('hide')
              } catch (e) {}
            }

            // Définir la valeur de plusieurs façons pour garantir la persistance
            // 1. Définir l'attribut HTML value
            elem.value = value
            elem.setAttribute('value', value)

            // 2. Définir via jQuery
            $elem.val(value)

            // 3. Si datepicker existe, utiliser sa méthode setDate
            if ($elem.datepicker && typeof $elem.datepicker === 'function') {
              try {
                // Parser la date au format français DD/MM/YYYY
                const parts = value.split('/')
                if (parts.length === 3) {
                  const day = parseInt(parts[0], 10)
                  const month = parseInt(parts[1], 10) - 1 // mois est 0-indexed en JS
                  const year = parseInt(parts[2], 10)
                  const dateObj = new Date(year, month, day)
                  $elem.datepicker('setDate', dateObj)
                }
              } catch (e) {}
            }

            // 4. Déclencher TOUS les événements pour garantir la détection
            $elem.trigger('input')
            $elem.trigger('change')
            $elem.trigger('keyup')
            $elem.trigger('blur')

            // Marquer le champ comme valide (retirer classe d'erreur si présente)
            $elem.removeClass('error').addClass('valid')

            return { success: true, finalValue: elem.value, attrValue: elem.getAttribute('value') }
          }, { selector: f.selector, value: v })

          if (result.success) {
            console.log('[hl] fillField %s - date remplie via jQuery (value=%s)', s.field, result.finalValue)
          } else {
            throw new Error(result.error || 'jQuery method failed')
          }
        } catch (err) {
          console.log('[hl] fillField %s - méthode jQuery échouée: %s, fallback sur pressSequentially', s.field, err.message)
          // Fallback sur pressSequentially
          const locator = activeContext.locator(f.selector)
          await locator.click()
          await new Promise(r => setTimeout(r, 200))
          await locator.clear()
          await locator.pressSequentially(v, { delay: 50 })
          await new Promise(r => setTimeout(r, 200))
          await locator.press('Escape')
          await locator.blur()
          await new Promise(r => setTimeout(r, 300))
          console.log('[hl] fillField %s - date remplie via pressSequentially (fallback)', s.field)
        }
      } else {
        // Méthode standard: utiliser fill()
        await activeContext.fill(f.selector, v)
      }
      return }
    case 'typeField': {
      let f = resolveFieldDef(ctx, s)
      const idx = extractDynamicIndex(s)
      if (idx != null && f?.metadata?.dynamicIndex) f = withDynamicIndex(f, idx)
      let value = resolveValue(s, ctx)

      if (typeof value === 'string') {
        value = parseValueTemplates(value, ctx)
      }
      if (value === undefined || value === null || value === '') {
        if (s.optional === true) {
          console.log('[hl] typeField %s = SKIPPED (optional, valeur manquante)', s.field||s.domainField)
          return
        }
        throw new Error(`Valeur manquante pour ${s.field||s.domainField} (leadKey=${s.leadKey||''}, value=${s.value||''})`)
      }
      if (!f.selector) throw new Error(`Selector manquant pour ${s.field||s.domainField}`)
      const locator = activeContext.locator(f.selector)
      await locator.scrollIntoViewIfNeeded()
      await locator.click({ clickCount: 1 })
      await locator.fill('')
      await locator.pressSequentially(String(value), { delay: 40 })
      if (s.pressEnter === true) {
        await locator.press('Enter')
      }
      if (s.pressEscape === true) {
        await locator.press('Escape')
      }
      if (s.blur !== false) {
        await locator.blur().catch(()=>{})
      }
      await new Promise(r => setTimeout(r, s.postDelay_ms || 200))
      return }
    case 'pressKey': {
      // Appuyer sur une touche au niveau du champ (si fourni) sinon au clavier global
      const key = s.key || s.code || 'Escape'
      if (s.field || s.domainField) {
        let f = resolveFieldDef(ctx, s)
        const idx = extractDynamicIndex(s)
        if (idx != null && f?.metadata?.dynamicIndex) f = withDynamicIndex(f, idx)
        if (!f.selector) throw new Error(`Selector manquant pour ${s.field||s.domainField}`)
        const locator = activeContext.locator(f.selector)
        await locator.click({ force: true })
        await locator.press(key)
      } else {
        await activeContext.keyboard.press(key)
      }
      return }
    case 'scrollIntoView': {
      // Fait défiler jusqu'au champ visé pour fiabiliser le click/fill
      if (s.field || s.domainField) {
        let f = resolveFieldDef(ctx, s)
        const idx = extractDynamicIndex(s)
        if (idx != null && f?.metadata?.dynamicIndex) f = withDynamicIndex(f, idx)
        if (!f.selector) throw new Error(`Selector manquant pour ${s.field||s.domainField}`)
        await activeContext.locator(f.selector).scrollIntoViewIfNeeded()
      } else if (s.selector) {
        await activeContext.locator(s.selector).scrollIntoViewIfNeeded()
      }
      await new Promise(r => setTimeout(r, s.timeout_ms || 150))
      return }
    case 'toggleField': {
      let f = resolveFieldDef(ctx, s)
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
      let f = resolveFieldDef(ctx, s)
      const idx = extractDynamicIndex(s)
      if (idx != null && f?.metadata?.dynamicIndex) f = withDynamicIndex(f, idx)
      let value = resolveValue(s, ctx)
      if (typeof value === 'string') {
        value = parseValueTemplates(value, ctx)
      }
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
      console.log('[hl] selectField %s -> %s', s.field, String(value))

      // Si aucune liste d'items n'est fournie, utiliser selectOption directement
      if (!f?.options?.items || f.options.items.length === 0) {
        const stringValue = String(value)
        if (f?.options?.option_selector_template) {
          try {
            await activeContext.selectOption(open, stringValue)
            await new Promise(r => setTimeout(r, s.postDelay_ms || 200))
            return
          } catch (err) {
            await activeContext.click(open).catch(()=>{})
            await new Promise(r => setTimeout(r, 150))
            const optionSelector = buildOptionSelectorFromTemplate(f.options.option_selector_template, stringValue)
            const optionHandle = await activeContext.waitForSelector(optionSelector, { state: 'attached', timeout: 5000 })
            await optionHandle.evaluate((opt) => {
              const select = opt.closest('select')
              if (!select) return
              for (const other of Array.from(select.options)) {
                other.selected = false
                other.removeAttribute('selected')
              }
              select.value = opt.value
              opt.selected = true
              opt.setAttribute('selected', 'selected')
              select.dispatchEvent(new Event('input', { bubbles: true }))
              select.dispatchEvent(new Event('change', { bubbles: true }))
            })
            await new Promise(r => setTimeout(r, s.postDelay_ms || 200))
            return
          }
        }
        await activeContext.selectOption(open, stringValue)
        await new Promise(r => setTimeout(r, s.postDelay_ms || 200))
        return
      }

      await activeContext.click(open)
      await new Promise(r => setTimeout(r, 300))
      let item = f.options.items.find((it)=>String(it.value)===String(value))
      if (!item) {
        item = f.options.items.find((it)=>String(it.label).toLowerCase()===String(value).toLowerCase())
      }
      if (!item?.option_selector) throw new Error(`option_selector manquant pour ${s.field}:${value}`)
      await activeContext.waitForSelector(item.option_selector, { state: 'visible', timeout: 5000 })
      await activeContext.click(item.option_selector)
      return }
    case 'clickField': {
      let f = resolveFieldDef(ctx, s)
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
      // Deux modes génériques: par selector (iframe) ou par urlContains
      const mainPage = contextStack[0]
      let frame = null
      if (s.selector) {
        await mainPage.waitForSelector(s.selector, { timeout: s.timeout_ms || 15000 })
        const frameHandle = await mainPage.$(s.selector)
        if (!frameHandle) throw new Error(`Iframe introuvable: ${s.selector}`)
        frame = await frameHandle.contentFrame()
      } else if (s.urlContains) {
        const deadline = Date.now() + (s.timeout_ms || 15000)
        while (Date.now() < deadline) {
          const frames = mainPage.frames()
          frame = frames.find(fr => (fr.url() || '').includes(s.urlContains)) || null
          if (frame) break
          await new Promise(r => setTimeout(r, 200))
        }
        if (!frame) throw new Error(`Aucun frame avec url contenant "${s.urlContains}"`)
      } else {
        throw new Error('enterFrame requiert soit selector soit urlContains')
      }
      if (!frame) throw new Error('Impossible d\'accéder au contenu du frame')
      contextStack.push(frame)
      console.log('[hl] enterFrame %s - contexte empilé (profondeur: %d)', s.selector || `url~${s.urlContains}`, contextStack.length)
      return }
    case 'exitFrame': {
      if (contextStack.length <= 1) {
        console.log('[hl] exitFrame - déjà au contexte principal, ignoré')
        return
      }
      contextStack.pop()
      console.log('[hl] exitFrame - contexte dépilé (profondeur: %d)', contextStack.length)
      return }
    case 'comment': {
      // Commentaire pour structurer le flow - ignoré à l'exécution
      if (s.text) console.log('[hl] comment:', s.text)
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

/**
 * Get value from object using path notation
 * Supports both dot notation (a.b.c) and array notation (a[0].b, a.0.b)
 * Examples:
 *   getByPath(obj, 'subscriber.lastName') → obj.subscriber.lastName
 *   getByPath(obj, 'children[0].birthDate') → obj.children[0].birthDate
 *   getByPath(obj, 'children.0.birthDate') → obj.children[0].birthDate
 */
function getByPath(obj, pth) {
  try {
    if (!pth || !obj) return undefined
    // Convert bracket notation to dot notation: children[0].birthDate → children.0.birthDate
    const normalizedPath = pth.replace(/\[(\w+)\]/g, '.$1')
    // Split and reduce
    return normalizedPath.split('.').reduce((acc, key) => {
      if (acc === null || acc === undefined) return undefined
      return acc[key]
    }, obj)
  } catch {
    return undefined
  }
}

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
function buildOptionSelectorFromTemplate(template, value){
  const strValue = String(value)
  return template
    .replace(/\{\{value\}\}/g, strValue)
    .replace(/\{\{valueLower\}\}/g, strValue.toLowerCase())
    .replace(/\{\{valueUpper\}\}/g, strValue.toUpperCase())
}
async function safeScreenshot(page, file){
  try {
    await page.screenshot({ path:file })
  } catch (e) {
    const msg = String(e?.message||'')
    console.warn('[safeScreenshot] 1st attempt failed:', msg)
    try { await page.waitForLoadState('domcontentloaded', { timeout: 3000 }) } catch {}
    try { await page.screenshot({ path:file }) } catch (e2) { console.warn('[safeScreenshot] 2nd attempt failed:', String(e2?.message||'')) }
  }
}
function detectChromePathCandidates(){
  const local = process.env.LOCALAPPDATA || ''
  const list = [
    // Windows
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    `${local}/Google/Chrome/Application/chrome.exe`,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    // Linux (WSL/CI runners)
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium'
  ]
  return list.filter(Boolean).map(p=>path.normalize(p))
}
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

    // Fallback lisible pour les frames (pas de CDP)
    if (!activeContext.context) {
      try {
        // Certaines syntaxes Playwright (text=, :has-text()) ne sont pas supportées par querySelector.
        if (/(:has-text\(|^text=|>>)/.test(selector)) {
          const filePath = path.join(jsDir, `step-${String(index+1).padStart(2,'0')}.listeners.json`)
          const output = { metadata: { stepIndex:index, stepType: step.type, stepLabel: step.label||null, stepField: step.field||null, selector, timestamp:new Date().toISOString(), frameContext:true, skipped:'unsupported-selector-for-frame-fallback' }, listeners:{} }
          writeJson(filePath, output)
          console.log(`[collectJsListeners] Step ${index+1}: Fallback (frame) ignoré – sélecteur non supporté par querySelector`)
          return
        }
        const data = await activeContext.evaluate((sel) => {
          const el = document.querySelector(sel)
          if (!el) return { found:false }
          const evts = ['click','change','input','blur','focus','submit','keydown','keyup','keypress']
          const handlers = {}
          for (const e of evts) {
            const h = el[`on${e}`]
            handlers[e] = h ? (typeof h === 'function' ? 'function' : typeof h) : null
          }
          return {
            found: true,
            tag: el.tagName,
            id: el.id || null,
            class: el.className || null,
            hasInlineHandlers: Object.values(handlers).some(Boolean),
            handlers
          }
        }, selector)
        const output = {
          metadata: {
            stepIndex: index,
            stepType: step.type,
            stepLabel: step.label || null,
            stepField: step.field || null,
            selector,
            timestamp: new Date().toISOString(),
            frameContext: true
          },
          listeners: data?.found ? data.handlers : {}
        }
        const filePath = path.join(jsDir, `step-${String(index+1).padStart(2,'0')}.listeners.json`)
        writeJson(filePath, output)
        console.log(`[collectJsListeners] Step ${index+1}: Fallback (frame) écrit: ${filePath}`)
      } catch (e) {
        console.warn(`[collectJsListeners] Step ${index+1}: Fallback frame KO:`, e?.message || e)
      }
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

export function describeHL(s){
  switch (s.type){
    case 'goto': return `Aller sur ${s.url}`
    case 'fillField': return `Remplir ${s.domainField||s.field}`
    case 'typeField': return `Saisir ${s.domainField||s.field}`
    case 'toggleField': return `Toggle ${s.domainField||s.field} -> ${s.state}`
    case 'selectField': return `Sélectionner ${s.domainField||s.field}`
    case 'waitForField': return `Attendre ${s.domainField||s.field}`
    case 'waitForNetworkIdle': return 'Attendre network idle'
    case 'pressKey': return `Appuyer ${s.key||s.code||'Escape'}${(s.domainField||s.field)?` sur ${s.domainField||s.field}`:''}`
    case 'scrollIntoView': return `Scroller vers ${s.domainField||s.field}`
    case 'clickField': return `Cliquer ${s.domainField||s.field}`
    case 'acceptConsent': return 'Consentement'
    case 'sleep': return `Pause ${s.timeout_ms||0}ms`
    case 'enterFrame': return `Entrer dans iframe ${s.selector||('url~'+(s.urlContains||''))}`
    case 'exitFrame': return `Sortir de l'iframe`
    default: return s.type
  }
}
