import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core'
import { getFlowBySlug, listSteps } from './flows'
import { getDb } from '../db/connection'
import { getChromePath } from './chrome'
import { revealPassword } from './platform_credentials'

type ProgressEvent = {
  runId: string
  stepIndex?: number
  type: string
  status: 'start' | 'success' | 'error'
  message?: string
  screenshotPath?: string
}

const activeByProfile = new Map<string, boolean>()
const DEFAULT_TIMEOUT = 15000

export async function runFlow(flowSlug: string, onProgress: (e: ProgressEvent) => void, opts?: { mode?: 'headless'|'dev'|'dev_private' }) {
  const flow = getFlowBySlug(flowSlug)
  if (!flow) throw new Error('Flux introuvable ou inactif')

  // Prévol: profil + chrome + identifiants
  const prof = getDb().prepare('SELECT id, user_data_dir, initialized_at FROM profiles ORDER BY id DESC LIMIT 1').get() as { id?:number; user_data_dir?:string; initialized_at?:string|null }|undefined
  if (!prof?.user_data_dir) throw new Error('Aucun profil Chrome. Créez/initialisez un profil.')
  if (!prof.initialized_at) throw new Error('Profil non initialisé. Initialisez le profil Chrome.')
  const chrome = getChromePath()
  if (!chrome) throw new Error('Chrome non détecté. Définissez le chemin de chrome.exe.')
  const creds = getDb().prepare('SELECT username FROM platform_credentials WHERE platform_id = ?').get(flow.platform_id) as { username?:string }|undefined
  if (!creds?.username) throw new Error('Identifiants manquants pour la plateforme')
  const password = revealPassword(flow.platform_id)

  const runId = `${flow.slug}-${Date.now()}`
  const baseDir = path.join(app.getPath('userData'), 'screenshots', flow.slug, runId)
  fs.mkdirSync(baseDir, { recursive: true })
  const steps = listSteps(flow.id)

  const send = (p: Omit<ProgressEvent, 'runId'>) => onProgress({ runId, ...p })
  const writeJson = (json: any) => {
    const runsDir = path.join(app.getPath('userData'), 'runs', flow.slug)
    fs.mkdirSync(runsDir, { recursive: true })
    fs.writeFileSync(path.join(runsDir, `${runId}.json`), JSON.stringify(json, null, 2), 'utf-8')
  }

  // Exclusivité par profil
  if (activeByProfile.get(prof.user_data_dir)) throw new Error('Un run est déjà en cours pour ce profil')
  activeByProfile.set(prof.user_data_dir, true)

  const startedAt = new Date().toISOString()
  const runsDir = path.join(app.getPath('userData'), 'runs', flow.slug)
  const jsonPath = path.join(runsDir, `${runId}.json`)
  getDb().prepare(`INSERT INTO flows_runs(flow_id, run_uid, flow_slug, started_at, status, screenshots_dir, json_path)
                   VALUES(?, ?, ?, ?, 'running', ?, ?)`)
        .run(flow.id, runId, flow.slug, startedAt, baseDir, jsonPath)
  send({ type:'run', status:'start', message:`Démarrage run ${flow.slug}` })
  let context: BrowserContext | null = null
  let browser: Browser | null = null
  let page: Page | null = null
  const summary: any = { runId, flow: flow.slug, startedAt, steps: [], screenshotsDir: baseDir }

  try {
    const headless = !(opts?.mode === 'dev' || opts?.mode === 'dev_private')
    const keepOpen = (opts?.mode === 'dev' || opts?.mode === 'dev_private')
    if (opts?.mode === 'dev_private') {
      // Navigation privée: contexte non persistant (aucun cache/cookies conservés)
      browser = await chromium.launch({ headless, executablePath: chrome, args: ['--incognito'] })
      context = await browser.newContext()
    } else {
      // Modes par défaut: profil persistant (dev) ou headless avec le même profil pour garder l'environnement
      const args: any = { headless, executablePath: chrome }
      context = await chromium.launchPersistentContext(prof.user_data_dir, args)
    }
    page = context.pages()[0] || await context.newPage()
    page.setDefaultTimeout(DEFAULT_TIMEOUT)

    // Exécution des steps
    for (let idx = 0; idx < steps.length; idx++) {
      const s = steps[idx]
      const label = s.screenshot_label || `${s.type}-${idx+1}`
      send({ stepIndex: idx, type: s.type, status:'start', message: describeStep(s) })
      const t0 = Date.now()

      try {
        await execStep(page, s, { username: creds.username!, password, platform_id: flow.platform_id })
        const shotPath = path.join(baseDir, `step-${String(idx+1).padStart(2,'0')}-${slugify(label)}.png`)
        if (s.type !== 'screenshot') await page.screenshot({ path: shotPath })
        else await page.screenshot({ path: shotPath })
        send({ stepIndex: idx, type: s.type, status:'success', screenshotPath: shotPath })
        summary.steps.push({ index: idx, type: s.type, ok: true, ms: Date.now()-t0, screenshotPath: shotPath })
      } catch (err) {
        const errPath = path.join(baseDir, `error-${String(idx+1).padStart(2,'0')}.png`)
        try { await page.screenshot({ path: errPath }) } catch {}
        const msg = err instanceof Error ? err.message : String(err)
        send({ stepIndex: idx, type: s.type, status:'error', message: msg, screenshotPath: errPath })
        summary.steps.push({ index: idx, type: s.type, ok: false, error: msg, screenshotPath: errPath })
        break
      }
    }

    summary.finishedAt = new Date().toISOString()
    writeJson(summary)
    const okCount = summary.steps.filter((s:any)=>s.ok).length
    const hasErrors = summary.steps.some((s:any)=>!s.ok)
    const status = hasErrors ? 'error' : 'success'
    const statusMessage = hasErrors ? 'Run terminé avec erreurs' : 'Run terminé'

    if (hasErrors) {
      getDb().prepare(`UPDATE flows_runs SET finished_at=?, status='error', steps_total=?, ok_steps=?, error_message=? WHERE run_uid=?`)
            .run(summary.finishedAt, steps.length, okCount, 'Une ou plusieurs étapes ont échoué', runId)
    } else {
      getDb().prepare(`UPDATE flows_runs SET finished_at=?, status='success', steps_total=?, ok_steps=? WHERE run_uid=?`)
            .run(summary.finishedAt, steps.length, okCount, runId)
    }
    send({ type:'run', status, message: statusMessage, screenshotPath: baseDir })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    send({ type:'run', status:'error', message: msg })
    summary.finishedAt = new Date().toISOString()
    summary.error = msg
    writeJson(summary)
    const okCount = summary.steps.filter((s:any)=>s.ok).length
    getDb().prepare(`UPDATE flows_runs SET finished_at=?, status='error', steps_total=?, ok_steps=?, error_message=? WHERE run_uid=?`)
          .run(summary.finishedAt, steps.length, okCount, msg, runId)
    throw e
  } finally {
    const keepOpen = (opts?.mode === 'dev' || opts?.mode === 'dev_private')
    if (!keepOpen) {
      try { await context?.close() } catch {}
      try { await browser?.close() } catch {}
    }
    activeByProfile.delete(prof.user_data_dir)
  }

  return { runId, screenshotsDir: baseDir }
}

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') }

