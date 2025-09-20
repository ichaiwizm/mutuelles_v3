import { getDb } from '../db/connection'

export type Flow = { id:number; slug:string; name:string; platform_id:number; platform:string; active:boolean }
export type FlowStep = {
  id:number; flow_id:number; order_index:number; type:string;
  selector?:string|null; value?:string|null; url?:string|null; screenshot_label?:string|null;
  timeout_ms?:number|null; assert_text?:string|null; wait_for?:string|null; meta_json?:string|null
}

export function listFlows(): Flow[] {
  const rows = getDb().prepare(`
    SELECT f.id, f.slug, f.name, f.platform_id, c.name as platform, f.active
    FROM flows_catalog f JOIN platforms_catalog c ON c.id = f.platform_id
    WHERE f.active = 1
    ORDER BY c.name, f.name
  `).all() as any[]
  return rows.map(r => ({
    id: Number(r.id), slug: String(r.slug), name: String(r.name),
    platform_id: Number(r.platform_id), platform: String(r.platform), active: !!r.active
  }))
}

export function getFlowBySlug(slug: string) {
  const row = getDb().prepare(`
    SELECT id, slug, name, platform_id FROM flows_catalog WHERE slug = ? AND active = 1
  `).get(slug) as { id:number; slug:string; name:string; platform_id:number } | undefined
  return row
}

export function listSteps(flowId: number): FlowStep[] {
  const rows = getDb().prepare(`
    SELECT id, flow_id, order_index, type, selector, value, url, screenshot_label, timeout_ms, assert_text, wait_for, meta_json
    FROM flow_steps WHERE flow_id = ? ORDER BY order_index, id
  `).all(flowId) as any[]
  return rows as FlowStep[]
}

