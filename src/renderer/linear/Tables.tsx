import React from 'react'
import type { LeadGenerique, Quote, Task } from '../../shared/types/canonical'
import { Table, THead, TH, TBody, TR, TD } from '../components/ui/table'
import { Badge } from '../components/ui/badge'

export function LeadsTable(p: { data: LeadGenerique[]; onSelect: (id: string)=>void }) {
  return (
    <Table>
      <THead><TR><TH>Nom</TH><TH>Email</TH><TH>Téléphone</TH><TH>Dossier</TH><TH>Créé</TH></TR></THead>
      <TBody>
        {p.data.map((l) => (
          <TR key={l.id} onClick={()=> p.onSelect(l.id)}>
            <TD className="font-medium">{nameOf(l)}</TD>
            <TD>{l.contact?.email||'—'}</TD>
            <TD>{l.contact?.telephone||'—'}</TD>
            <TD>{String(l.metadata?.folder||'Nouveaux')}</TD>
            <TD className="text-xs opacity-60">{new Date(l.createdAt).toLocaleDateString()}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  )
}

export function QuotesTable(p: { data: Quote[]; leads: LeadGenerique[]; onSelect: (id: string)=>void }) {
  return (
    <Table>
      <THead><TR><TH>Lead</TH><TH>Plateforme</TH><TH>Produit</TH><TH>Statut</TH><TH>Prime</TH><TH>Maj</TH></TR></THead>
      <TBody>
        {p.data.map((q) => (
          <TR key={q.id} onClick={()=> p.onSelect(q.id)}>
            <TD className="font-medium">{leadName(p.leads, q.leadId)}</TD>
            <TD>{q.platform}</TD>
            <TD>{q.product}</TD>
            <TD><Badge variant={q.status==='won'?'success':q.status==='lost'?'error':q.status==='submitted'?'warning':undefined}>{q.status}</Badge></TD>
            <TD>{q.premium? `${q.premium} €`:'—'}</TD>
            <TD className="text-xs opacity-60">{timeago(q.updatedAt)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  )
}

export function RunsTable(p: { data: Task[]; leads: LeadGenerique[]; onSelect: (id: string)=>void }) {
  return (
    <Table>
      <THead><TR><TH>Lead</TH><TH>Plateforme</TH><TH>Produit</TH><TH>Statut</TH><TH>Créé</TH></TR></THead>
      <TBody>
        {p.data.map((t) => (
          <TR key={t.id} onClick={()=> p.onSelect(t.id)}>
            <TD className="font-medium">{leadName(p.leads, t.leadId)}</TD>
            <TD>{t.platform}</TD>
            <TD>{t.product}</TD>
            <TD><Badge variant={t.status==='success'?'success':t.status==='failed'?'error':t.status==='running'?'warning':undefined}>{t.status}</Badge></TD>
            <TD className="text-xs opacity-60">{timeago(t.createdAt)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  )
}

function nameOf(l: LeadGenerique) {
  const f = l.subscriber.firstName||''
  const n = l.subscriber.lastName||''
  return (f+' '+n).trim() || l.id.slice(0,8)
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
  if (m<60) return `${m}m`; const h = Math.floor(m/60); if (h<24) return `${h}h`; return `${Math.floor(h/24)}j`
}

