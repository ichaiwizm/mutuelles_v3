import * as platforms from '../../../../platforms'
import type { Flow } from '../../../../core/dsl'
import type { SelectorMap } from '../../../../platforms/types'

export type TSFlow = { platform: string; slug: string; name: string; flow: Flow }

// Helper: registry of platforms exported from platforms/index.ts
// We rely on platforms.registry if available, else fall back to heuristics over namespace exports
function getPlatformModules(): Array<[string, any]> {
  const anyPlatforms = platforms as any
  if (anyPlatforms.registry && typeof anyPlatforms.registry === 'object') {
    return Object.entries(anyPlatforms.registry)
  }
  return Object.entries(anyPlatforms).filter(([k, v]) => typeof v === 'object' && v && 'platformConfig' in v)
}

export function listTSFlows(): TSFlow[] {
  const out: TSFlow[] = []
  for (const [platformKey, mod] of getPlatformModules()) {
    const platformSlug = String(mod.platformConfig?.slug || platformKey)
    for (const [exportName, val] of Object.entries(mod)) {
      if (exportName === 'platformConfig' || exportName === 'selectors') continue
      // Heuristic: a Flow must be an object with steps array and slug string
      if (val && typeof val === 'object' && Array.isArray((val as any).steps) && typeof (val as any).slug === 'string') {
        const flow = val as Flow
        out.push({ platform: platformSlug, slug: flow.slug.split('/').pop() || flow.slug, name: flow.name || flow.slug, flow })
      }
    }
  }
  // stable order
  return out.sort((a, b) => a.platform.localeCompare(b.platform) || a.slug.localeCompare(b.slug))
}

export function getTSFlow(platform: string, flowSlug: string): Flow | null {
  for (const [platformKey, mod] of getPlatformModules()) {
    const slug = String(mod.platformConfig?.slug || platformKey)
    if (slug !== platform) continue
    for (const [exportName, val] of Object.entries(mod)) {
      if (exportName === 'platformConfig' || exportName === 'selectors') continue
      if (val && typeof val === 'object' && Array.isArray((val as any).steps) && typeof (val as any).slug === 'string') {
        const f = val as Flow
        const short = f.slug.split('/').pop() || f.slug
        if (short === flowSlug) return f
      }
    }
  }
  return null
}

export function pickDefaultTSFlowForPlatform(platform: string): TSFlow | null {
  const flows = listTSFlows().filter(f => f.platform === platform)
  if (flows.length === 0) return null
  const preferred = ['slsis', 'sante', 'select', 'pro', 'full']
  const scored = flows.map(f => {
    const name = (f.name + ' ' + f.slug).toLowerCase()
    const bad = (name.includes('login') || name.includes('inspect')) ? -5 : 0
    const bonus = preferred.reduce((acc, k) => acc + (name.includes(k) ? 1 : 0), 0)
    return { f, score: bad + bonus }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.f || flows[0]
}

export function getPlatformSelectorsTS(platform: string): SelectorMap | null {
  for (const [platformKey, mod] of getPlatformModules()) {
    const slug = String(mod.platformConfig?.slug || platformKey)
    if (slug === platform) return (mod.selectors || null) as SelectorMap | null
  }
  return null
}
