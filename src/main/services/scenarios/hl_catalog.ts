import fs from 'node:fs'
import path from 'node:path'

export type HLFlow = { platform: string; slug: string; name: string; file: string }

export function listHLFlows(projectRoot: string): HLFlow[] {
  const flowsDir = path.join(projectRoot, 'data', 'flows')
  const out: HLFlow[] = []
  const walk = (d: string) => {
    if (!fs.existsSync(d)) return
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (ent.isFile() && ent.name.endsWith('.hl.json')) {
        try {
          const obj = JSON.parse(fs.readFileSync(p, 'utf-8'))
          if (obj && obj.platform && obj.slug) {
            out.push({ platform: String(obj.platform), slug: String(obj.slug), name: String(obj.name || obj.slug), file: p })
          }
        } catch {}
      }
    }
  }
  walk(flowsDir)
  return out.sort((a,b)=> a.platform.localeCompare(b.platform) || a.slug.localeCompare(b.slug))
}

export function pickDefaultFlowForPlatform(all: HLFlow[], platform: string): HLFlow | null {
  const list = all.filter(f => f.platform === platform)
  if (list.length === 0) return null
  // Heuristique simple: on évite les flows "login"/"inspect" et on préfère ceux qui contiennent des mots clés
  const preferred = ['slsis', 'sante', 'select', 'pro', 'full']
  const scored = list.map(f => {
    const name = (f.name + ' ' + f.slug).toLowerCase()
    const bad = (name.includes('login') || name.includes('inspect')) ? -5 : 0
    const bonus = preferred.reduce((acc, k) => acc + (name.includes(k) ? 1 : 0), 0)
    return { f, score: bad + bonus }
  })
  scored.sort((a,b)=> b.score - a.score)
  return scored[0]?.f || list[0]
}

