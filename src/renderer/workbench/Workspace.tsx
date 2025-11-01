import React from 'react'
import type { LeadGenerique, Quote, Task } from '../../shared/types/canonical'
import { Badge } from '../components/ui/badge'

export type ViewMode = 'quotes' | 'runs'

export function Workspace(p: {
  leads: LeadGenerique[]
  quotes: Quote[]
  runs: Task[]
  leadFilter: string | null
  q: string
  mode: ViewMode
  onMode: (m: ViewMode) => void
  onSelectQuote: (id: string) => void
  onSelectRun: (id: string) => void
}) {
  const toolbar = (
    <div className="h-10 border-b bg-white flex items-center gap-2 px-2">
      <Segmented value={p.mode} onChange={p.onMode} />
      <div className="text-xs opacity-60 ml-auto">{p.mode==='quotes'? p.quotes.length : p.runs.length} éléments</div>
    </div>
  )

  if (p.mode === 'quotes') return (
    <section className="flex-1 flex flex-col">
      {toolbar}
      <div className="flex-1 overflow-auto divide-y">
        {p.quotes.map((q) => (
          <div key={q.id} className="grid grid-cols-[1fr_1fr_auto_auto] items-center px-3 py-2 hover:bg-neutral-50 cursor-pointer" onClick={()=> p.onSelectQuote(q.id)}>
            <div className="truncate">{leadName(p.leads, q.leadId)}</div>
            <div className="truncate text-sm opacity-80">{q.platform} · {q.product}</div>
            <div><Badge variant={q.status==='won'?'success':q.status==='lost'?'error':q.status==='submitted'?'warning':undefined}>{q.status}</Badge></div>
            <div className="text-xs opacity-60 text-right">{q.premium? `${q.premium} €` : '—'}</div>
          </div>
        ))}
        {p.quotes.length===0 && <div className="p-6 text-sm opacity-60">Aucun devis</div>}
      </div>
    </section>
  )

  return (
    <section className="flex-1 flex flex-col">
      {toolbar}
      <div className="flex-1 overflow-auto divide-y">
        {p.runs.map((t) => (
          <div key={t.id} className="grid grid-cols-[1fr_1fr_auto] items-center px-3 py-2 hover:bg-neutral-50 cursor-pointer" onClick={()=> p.onSelectRun(t.id)}>
            <div className="truncate">{leadName(p.leads, t.leadId)}</div>
            <div className="truncate text-sm opacity-80">{t.platform} · {t.product}</div>
            <div><Badge variant={t.status==='success'?'success':t.status==='failed'?'error':t.status==='running'?'warning':undefined}>{t.status}</Badge></div>
          </div>
        ))}
        {p.runs.length===0 && <div className="p-6 text-sm opacity-60">Aucune exécution</div>}
      </div>
    </section>
  )
}

function leadName(leads: LeadGenerique[], id: string) {
  const l = leads.find((x)=>x.id===id)
  const f = l?.subscriber.firstName||''
  const n = l?.subscriber.lastName||''
  return (f+' '+n).trim() || l?.id.slice(0,8) || id.slice(0,8)
}

function Segmented(p: { value: ViewMode; onChange: (m: ViewMode)=>void }) {
  const Item = ({ v, label }: { v: ViewMode; label: string }) => (
    <button onClick={()=> p.onChange(v)} className={`px-2 py-1 text-sm rounded ${p.value===v? 'bg-neutral-900 text-white':'bg-neutral-100'}`}>{label}</button>
  )
  return (
    <div className="inline-flex gap-1 rounded bg-neutral-100 p-1">
      <Item v="quotes" label="Devis" />
      <Item v="runs" label="Exécutions" />
    </div>
  )
}

