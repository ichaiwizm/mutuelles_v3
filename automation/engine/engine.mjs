// Unified engine: runs a flow using platform field-definitions + lead values
// No DB dependencies - credentials from .env or CLI flags only.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { chromium } from 'playwright-core'
import { detectChromePath } from './browser/ChromeDetector.mjs'

// Import utils
import { ensureDir, writeJson, appendText } from './utils/fileSystem.mjs'
import { tsId } from './utils/timestamp.mjs'
import { slugify } from './utils/text.mjs'

// Import resolvers
import { TemplateResolver } from './resolvers/TemplateResolver.mjs'
import { ValueResolver } from './resolvers/ValueResolver.mjs'
import { FieldResolver } from './resolvers/FieldResolver.mjs'
import { ConditionEvaluator } from './resolvers/ConditionEvaluator.mjs'

// Import commands infrastructure
import { CommandRegistry } from './commands/CommandRegistry.mjs'
import { SleepCommand } from './commands/utility/SleepCommand.mjs'
import { CommentCommand } from './commands/utility/CommentCommand.mjs'
import { GotoCommand } from './commands/navigation/GotoCommand.mjs'
import { WaitForFieldCommand } from './commands/navigation/WaitForFieldCommand.mjs'
import { WaitNetworkIdleCommand } from './commands/navigation/WaitNetworkIdleCommand.mjs'
import { PressKeyCommand } from './commands/interaction/PressKeyCommand.mjs'
import { ScrollIntoViewCommand } from './commands/interaction/ScrollIntoViewCommand.mjs'
import { AcceptConsentCommand } from './commands/interaction/AcceptConsentCommand.mjs'
import { EnterFrameCommand } from './commands/frames/EnterFrameCommand.mjs'
import { ExitFrameCommand } from './commands/frames/ExitFrameCommand.mjs'
import { FillFieldCommand } from './commands/forms/FillFieldCommand.mjs'
import { TypeFieldCommand } from './commands/forms/TypeFieldCommand.mjs'
import { ToggleFieldCommand } from './commands/forms/ToggleFieldCommand.mjs'
import { SelectFieldCommand } from './commands/forms/SelectFieldCommand.mjs'
import { ClickFieldCommand } from './commands/forms/ClickFieldCommand.mjs'

// Import artifacts managers
import { ScreenshotManager } from './artifacts/ScreenshotManager.mjs'
import { DomCollector } from './artifacts/DomCollector.mjs'
import { describeHL } from './utils/stepDescriber.mjs'

