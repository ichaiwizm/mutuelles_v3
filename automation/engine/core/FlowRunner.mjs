// High-level flow runner (refactor of engine.mjs) – no behavior change
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { ensureDir, writeJson } from '../utils/fileSystem.mjs'
import { tsId } from '../utils/timestamp.mjs'
import { slugify } from '../utils/text.mjs'
import { TemplateResolver } from '../resolvers/TemplateResolver.mjs'
import { ValueResolver } from '../resolvers/ValueResolver.mjs'
import { FieldResolver } from '../resolvers/FieldResolver.mjs'
import { ConditionEvaluator } from '../resolvers/ConditionEvaluator.mjs'
import { buildDefaultRegistry } from '../registry/index.mjs'
import { detectChromePath } from '../browser/ChromeDetector.mjs'
import { BrowserManager } from './BrowserManager.mjs'
import { ArtifactsPipeline } from './ArtifactsPipeline.mjs'
import { ProgressEmitter } from './ProgressEmitter.mjs'
import { RunError } from '../errors/RunError.mjs'
import { describeHL } from '../utils/stepDescriber.mjs'

export async function runHighLevelFlow({ fieldsFile, flowFile, leadFile, leadData, username, password, outRoot='data/runs', mode='dev_private', chrome=null, video=false, dom='errors', a11y=false, keepOpen=true, redact='(password|token|authorization|cookie)=([^;\\s]+)', onProgress=null, sessionRunId=null, onBrowserCreated=null }) {
  const fields = JSON.parse(fs.readFileSync(fieldsFile, 'utf-8'))
  const flow = JSON.parse(fs.readFileSync(flowFile, 'utf-8'))
  const lead = leadData || (leadFile ? JSON.parse(fs.readFileSync(leadFile, 'utf-8')) : {})

  const platform = fields.platform || flow.platform
  const slug = flow.slug || path.basename(flowFile).replace(/\.json$/,'')

  ensureDir(outRoot)
  const runId = `${slug}-${tsId()}`
  const runDir = path.join(outRoot, slug, runId)
  const screenshotsDir = path.join(runDir, 'screenshots')
  const domDir = path.join(runDir, 'dom')
  const traceDir = path.join(runDir, 'trace')
  const videoDir = path.join(runDir, 'video')
  ensureDir(runDir); ensureDir(screenshotsDir); ensureDir(domDir)

  const progress = new ProgressEmitter(runDir)

  const candidates = []
  if (chrome) candidates.push(chrome)
  const detected = detectChromePath()
  if (detected) candidates.push(detected)
  const chromePath = candidates.find(p => { try { return p && fs.existsSync(p) } catch { return false } })
  const useChannel = !chromePath ? 'chrome' : null

  if (!username || !password) throw new Error('Missing credentials - use .env (PLATFORM_USERNAME/PASSWORD or FLOW_USERNAME/PASSWORD) or --username/--password flags')

  const meta = { run:{ id:runId, slug, platform, startedAt:new Date().toISOString(), mode, chrome: chromePath, profileDir:null, sessionId: sessionRunId }, env:{ os:`${os.platform()} ${os.release()}`, node: process.versions.node }, options: { outRoot, mode } }

  const templateResolver = new TemplateResolver()
  const valueResolver = new ValueResolver()
  const fieldResolver = new FieldResolver()
  const conditionEvaluator = new ConditionEvaluator(valueResolver)

  const ctx = { redact, platform, fields, lead, username, password, resolvers: { template: templateResolver, value: valueResolver, field: fieldResolver } }
  const dummyContext = { ctx, resolvers: { template: templateResolver, value: valueResolver, field: fieldResolver } }
  const commandRegistry = buildDefaultRegistry(dummyContext)

  let browser=null, context=null, getPage=null, tracingStarted=false
  const artifacts = new ArtifactsPipeline({ runDir, domDir, screenshotsDir, traceDir })

  try {
    const bm = new BrowserManager({ chromePath, useChannel, videoDir: video ? videoDir : null })
    const launched = await bm.launch(mode)
    browser = launched.browser
    context = launched.context
    getPage = launched.getPage

    if (typeof onBrowserCreated === 'function') {
      try { onBrowserCreated(browser, context) } catch (err) { console.warn('[Engine] onBrowserCreated callback failed:', err.message) }
    }

    if (flow.trace === 'on' || flow.trace === 'retain-on-failure') { await context.tracing.start({ screenshots:true, snapshots:true, sources:true }); tracingStarted=true }

    const stepsSummary = []
    progress.emit({ type:'run', status:'start', message:`Run ${slug} (${mode})` })

    const getCurrentContext = () => getPage()

    for (let i=0;i<flow.steps.length;i++) {
      const step = flow.steps[i]
      const label = step.label || step.type || `step-${i+1}`

      if (step.skipIfNot) {
        const condValue = valueResolver.resolve({ leadKey: step.skipIfNot }, ctx)
        if (condValue === undefined || condValue === null || condValue === false || condValue === '' || (Array.isArray(condValue) && condValue.length === 0)) {
          console.log('[hl] step %d SKIPPED (skipIfNot: %s is falsy)', i, step.skipIfNot)
          stepsSummary.push({ index:i, type:step.type, ok:true, skipped:true, reason:'skipIfNot', ms: 0 })
          if (onProgress) onProgress({ stepIndex: i, totalSteps: flow.steps.length, stepMessage: describeHL(step), status: 'skipped' })
          continue
        }
      }

      if (step.skipIf) {
        const shouldSkip = conditionEvaluator.evaluateSkipIfCondition(step.skipIf, ctx)
        if (shouldSkip) {
          console.log('[hl] step %d SKIPPED (skipIf condition matched)', i)
          stepsSummary.push({ index:i, type:step.type, ok:true, skipped:true, reason:'skipIf', ms: 0 })
          if (onProgress) onProgress({ stepIndex: i, totalSteps: flow.steps.length, stepMessage: describeHL(step), status: 'skipped' })
          continue
        }
      }

    progress.emit({ type:step.type, status:'start', stepIndex:i, message: describeHL(step) })
      const t0 = Date.now()
      const shotName = () => `step-${String(i+1).padStart(2,'0')}-${slugify(label)}.png`
      const errName = () => `error-${String(i+1).padStart(2,'0')}.png`

      try {
        const commandContext = { ctx, page: getPage(), contextStack: [getPage()], getCurrentContext, resolvers: { field: fieldResolver, value: valueResolver, template: templateResolver } }
        await execHLStep(step, commandRegistry, commandContext)
        await artifacts.onStepOk({ page: getPage(), index:i, step, domMode:dom, a11y, getShotName: shotName, activeContext: getCurrentContext() })
        progress.emit({ type:step.type, status:'success', stepIndex:i, screenshotPath: path.join('screenshots', shotName()) })
        stepsSummary.push({ index:i, type:step.type, ok:true, ms: Date.now()-t0, screenshot:`screenshots/${shotName()}` })
        if (onProgress) onProgress({ stepIndex: i, totalSteps: flow.steps.length, stepMessage: describeHL(step), status: 'ok' })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const errPath = await artifacts.onStepError({ page: getPage(), index:i, step, domMode:dom, a11y, getErrName: errName, activeContext: getCurrentContext() })
        progress.emit({ type:step.type, status:'error', stepIndex:i, message: msg, screenshotPath: path.relative(runDir, errPath) })
        stepsSummary.push({ index:i, type:step.type, ok:false, error: msg, screenshot:`screenshots/${errName()}` })
        break
      }
    }

    meta.run.finishedAt = new Date().toISOString()
    const manifest = { ...meta, steps: stepsSummary, artifacts: { screenshotsDir:'screenshots', trace: tracingStarted ? 'trace/trace.zip' : null, video: video ? 'video' : null, progress:'progress.ndjson' } }
    writeJson(path.join(runDir,'index.json'), manifest)
    if (tracingStarted) {
      try {
        ensureDir(traceDir)
        await context.tracing.stop({ path: path.join(traceDir,'trace.zip') })
      } catch (err) {
        // Swallow errors when the context/browser has already been closed by a stop
        const msg = err?.message || ''
        if (!/has been closed|context .*closed|ENOENT/i.test(String(msg))) {
          console.debug('[Trace] tracing.stop failed:', msg)
        }
      }
    }

    const failedSteps = stepsSummary.filter(s => s.ok === false && !s.skipped)
    if (failedSteps.length > 0) {
      try { await context?.close() } catch (err) { console.debug('[Browser] Context close failed:', err.message) }
      try { await browser?.close() } catch (err) { console.debug('[Browser] Browser close failed:', err.message) }
      progress.emit({ type:'run', status:'error', message: `Step ${failedSteps[0].index + 1} (${failedSteps[0].type}) failed: ${failedSteps[0].error}` })
      throw new RunError(`Step ${failedSteps[0].index + 1} (${failedSteps[0].type}) failed: ${failedSteps[0].error}`, runDir)
    }

    if (!keepOpen) {
      try { await context?.close() } catch (err) { console.debug('[Browser] Context close failed:', err.message) }
      try { await browser?.close() } catch (err) { console.debug('[Browser] Browser close failed:', err.message) }
      progress.emit({ type:'run', status:'success', message:`Terminé – artefacts: ${path.relative(process.cwd(), runDir)}` })
    } else {
      progress.emit({ type:'run', status:'success', message:`Terminé – Navigateur laissé ouvert, fermez-le manuellement` })
      console.log('[hl] ⏸  keepOpen=true - Navigateur laissé ouvert. Fermez-le pour terminer.')
      await waitForBrowserClose(browser, context)
    }
    return { runDir }
  } catch (err) {
    console.error('[Engine] Fatal error:', err)
    const message = err?.message || String(err)
    const enriched = new RunError(message, runDir, err?.stack)
    throw enriched
  }
}


async function execHLStep(step, commandRegistry, commandContext) {
  if (!commandRegistry || !commandRegistry.has(step.type)) {
    throw new Error(`Unknown step type: ${step.type}`)
  }
  return await commandRegistry.execute(step, commandContext)
}

async function waitForBrowserClose(browser, context) {
  await new Promise((resolve) => {
    const check = setInterval(() => {
      try { const pages = context?.pages() || []; if (pages.length === 0) { clearInterval(check); console.log('[hl] ✓ Toutes les pages fermées'); resolve() } } catch { clearInterval(check); resolve() }
    }, 500)
    if (browser) browser.once('disconnected', () => { clearInterval(check); console.log('[hl] ✓ Navigateur complètement fermé'); resolve() })
  })
  try { await context?.close(); await browser?.close() } catch {}
}
