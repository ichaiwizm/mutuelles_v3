import fs from 'node:fs'
import path from 'node:path'
import { app, safeStorage } from 'electron'
import { z } from 'zod'
import { chromium, type BrowserContext, type Page } from 'playwright-core'
import { getDb } from '../db/connection'
import { getFlowBySlug, listSteps } from './flows'
import { getChromePath } from './chrome'

type ProgressEvent = {
  runId: string
  stepIndex?: number
  type: string
  status: 'start' | 'success' | 'error' | 'info'
  message?: string
  screenshotPath?: string
}

const activeByProfile = new Map<string, boolean>()

export async function runFlow(flowSlug: string, onProgress: (e: ProgressEvent) => void) {
  const flow = getFlowBySlug(flowSlug)
  if (!flow) throw new Error('Flux introuvable ou inactif')

  // Prévol: profil + chrome + identifiants
  const prof = getDb().prepare('SELECT id, user_data_dir, initialized_at FROM profiles ORDER BY id DESC LIMIT 1').get() as { id?:number; user_data_dir?:string; initialized_at?:string|null }|undefined
  if (!prof?.user_data_dir) throw new Error('Aucun profil Chrome. Créez/initialisez un profil.')
  if (!prof.initialized_at) throw new Error('Profil non initialisé. Initialisez le profil Chrome.')
  const chrome = getChromePath()
  if (!chrome) throw new Error('Chrome non détecté. Définissez le chemin de chrome.exe.')
  const creds = getDb().prepare('SELECT username, password_encrypted FROM platform_credentials WHERE platform_id = ?').get(flow.platform_id) as { username?:string; password_encrypted?:Buffer }|undefined
  if (!creds?.username || !creds.password_encrypted) throw new Error('Identifiants manquants pour la plateforme')
  const password = safeStorage.decryptString(creds.password_encrypted)

  const runId = `${flow.slug}-${Date.now()}`
  const baseDir = path.join(app.getPath('userData'), 'screenshots', flow.slug, runId)
  fs.mkdirSync(baseDir, { recursive: true })
  const steps = listSteps(flow.id)

  const send = (p: ProgressEvent) => onProgress({ runId, ...p })
  const writeJson = (json: any) => {
    const runsDir = path.join(app.getPath('userData'), 'runs', flow.slug)
    fs.mkdirSync(runsDir, { recursive: true })
    fs.writeFileSync(path.join(runsDir, `${runId}.json`), JSON.stringify(json, null, 2), 'utf-8')
  }

  // Exclusivité par profil
  if (activeByProfile.get(prof.user_data_dir)) throw new Error('Un run est déjà en cours pour ce profil')
  activeByProfile.set(prof.user_data_dir, true)

  const startedAt = new Date().toISOString()
  send({ type:'run', status:'start', message:`Démarrage run ${flow.slug}` })
  let context: BrowserContext | null = null
  let page: Page | null = null
  const summary: any = { runId, flow: flow.slug, startedAt, steps: [], screenshotsDir: baseDir }

  try {
    // Lancement Chrome persistant
    const args: any = { headless: false, executablePath: chrome }
    context = await chromium.launchPersistentContext(prof.user_data_dir, args)
    page = context.pages()[0] || await context.newPage()
    page.setDefaultTimeout(15000)

    // Exécution des steps
    for (let idx = 0; idx < steps.length; idx++) {
      const s = steps[idx]
      const label = s.screenshot_label || `${s.type}-${idx+1}`
      send({ stepIndex: idx, type: s.type, status:'start', message: describeStep(s) })
      const t0 = Date.now()

      try {
        await execStep(page, s, { username: creds.username!, password })
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
    send({ type:'run', status:'success', message:'Run terminé', screenshotPath: baseDir })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    send({ type:'run', status:'error', message: msg })
    summary.finishedAt = new Date().toISOString()
    summary.error = msg
    writeJson(summary)
    throw e
  } finally {
    try { await context?.close() } catch {}
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
    case 'waitFor': return `Attendre ${s.selector}`
    case 'assertText': return `Vérifier texte`
    case 'screenshot': return `Capture écran`
    case 'sleep': return `Pause ${s.timeout_ms||0}ms`
    default: return s.type
  }
}

async function execStep(page: Page, s: any, ctx: { username: string; password: string }) {
  if (s.timeout_ms) page.setDefaultTimeout(s.timeout_ms)
  switch (s.type) {
    case 'goto':
      if (!s.url) throw new Error('URL manquante')
      await page.goto(s.url, { waitUntil: 'domcontentloaded' })
      break
    case 'waitFor':
      if (!s.selector) throw new Error('Sélecteur manquant')
      await page.waitForSelector(s.selector)
      break
    case 'fill': {
      if (!s.selector) throw new Error('Sélecteur manquant')
      const raw = (s.value || '').replace('{username}', ctx.username).replace('{password}', ctx.password)
      await page.fill(s.selector, raw)
      break }
    case 'click':
      if (!s.selector) throw new Error('Sélecteur manquant')
      await page.click(s.selector)
      break
    case 'assertText':
      if (!s.selector || !s.assert_text) throw new Error('Paramètres manquants')
      await page.waitForSelector(s.selector)
      const txt = await page.locator(s.selector).innerText()
      if (!txt.includes(String(s.assert_text))) throw new Error('Texte attendu introuvable')
      break
    case 'screenshot':
      // Rien ici: screenshot fait côté runner pour standardiser le nommage
      break
    case 'sleep':
      await new Promise(r => setTimeout(r, s.timeout_ms || 0))
      break
    default:
      throw new Error(`Type d'étape inconnu: ${s.type}`)
  }
}
