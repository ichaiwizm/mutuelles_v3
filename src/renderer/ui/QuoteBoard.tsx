import React, { useMemo } from 'react'
import type { LeadGenerique, Quote } from '../../shared/types/canonical'

const STATUSES: Quote['status'][] = ['draft','ready','submitted','priced','won','lost']
const LABELS: Record<Quote['status'], string> = {
  draft: 'À préparer', ready: 'À envoyer', submitted: 'Envoyé', priced: 'Tarif reçu', won: 'Gagné', lost: 'Perdu', canceled: 'Annulé'
}

export function QuoteBoard(p: {
  leads: LeadGenerique[]
  quotes: Quote[]
  folder: string
  q: string
  selectedQuoteId: string | null
  onSelectQuote: (id: string) => void
}) {
  const data = useMemo(() => group(p.leads, p.quotes, p.folder, p.q), [p.leads, p.quotes, p.folder, p.q])
  return (
    <section className="flex-1 overflow-auto px-3">
      <div className="grid grid-cols-6 gap-3 min-w-[900px]">
        {STATUSES.map((s) => (
          <div key={s} className="border rounded bg-white overflow-hidden">
            <div className="px-2 py-1 text-xs font-medium bg-neutral-50 border-b">{LABELS[s]}</div>
            <div className="p-2 space-y-2">
              {data[s].map((q) => (
                <div key={q.id} onClick={() => p.onSelectQuote(q.id)} className={`border rounded p-2 text-sm cursor-pointer hover:bg-neutral-50 ${p.selectedQuoteId===q.id?'ring-1 ring-blue-400':''}`}>
                  <div className="font-medium truncate">{leadName(p.leads, q.leadId)}</div>
                  <div className="opacity-70 truncate">{q.platform} · {q.product}</div>
                  <div className="text-xs opacity-60">
                    {q.premium ? `${q.premium} €` : '—'} · {timeago(q.updatedAt)}
                  </div>
                </div>
              ))}
              {data[s].length===0 && <div className="text-xs opacity-60">Aucun</div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function group(leads: LeadGenerique[], quotes: Quote[], folder: string, q: string) {
  const ids = new Set(leads.filter((l) => (l.metadata?.folder||'Nouveaux')===folder).map((l) => l.id))
  const out: Record<Quote['status'], Quote[]> = { draft:[], ready:[], submitted:[], priced:[], won:[], lost:[], canceled:[] }
  for (const qu of quotes) {
    if (!ids.has(qu.leadId)) continue
    if (q) {
      const s = q.toLowerCase()
      const lead = leads.find((l) => l.id===qu.leadId)
      const text = `${qu.platform} ${qu.product} ${lead?.subscriber.firstName??''} ${lead?.subscriber.lastName??''}`.toLowerCase()
      if (!text.includes(s)) continue
    }
    out[qu.status].push(qu)
  }
  Object.keys(out).forEach((k) => (out as any)[k].sort((a: Quote,b: Quote)=> (a.updatedAt>b.updatedAt?-1:1)))
  return out
}

function leadName(leads: LeadGenerique[], id: string) {
  const l = leads.find((x)=>x.id===id)
  const f = l?.subscriber.firstName||''
  const n = l?.subscriber.lastName||''
  return (f+' '+n).trim() || l?.id.slice(0,8) || id.slice(0,8)
}

function timeago(iso: string) {
  const d = Date.now()-new Date(iso).getTime()
  const m = Math.floor(d/60000)
  if (m<60) return `${m}m`
  const h = Math.floor(m/60)
  if (h<24) return `${h}h`
  return `${Math.floor(h/24)}j`
}

