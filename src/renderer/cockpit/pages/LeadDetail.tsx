import React, { useEffect, useMemo, useState } from 'react'
import type { LeadGenerique, Task, Quote } from '../../../shared/types/canonical'
import { Checkbox } from '../../components/ui/checkbox'
import { Button } from '../../components/ui/button'
import { Progress } from '../../components/ui/progress'
import { MockBridge } from '../../mocks/bridge'
import { PlatformIcon } from '../../assets/platforms'
import { CompareQuotesDialog } from '../modals/CompareQuotesDialog'
import { LogsDialog } from '../modals/LogsDialog'

const CATALOG: Record<string, string[]> = {
  swisslife: ['sante-individuelle','confort-hospitalisation','prevoyance-tns'],
  alptis: ['sante-select','sante-select-pro'],
  malakoff: ['sante-essentielle'],
}

export function LeadDetail(p: { lead: LeadGenerique; tasks: Task[]; quotes: Quote[] }) {
  const [sel, setSel] = useState<Record<string, boolean>>({})
  const [progress, setProgress] = useState<{ percent: number; step: string }[]>([])
  const [openCompare, setOpenCompare] = useState(false)
  const [openLogs, setOpenLogs] = useState(false)

  useEffect(() => {
    const iv = setInterval(async () => {
      const pr = await MockBridge.automations.getProgress(p.lead.id)
      setProgress(pr)
    }, 800)
    return () => clearInterval(iv)
  }, [p.lead.id])

  const grouped = useMemo(() => groupByPlatform(p.tasks, p.lead.id), [p.tasks, p.lead.id])
  const results = useMemo(() => p.quotes.filter(q => q.leadId===p.lead.id), [p.quotes, p.lead.id])

  const selections = useMemo(() => Object.entries(sel).filter(([,v])=>v).map(([k])=> k.split(':')).map(([platform, product])=> ({ platform, product })), [sel])

  const launch = async () => { if (selections.length) await MockBridge.automations.runForLead(p.lead.id, selections) }

  return (
    <div className="h-full grid grid-cols-[30%_45%_25%] gap-3 p-3">
      <section className="bg-white border rounded p-3 space-y-2">
        <div className="text-lg font-semibold">{nameOf(p.lead)}</div>
        <div className="text-sm opacity-70">{p.lead.contact?.email || '—'} · {p.lead.contact?.telephone || '—'}</div>
        <div className="text-sm mt-2">
          <div className="font-medium mb-1">Situation</div>
          <ul className="text-sm space-y-1">
            <li>Âge: 42 ans</li>
            <li>Situation: Salarié</li>
            <li>Région: Île-de-France</li>
            <li>Enfants: 2</li>
          </ul>
        </div>
        <div><Button variant="outline">✏️ Éditer</Button></div>
      </section>

      <section className="space-y-3">
        <div className="bg-white border rounded p-3">
          <div className="font-semibold mb-2">Sélection des produits</div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(CATALOG).map(([platform, products]) => (
              <div key={platform} className="border rounded">
                <div className="px-2 py-1 text-sm font-medium bg-neutral-50 border-b flex items-center gap-2"><PlatformIcon name={platform} /> {title(platform)}</div>
                <div className="p-2 space-y-1">
                  {products.map((prd) => (
                    <label key={prd} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={!!sel[platform+':'+prd]} onChange={(e)=> setSel({ ...sel, [platform+':'+prd]: e.target.checked })} />
                      {label(platform, prd)}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3"><Button onClick={launch}>🚀 Lancer les automatisations sélectionnées</Button></div>
        </div>
        {progress.length>0 && (
          <div className="bg-white border rounded p-3">
            <div className="font-semibold mb-2">Progression en temps réel</div>
            <div className="space-y-2">
              {progress.map((r,i)=> (
                <div key={i}>
                  <Progress value={r.percent} />
                  <div className="text-xs opacity-70 mt-1">→ {r.step}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="bg-white border rounded p-3">
          <div className="font-semibold mb-2">Résultats</div>
          <div className="mb-2 text-right"><Button variant="outline" onClick={()=> setOpenCompare(true)}>Comparer</Button></div>
          <div className="space-y-2">
            {results.map((q)=> (
              <div key={q.id} className="border rounded p-2">
                <div className="font-medium">{title(q.platform)} — {q.product}</div>
                {q.status==='priced' || q.status==='won' ? (
                  <div className="text-sm">💶 {q.premium}€/mois · 📄 <a href="#">Télécharger devis</a></div>
                ) : q.status==='lost' ? (
                  <div className="text-sm">❌ Refusé</div>
                ) : (
                  <div className="text-sm opacity-60">En attente…</div>
                )}
              </div>
            ))}
            {results.length===0 && <div className="text-sm opacity-60">Aucun résultat</div>}
          </div>
        </div>
      </section>

      <section className="bg-white border rounded p-3 space-y-2">
        <div className="font-semibold">Timeline</div>
        <Timeline leadId={p.lead.id} />
        <div className="pt-2"><Button variant="outline" onClick={()=> setOpenLogs(true)}>📜 Voir logs détaillés</Button></div>
      </section>
      <CompareQuotesDialog open={openCompare} onClose={()=> setOpenCompare(false)} quotes={results} leads={[p.lead]} />
      <LogsDialog open={openLogs} onClose={()=> setOpenLogs(false)} leadId={p.lead.id} />
    </div>
  )
}

function groupByPlatform(tasks: Task[], leadId: string) {
  return tasks.filter(t => t.leadId===leadId).reduce((acc, t)=> {
    ;(acc[t.platform]||(acc[t.platform]=[])).push(t)
    return acc
  }, {} as Record<string, Task[]>)
}
function title(p: string) { return p.replace(/^./, c=> c.toUpperCase()).replace('-', ' ') }
function label(platform: string, product: string) { return product.replace(/-/g,' ') }
function nameOf(l: LeadGenerique) { const f=l.subscriber.firstName||''; const n=l.subscriber.lastName||''; return (f+' '+n).trim()||l.id.slice(0,8) }

function Timeline(p: { leadId: string }) {
  const [items, setItems] = useState<{ id: string; at: string; text: string; kind: string }[]>([])
  useEffect(()=> {
    let mounted = true
    const pull = async () => { const it = await MockBridge.timeline.listByLead(p.leadId, 20) as any; if (mounted) setItems(it) }
    pull(); const iv = setInterval(pull, 1200); return ()=> { mounted=false; clearInterval(iv) }
  }, [p.leadId])
  return (
    <div className="space-y-1 text-sm">
      {items.map((e)=> (
        <div key={e.id} className="flex items-center gap-2"><span className="opacity-60">🕐 {new Date(e.at).toLocaleTimeString()}</span> <span>{e.text}</span></div>
      ))}
      {items.length===0 && <div className="text-xs opacity-60">Aucune activité</div>}
    </div>
  )
}