export async function runHighLevelFlow({ fieldsFile, flowFile, leadFile, leadData, username, password, outRoot='data/runs', mode='dev_private', chrome=null, video=false, dom='errors', a11y=false, keepOpen=true, redact='(password|token|authorization|cookie)=([^;\\s]+)', onProgress=null }) {
  // Read files first
  const fields = JSON.parse(fs.readFileSync(fieldsFile, 'utf-8'))
  const flow = JSON.parse(fs.readFileSync(flowFile, 'utf-8'))
  const lead = leadData || (leadFile ? JSON.parse(fs.readFileSync(leadFile, 'utf-8')) : {})

  const platform = fields.platform || flow.platform
  const slug = flow.slug || path.basename(flowFile).replace(/\.json$/,'')

  // Create runDir early (before browser launch and other heavy operations)
  ensureDir(outRoot)
  const runId = `${slug}-${tsId()}`
  const runDir = path.join(outRoot, slug, runId)
  ensureDir(runDir)

  const progressFile = path.join(runDir, 'progress.ndjson')
  const screenshotsDir = path.join(runDir, 'screenshots')
  const domDir = path.join(runDir, 'dom')
  const traceDir = path.join(runDir, 'trace')
  const videoDir = path.join(runDir, 'video')
  ensureDir(screenshotsDir); ensureDir(domDir)

  const emit = (evt) => { const rec = { ts:new Date().toISOString(), ...evt }; appendText(progressFile, JSON.stringify(rec)+'\n'); console.log('[run]', evt.type, evt.status||'', evt.message||'') }

  // Chrome detection
  const candidates = []
  if (chrome) candidates.push(chrome)
  const detected = detectChromePath()
  if (detected) candidates.push(detected)
  const chromePath = candidates.find(p => { try { return p && fs.existsSync(p) } catch { return false } })
  const useChannel = !chromePath ? 'chrome' : null

  // Credentials provided by caller (.env or CLI flags)
  if (!username || !password) throw new Error('Missing credentials - use .env (PLATFORM_USERNAME/PASSWORD or FLOW_USERNAME/PASSWORD) or --username/--password flags')

  const meta = { run:{ id:runId, slug, platform, startedAt:new Date().toISOString(), mode, chrome: chromePath, profileDir:null }, env:{ os:`${os.platform()} ${os.release()}`, node: process.versions.node }, options: { outRoot, mode } }

  // Create resolver instances
  const templateResolver = new TemplateResolver()
  const valueResolver = new ValueResolver()
  const fieldResolver = new FieldResolver()
  const conditionEvaluator = new ConditionEvaluator(valueResolver)

  // Create artifact managers
  const screenshotManager = new ScreenshotManager()
  const domCollector = new DomCollector()

  const ctx = { redact, platform, fields, lead, username, password, resolvers: { template: templateResolver, value: valueResolver, field: fieldResolver } }

  // Create command registry and register all commands
  const commandRegistry = new CommandRegistry()
  // Note: command context will be updated dynamically during execution
  const dummyContext = { ctx, resolvers: { template: templateResolver, value: valueResolver, field: fieldResolver } }

  commandRegistry.register('sleep', new SleepCommand(dummyContext))
  commandRegistry.register('comment', new CommentCommand(dummyContext))
  commandRegistry.register('goto', new GotoCommand(dummyContext))
  commandRegistry.register('waitForField', new WaitForFieldCommand(dummyContext))
  commandRegistry.register('waitForNetworkIdle', new WaitNetworkIdleCommand(dummyContext))
  commandRegistry.register('pressKey', new PressKeyCommand(dummyContext))
  commandRegistry.register('scrollIntoView', new ScrollIntoViewCommand(dummyContext))
  commandRegistry.register('acceptConsent', new AcceptConsentCommand(dummyContext))
  commandRegistry.register('enterFrame', new EnterFrameCommand(dummyContext))
  commandRegistry.register('exitFrame', new ExitFrameCommand(dummyContext))
  commandRegistry.register('fillField', new FillFieldCommand(dummyContext))
  commandRegistry.register('typeField', new TypeFieldCommand(dummyContext))
  commandRegistry.register('toggleField', new ToggleFieldCommand(dummyContext))
  commandRegistry.register('selectField', new SelectFieldCommand(dummyContext))
  commandRegistry.register('clickField', new ClickFieldCommand(dummyContext))

  let browser = null, context = null, page = null, tracingStarted = false
  try {
    if (mode === 'dev' || mode === 'dev_private') {
      const launchOpts = { headless: false, args: ['--incognito'] }
      if (chromePath) launchOpts.executablePath = chromePath
      if (useChannel) launchOpts.channel = useChannel
      browser = await chromium.launch(launchOpts)
      const ctxOpts = {}
      if (video) ctxOpts.recordVideo = { dir: videoDir }
      context = await browser.newContext(ctxOpts)
    } else {
      const launchOpts = { headless: true }
      if (chromePath) launchOpts.executablePath = chromePath
      if (useChannel) launchOpts.channel = useChannel
      browser = await chromium.launch(launchOpts)
      const ctxOpts = {}
      if (video) ctxOpts.recordVideo = { dir: videoDir }
      context = await browser.newContext(ctxOpts)
    }
    page = context.pages()[0] || await context.newPage()
    page.setDefaultTimeout(15000)
    context.on('page', (p) => { try { page = p; page.setDefaultTimeout(15000) } catch (err) { console.warn('[Browser] Failed to set timeout on new page:', err.message) } })

    // Support iframes: stack de contextes (page principale, puis frames)
    const contextStack = [page]
    const getCurrentContext = () => contextStack[contextStack.length - 1]

    if (flow.trace === 'on' || flow.trace === 'retain-on-failure') { await context.tracing.start({ screenshots:true, snapshots:true, sources:true }); tracingStarted = true }

    const stepsSummary = []
    emit({ type:'run', status:'start', message:`Run ${slug} (${mode})` })

    for (let i=0;i<flow.steps.length;i++) {
      const step = flow.steps[i]
      const label = step.label || step.type || `step-${i+1}`

      // Support pour skipIfNot: sauter le step si la condition leadKey est falsy
      if (step.skipIfNot) {
        const condValue = valueResolver.resolve({ leadKey: step.skipIfNot }, ctx)
        if (condValue === undefined || condValue === null || condValue === false || condValue === '' || (Array.isArray(condValue) && condValue.length === 0)) {
          console.log('[hl] step %d SKIPPED (skipIfNot: %s is falsy)', i, step.skipIfNot)
          stepsSummary.push({ index:i, type:step.type, ok:true, skipped:true, reason:'skipIfNot', ms: 0 })

          // Call onProgress callback for skipped step
          if (onProgress) {
            onProgress({
              stepIndex: i,
              totalSteps: flow.steps.length,
              stepMessage: describeHL(step),
              status: 'skipped'
            })
          }

          continue
        }
      }

      // Support pour skipIf: sauter le step si la condition complexe est vraie
      if (step.skipIf) {
        const shouldSkip = conditionEvaluator.evaluateSkipIfCondition(step.skipIf, ctx)
        if (shouldSkip) {
          console.log('[hl] step %d SKIPPED (skipIf condition matched)', i)
          stepsSummary.push({ index:i, type:step.type, ok:true, skipped:true, reason:'skipIf', ms: 0 })

          // Call onProgress callback for skipped step
          if (onProgress) {
            onProgress({
              stepIndex: i,
              totalSteps: flow.steps.length,
              stepMessage: describeHL(step),
              status: 'skipped'
            })
          }

          continue
        }
      }

      emit({ type:step.type, status:'start', stepIndex:i, message: describeHL(step) })
      const t0 = Date.now()
      const shotName = `step-${String(i+1).padStart(2,'0')}-${slugify(label)}.png`
      const shotPath = path.join(screenshotsDir, shotName)
      try {
        // Update command context dynamically
        const commandContext = { ctx, page, contextStack, getCurrentContext, resolvers: { field: fieldResolver, value: valueResolver, template: templateResolver } }
        await execHLStep(step, commandRegistry, commandContext)
        await screenshotManager.capture(page, shotPath)
        await domCollector.maybeCollect(getCurrentContext(), i, step, domDir, dom, a11y, false)
        emit({ type:step.type, status:'success', stepIndex:i, screenshotPath: path.relative(runDir, shotPath) })
        stepsSummary.push({ index:i, type:step.type, ok:true, ms: Date.now()-t0, screenshot:`screenshots/${shotName}` })

        // Call onProgress callback for successful step
        if (onProgress) {
          onProgress({
            stepIndex: i,
            totalSteps: flow.steps.length,
            stepMessage: describeHL(step),
            status: 'ok'
          })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const errName = `error-${String(i+1).padStart(2,'0')}.png`
        const errPath = path.join(screenshotsDir, errName)
        try {
          await screenshotManager.capture(page, errPath)
        } catch (screenshotErr) {
          console.warn('[Screenshot] Failed to capture error screenshot:', screenshotErr.message)
        }
        await domCollector.maybeCollect(getCurrentContext(), i, step, domDir, dom, a11y, true)
        emit({ type:step.type, status:'error', stepIndex:i, message: msg, screenshotPath: path.relative(runDir, errPath) })
        stepsSummary.push({ index:i, type:step.type, ok:false, error: msg, screenshot:`screenshots/${errName}` })
        break
      }
    }

    meta.run.finishedAt = new Date().toISOString()
    const manifest = { ...meta, steps: stepsSummary, artifacts: { screenshotsDir:'screenshots', trace: tracingStarted ? 'trace/trace.zip' : null, video: video ? 'video' : null, progress:'progress.ndjson' } }
    writeJson(path.join(runDir,'index.json'), manifest)
    if (tracingStarted) { ensureDir(traceDir); await context.tracing.stop({ path: path.join(traceDir,'trace.zip') }) }

    // Check for failed steps and propagate error to runner
    const failedSteps = stepsSummary.filter(s => s.ok === false && !s.skipped)
    if (failedSteps.length > 0) {
      const firstFailed = failedSteps[0]
      const errorMsg = `Step ${firstFailed.index + 1} (${firstFailed.type}) failed: ${firstFailed.error}`

      // Close browser gracefully on failure
      try { await context?.close() } catch (err) {
        console.debug('[Browser] Context close failed:', err.message)
      }
      try { await browser?.close() } catch (err) {
        console.debug('[Browser] Browser close failed:', err.message)
      }

      emit({ type:'run', status:'error', message: errorMsg })

      // Create enriched error with runDir
      const error = new Error(errorMsg)
      error.runDir = runDir
      throw error
    }

    if (!keepOpen) {
      try { await context?.close() } catch (err) {
        console.debug('[Browser] Context close failed:', err.message)
      }
      try { await browser?.close() } catch (err) {
        console.debug('[Browser] Browser close failed:', err.message)
      }
      emit({ type:'run', status:'success', message:`Terminé – artefacts: ${path.relative(process.cwd(), runDir)}` })
    } else {
      // keepOpen: attendre que l'utilisateur ferme le navigateur
      emit({ type:'run', status:'success', message:`Terminé – Navigateur laissé ouvert, fermez-le manuellement` })
      console.log('[hl] ⏸  keepOpen=true - Navigateur laissé ouvert. Fermez-le pour terminer.')
      await waitForBrowserClose(browser, context)
    }
    return { runDir }
  } catch (err) {
    // Handle unexpected errors
    console.error('[Engine] Fatal error:', err)
    emit({ type:'run', status:'error', message: err.message || String(err) })

    // Try to close browser on error
    try {
      await context?.close()
      await browser?.close()
    } catch (closeErr) {
      console.warn('[Browser] Failed to close browser after error:', closeErr.message)
    }

    // Enrich error with runDir if it was created
    if (runDir) {
      const enrichedError = new Error(err.message || String(err))
      enrichedError.stack = err.stack
      enrichedError.runDir = runDir
      throw enrichedError
    }

    throw err
  }
}

// ---------------- HL primitives ----------------
async function execHLStep(step, commandRegistry, commandContext) {
  // Execute command using registry (all 14 step types)
  if (!commandRegistry || !commandRegistry.has(step.type)) {
    throw new Error(`Unknown step type: ${step.type}`)
  }

  return await commandRegistry.execute(step, commandContext)
}

async function waitForBrowserClose(browser, context) {
  await new Promise((resolve) => {
    const checkPagesInterval = setInterval(() => {
      try {
        const pages = context?.pages() || []
        if (pages.length === 0) { clearInterval(checkPagesInterval); console.log('[hl] ✓ Toutes les pages fermées'); resolve() }
      } catch { clearInterval(checkPagesInterval); resolve() }
    }, 500)
    if (browser) browser.once('disconnected', () => { clearInterval(checkPagesInterval); console.log('[hl] ✓ Navigateur complètement fermé'); resolve() })
  })
  try { await context?.close(); await browser?.close() } catch {}
}
