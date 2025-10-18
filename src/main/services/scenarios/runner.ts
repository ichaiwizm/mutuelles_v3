import path from 'node:path'
import fs from 'node:fs'
import { BrowserWindow } from 'electron'
import { getDb } from '../../db/connection'
import { revealPassword } from '../platform_credentials'
import { LeadsService } from '../leads'
import { RunnerQueue } from './runner_queue'
import { listHLFlows, pickDefaultFlowForPlatform } from './hl_catalog'

type Mode = 'headless'|'dev'|'dev_private'

export type RunRequest = {
  scenarioId?: string
  platformSlugs?: string[]
  leadIds: string[]
  options?: { mode?: Mode; concurrency?: number }
}

export type RunProgressEvent = {
  type: 'run-start'|'item-start'|'item-success'|'item-error'|'run-done'
  runId: string
  itemId?: string
  leadId?: string
  platform?: string
  message?: string
  runDir?: string
}

function makeId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}` }

export class ScenariosRunner {
  private projectRoot = process.cwd()

  async run(payload: RunRequest, sender?: BrowserWindow) {
    const runId = makeId('scn')
    const send = (evt: RunProgressEvent) => {
      if (!sender) return
      try { sender.webContents.send(`scenarios:progress:${runId}`, evt) } catch {}
    }

    const db = getDb()
    const leadsSvc = new LeadsService()
    const mode: Mode = payload.options?.mode || 'headless'
    const concurrency = Math.max(1, Math.min(3, payload.options?.concurrency ?? 2))

    // Plateformes ciblées: scenario explicite ou plateformes sélectionnées
    const platformsSelected = db.prepare(`SELECT slug, id FROM platforms_catalog WHERE selected = 1 ORDER BY name`).all() as Array<{slug:string; id:number}>
    const allSlugs = payload.platformSlugs && payload.platformSlugs.length ? payload.platformSlugs : platformsSelected.map(p => p.slug)
    const platformIdBySlug = Object.fromEntries(platformsSelected.map(p => [p.slug, p.id]))

    setTimeout(() => {
      const hl = listHLFlows(this.projectRoot)
      const taskDefs: Array<{ itemId:string; leadId:string; platform:string; flowFile:string; fieldsFile:string; username:string; password:string }>= []
      const earlyErrors: RunProgressEvent[] = []

      for (const leadId of payload.leadIds) {
        for (const slug of allSlugs) {
          const itemId = makeId('itm')
          const platformId = platformIdBySlug[slug]
          if (!platformId) { earlyErrors.push({ type:'item-error', runId, itemId, leadId, platform: slug, message:'Plateforme non sélectionnée' }); continue }
          const flow = pickDefaultFlowForPlatform(hl, slug)
          if (!flow) { earlyErrors.push({ type:'item-error', runId, itemId, leadId, platform: slug, message:'Aucun flow HL trouvé' }); continue }
          const fieldsFile = path.join(this.projectRoot, 'data', 'field-definitions', `${slug}.json`)
          if (!fs.existsSync(fieldsFile)) { earlyErrors.push({ type:'item-error', runId, itemId, leadId, platform: slug, message:'Field-definitions introuvables' }); continue }
          if (!fs.existsSync(flow.file)) { earlyErrors.push({ type:'item-error', runId, itemId, leadId, platform: slug, message:'Flow HL introuvable' }); continue }
          const credsRow = db.prepare('SELECT username FROM platform_credentials WHERE platform_id = ?').get(platformId) as {username?:string}|undefined
          if (!credsRow?.username) { earlyErrors.push({ type:'item-error', runId, itemId, leadId, platform: slug, message:'Identifiants manquants' }); continue }
          let password = ''
          try { password = revealPassword(platformId) } catch (e) { earlyErrors.push({ type:'item-error', runId, itemId, leadId, platform: slug, message: String(e) }); continue }
          taskDefs.push({ itemId, leadId, platform: slug, flowFile: flow.file, fieldsFile, username: credsRow.username, password })
        }
      }

      send({ type:'run-start', runId, message: `Démarrage (${taskDefs.length} items)` })
      for (const evt of earlyErrors) send(evt)

      const queue = new RunnerQueue(concurrency)
      const scheduled: Promise<any>[] = []
      for (const def of taskDefs) {
        scheduled.push(queue.add(async () => {
          send({ type:'item-start', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform })
          try {
            const lead = await leadsSvc.getLead(def.leadId)
            if (!lead) throw new Error('Lead introuvable')
            const { runDir } = await this.execHL({ ...def, mode, leadData: lead.data })
            send({ type:'item-success', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform, runDir })
          } catch (e) {
            send({ type:'item-error', runId, itemId: def.itemId, leadId: def.leadId, platform: def.platform, message: e instanceof Error ? e.message : String(e) })
          }
        }))
      }
      ;(async () => { try { await Promise.allSettled(scheduled) } finally { send({ type:'run-done', runId, message:'Terminé' }) } })()
    }, 0)
    return { runId }
  }

  private async execHL(args: { flowFile:string; fieldsFile:string; leadData:any; username:string; password:string; mode: Mode }): Promise<{ runDir: string }>{
    const { pathToFileURL } = await import('node:url')
    const enginePath = path.join(process.cwd(), 'automation', 'engine', 'engine.mjs')
    const mod = await import(pathToFileURL(enginePath).href)
    const fn = mod.runHighLevelFlow as (p:any)=>Promise<{runDir:string}>
    return fn({
      fieldsFile: args.fieldsFile,
      flowFile: args.flowFile,
      leadData: args.leadData,
      username: args.username,
      password: args.password,
      mode: args.mode,
      keepOpen: args.mode !== 'headless',
      outRoot: path.join(process.cwd(), 'data', 'runs'),
      dom: 'steps'
    })
  }
}