function describeStep(s: any) {
  switch (s.type) {
    case 'goto': return `Aller sur ${s.url}`
    case 'fill': return `Remplir ${s.selector}`
    case 'click': return `Cliquer ${s.selector}`
    case 'tryClick': return `Essayer de cliquer ${s.selector}`
    case 'waitFor': return `Attendre ${s.selector}`
    case 'assertText': return `Vérifier texte`
    case 'screenshot': return `Capture écran`
    case 'sleep': return `Pause ${s.timeout_ms||0}ms`
    default: return s.type
  }
}

async function execStep(page: Page, s: any, ctx: { username: string; password: string; platform_id?: number; context?: BrowserContext }): Promise<Page|null> {
  // Appliquer le timeout spécifique à cette étape si défini
  if (s.timeout_ms) page.setDefaultTimeout(s.timeout_ms)

  try {
  switch (s.type) {
    case 'goto':
      {
        const target = s.url as string | null
        if (!target) throw new Error('URL manquante (goto)')
        await page.goto(target, { waitUntil: 'domcontentloaded' })
      }
      return null
    case 'waitFor':
      if (!s.selector) throw new Error('Sélecteur manquant')
      await page.waitForSelector(s.selector)
      return null
    case 'fill': {
      if (!s.selector) throw new Error('Sélecteur manquant')
      const raw = (s.value || '').replace('{username}', ctx.username).replace('{password}', ctx.password)
      await page.fill(s.selector, raw)
      return null }
    case 'click':
      if (!s.selector) throw new Error('Sélecteur manquant')
      await page.click(s.selector)
      return null
    case 'assertText':
      if (!s.selector || !s.assert_text) throw new Error('Paramètres manquants')
      await page.waitForSelector(s.selector)
      const txt = await page.locator(s.selector).innerText()
      if (!txt.includes(String(s.assert_text))) throw new Error('Texte attendu introuvable')
      return null
    case 'screenshot':
      // Rien ici: screenshot fait côté runner pour standardiser le nommage
      return null
    case 'tryClick':
      if (!s.selector) throw new Error('Sélecteur manquant')
      try {
        await page.waitForSelector(s.selector, { timeout: s.timeout_ms || 1000 })
        await page.click(s.selector)
      } catch {
        // Pas grave si l'élément n'existe pas, on continue
      }
      return null
    case 'sleep':
      await new Promise(r => setTimeout(r, s.timeout_ms || 0))
      return null
    default:
      throw new Error(`Type d'étape inconnu: ${s.type}`)
  }
  } finally {
    // Restaurer le timeout par défaut
    page.setDefaultTimeout(DEFAULT_TIMEOUT)
  }
}
