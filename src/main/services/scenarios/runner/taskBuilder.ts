import { getDb } from '../../../db/connection'
import { LeadsService } from '../../leads'
import { revealPassword } from '../../platform_credentials'
import { listTSFlows, pickDefaultTSFlowForPlatform } from '../ts_catalog'

export function buildTasks(projectRoot: string, leadIds: string[], platformSlugs: string[], flowOverrides?: Record<string,string>) {
  const db = getDb()
  const leadsSvc = new LeadsService()
  const tsFlows = listTSFlows()

  type TaskDef = {
    itemId: string
    leadId: string
    platform: string
    flowSlug: string
    username: string
    password: string
  }

  const taskDefs: TaskDef[] = []
  const earlyErrors: Array<{ type:'item-error'; runId:string; itemId:string; leadId:string; platform:string; message:string; flowSlug?:string }> = []

  const platformIdBySlug = Object.fromEntries(
    (db.prepare(`SELECT slug, id FROM platforms_catalog WHERE selected = 1 ORDER BY name`).all() as Array<{slug:string; id:number}>).map(p => [p.slug, p.id])
  )

  function makeId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}` }

  for (const leadId of leadIds) {
    for (const slug of platformSlugs) {
      const itemId = makeId('itm')
      const platformId = platformIdBySlug[slug]
      if (!platformId) { earlyErrors.push({ type:'item-error', runId:'', itemId, leadId, platform: slug, message:'Plateforme non sélectionnée' }); continue }

      let flow = null as null | { slug:string }
      if (flowOverrides?.[slug]) {
        flow = tsFlows.find(f => f.platform === slug && f.slug === flowOverrides![slug]) || null
        if (!flow) { earlyErrors.push({ type:'item-error', runId:'', itemId, leadId, platform: slug, message:`Flow override '${flowOverrides[slug]}' introuvable pour plateforme '${slug}'` }); continue }
      } else {
        const picked = pickDefaultTSFlowForPlatform(slug)
        if (!picked) { earlyErrors.push({ type:'item-error', runId:'', itemId, leadId, platform: slug, message:'Aucun flow TS trouvé' }); continue }
        flow = { slug: picked.slug }
      }

      const credsRow = db.prepare('SELECT username FROM platform_credentials WHERE platform_id = ?').get(platformId) as {username?:string}|undefined
      if (!credsRow?.username) { earlyErrors.push({ type:'item-error', runId:'', itemId, leadId, platform: slug, message:'Identifiants manquants' }); continue }

      let password = ''
      try {
        password = revealPassword(platformId)
      } catch (e: any) {
        earlyErrors.push({ type:'item-error', runId:'', itemId, leadId, platform: slug, message: String(e?.message || e) })
        continue
      }

      taskDefs.push({
        itemId,
        leadId,
        platform: slug,
        flowSlug: flow.slug,
        username: credsRow.username,
        password
      })
    }
  }

  return { taskDefs, earlyErrors, leadsSvc }
}
