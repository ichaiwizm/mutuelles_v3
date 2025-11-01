import React, { useEffect, useMemo, useState } from 'react'
import type { LeadGenerique, Task } from '../../../shared/types/canonical'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { PlatformIcon } from '../../assets/platforms'
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip'
import { Skeleton } from '../../components/ui/skeleton'
import { ImportGmailDialog } from '../modals/ImportGmailDialog'
import { ImportCsvDialog } from '../modals/ImportCsvDialog'
import { MockBridge } from '../../mocks/bridge'

type StatusKey = NonNullable<LeadGenerique['status']> | 'all'

export function LeadsPage(p: {
  leads: LeadGenerique[]
  tasks: Task[]
  onOpenLead: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<StatusKey>('all')
  const [platform, setPlatform] = useState<string>('all')
  const [gmailOpen, setGmailOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)

  const platforms = useMemo(() => ['all','swisslife','alptis','april','axa'], [])

  const byLeadPlatform = useMemo(() => {
    const m = new Map<string, Map<string, Task[]>>()
    for (const t of p.tasks) {
      let mm = m.get(t.leadId)
      if (!mm) { mm = new Map(); m.set(t.leadId, mm) }
      const arr = mm.get(t.platform) || []
      arr.push(t)
      mm.set(t.platform, arr)
    }
    return m
  }, [p.tasks])

  const filtered = useMemo(() => {
    return p.leads.filter((l) => {
      const text = `${l.subscriber.firstName||''} ${l.subscriber.lastName||''} ${l.contact?.email||''}`.toLowerCase()
      if (q && !text.includes(q.toLowerCase())) return false
      if (status !== 'all' && l.status !== status) return false
      if (platform !== 'all') {
        const m = byLeadPlatform.get(l.id)
        if (!m || !m.has(platform)) return false
      }
      return true
    })
  }, [p.leads, q, status, platform, byLeadPlatform])

  const loading = false
  return (
    <section className="h-full flex flex-col">
      <div className="h-10 bg-white border-b px-3 flex items-center gap-2">
        <Button variant="outline" onClick={()=> setGmailOpen(true)}>📥 Import Gmail</Button>
        <Button variant="outline" onClick={()=> setCsvOpen(true)}>📄 Import CSV</Button>
        <div className="ml-auto flex items-center gap-2">
          <Input placeholder="Recherche nom/email" value={q} onChange={(e)=> setQ(e.target.value)} className="w-64" />
          <select className="h-8 text-sm border rounded px-2" value={status} onChange={(e)=> setStatus(e.target.value as StatusKey)}>
            <option value="all">Tous statuts</option>
            <option value="new">Nouveau</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Complété</option>
            <option value="partial_failure">Échec partiel</option>
            <option value="awaiting_action">En attente action</option>
          </select>
          <select className="h-8 text-sm border rounded px-2" value={platform} onChange={(e)=> setPlatform(e.target.value)}>
            {platforms.map((pl)=> <option key={pl} value={pl}>{pl==='all'?'Toutes plateformes':pl}</option>)}
          </select>
        </div>
      </div>
      <div className={`flex-1 overflow-auto`}>
        <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] text-sm border-b bg-neutral-50">
          <div className="px-3 py-2 font-medium">Prospect</div>
          <div className="px-3 py-2 font-medium">Contact</div>
          <div className="px-3 py-2 font-medium">Entrée</div>
          <div className="px-3 py-2 font-medium">Statut</div>
          <div className="px-3 py-2 font-medium">Plateformes</div>
        </div>
        {loading && (
          <div className="p-3 space-y-2">
            {Array.from({length:6}).map((_,i)=> (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto_auto] items-center">
                <Skeleton className="h-4 mx-3" />
                <Skeleton className="h-3 mx-3" />
                <Skeleton className="h-3 mx-3 w-20" />
                <Skeleton className="h-4 mx-3 w-24" />
                <Skeleton className="h-4 mx-3 w-24" />
              </div>
            ))}
          </div>
        )}
        {filtered.map((l) => (
          <div key={l.id} className="grid grid-cols-[1fr_1fr_auto_auto_auto] items-center border-b hover:bg-neutral-50 group">
            <div className="px-3 py-2 font-medium cursor-pointer" onClick={()=> p.onOpenLead(l.id)}>{nameOf(l)}
              <span className="ml-2 opacity-0 group-hover:opacity-100 inline-flex gap-1">
                <RowAction label="Voir" onClick={()=> p.onOpenLead(l.id)}>👁️</RowAction>
                <RowAction label="Relancer" onClick={()=> {/* mock relaunch */}}>▶️</RowAction>
                <RowAction label="Archiver" onClick={()=> {/* mock archive */}}>🗑️</RowAction>
              </span>
            </div>
            <div className="px-3 py-2 text-xs opacity-80">{l.contact?.email || '—'} · {l.contact?.telephone || ''}</div>
            <div className="px-3 py-2 text-xs opacity-60">{timeago(l.createdAt)}</div>
            <div className="px-3 py-2">{statusBadge(l.status)}</div>
            <div className="px-3 py-2">
              <div className="flex gap-1">
                {Array.from((byLeadPlatform.get(l.id) || new Map()).entries()).map(([pl, arr]) => (
                  <PlatBadge key={pl} label={pl} ok={arr.some((t: Task)=> t.status==='success')} ko={arr.some((t: Task)=> t.status==='failed')} />
                ))}
              </div>
            </div>
          </div>
        ))}
        {filtered.length===0 && <div className="p-6 text-sm opacity-60">Aucun lead</div>}
      </div>
      <ImportGmailDialog open={gmailOpen} onClose={()=> setGmailOpen(false)} />
      <ImportCsvDialog open={csvOpen} onClose={()=> setCsvOpen(false)} />
    </section>
  )
}

function nameOf(l: LeadGenerique) {
  const f = l.subscriber.firstName||''
  const n = l.subscriber.lastName||''
  return (f+' '+n).trim() || l.id.slice(0,8)
}
function timeago(iso: string) {
  const d = Date.now()-new Date(iso).getTime()
  const m = Math.floor(d/60000)
  if (m<60) return `${m}m`; const h = Math.floor(m/60); if (h<24) return `${h}h`; return `${Math.floor(h/24)}j`
}
function statusBadge(s?: LeadGenerique['status']) {
  if (!s || s==='new') return <Badge>🔵 Nouveau</Badge>
  if (s==='in_progress') return <Badge variant="warning">🟡 En cours</Badge>
  if (s==='completed') return <Badge variant="success">✅ Complété</Badge>
  if (s==='partial_failure') return <Badge variant="error">❌ Échec partiel</Badge>
  if (s==='awaiting_action') return <Badge>⏸️ En attente</Badge>
  return <Badge>{s}</Badge>
}
function PlatBadge(p: { label: string; ok?: boolean; ko?: boolean }) {
  const base = 'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border'
  const cls = p.ok? 'border-green-600 text-green-700' : p.ko? 'border-rose-600 text-rose-700' : 'border-neutral-300 text-neutral-700'
  const initials = p.label.slice(0,2).toUpperCase()
  return <span className={`${base} ${cls}`} title={p.label}><PlatformIcon name={p.label} /> {initials}</span>
}

function RowAction(p: { children: React.ReactNode; label: string; onClick: ()=>void }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="text-xs" onClick={p.onClick}>{p.children}</button>
        </TooltipTrigger>
        <TooltipContent>{p.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
