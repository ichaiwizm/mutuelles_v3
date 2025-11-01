import React from 'react'
import type { LeadGenerique, Quote, Task } from '../../shared/types/canonical'
import { Textarea } from '../components/ui/textarea'
import { Button } from '../components/ui/button'
import { MockBridge } from '../mocks/bridge'

export function Inspector(p: { lead: LeadGenerique | null; quote: Quote | null; run: Task | null }) {
  return (
    <aside className="w-96 border-l bg-white h-full overflow-auto">
      {!p.lead && !p.quote && !p.run && <div className="p-4 text-sm opacity-60">Sélectionnez un élément</div>}
      {p.lead && (
        <section className="p-3 space-y-2">
          <div className="font-semibold">{nameOf(p.lead)}</div>
          <div className="text-sm opacity-70">{p.lead.contact?.email || '—'} · {p.lead.contact?.telephone || '—'}</div>
          <div className="text-xs opacity-60">Dossier: {String(p.lead.metadata?.folder||'Nouveaux')}</div>
        </section>
      )}
      {p.quote && (
        <section className="p-3 space-y-2 border-t">
          <div className="font-semibold">Devis</div>
          <div className="text-sm">{p.quote.platform} · {p.quote.product} — {p.quote.status}</div>
          <div className="text-sm">Prime: {p.quote.premium? `${p.quote.premium} €` : '—'}</div>
          <Textarea rows={6} placeholder="Notes" defaultValue={p.quote.notes||''} onBlur={async (e)=> {
            await MockBridge.quotes.update({ id: p.quote!.id, notes: e.target.value })
          }} />
          <div className="flex gap-2">
            <Button onClick={()=> MockBridge.quotes.moveStatus(p.quote!.id, 'submitted')}>Envoyer</Button>
            <Button variant="outline" onClick={()=> MockBridge.quotes.moveStatus(p.quote!.id, 'priced')}>Simuler tarif</Button>
          </div>
        </section>
      )}
      {p.run && (
        <section className="p-3 space-y-2 border-t">
          <div className="font-semibold">Exécution</div>
          <div className="text-sm">{p.run.platform} · {p.run.product} — {p.run.status}</div>
          <pre className="text-xs bg-neutral-50 p-2 rounded whitespace-pre-wrap">{p.run.logs || '—'}</pre>
        </section>
      )}
    </aside>
  )
}

function nameOf(l: LeadGenerique) {
  const f = l.subscriber.firstName||''
  const n = l.subscriber.lastName||''
  return (f+' '+n).trim() || l.id.slice(0,8)
}

