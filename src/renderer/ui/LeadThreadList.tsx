import React, { useMemo } from 'react'
import type { LeadGenerique, Task } from '../../shared/types/canonical'
import { LeadAvatar } from './LeadAvatar'

export type Section = { title: string; items: Thread[] }
export type Thread = {
  lead: LeadGenerique
  tasks: Task[]
  lastAt: string
}

export function LeadThreadList(p: {
  leads: LeadGenerique[]
  tasks: Task[]
  folder: string
  status?: 'all' | 'pending' | 'running' | 'success' | 'failed'
  q: string
  selectedLeadId: string | null
  selectedTaskId: string | null
  onSelectLead: (id: string | null) => void
  onSelectTask: (id: string) => void
}) {
  const sections = useMemo(() => buildSections(p.leads, p.tasks, p.folder, p.status ?? 'all', p.q), [p.leads, p.tasks, p.folder, p.status, p.q])

  return (
    <section className="flex-1 overflow-auto">
      {sections.map((s) => (
        <div key={s.title}>
          <div className="sticky top-0 z-10 bg-neutral-50/80 backdrop-blur px-3 py-1 text-xs font-medium text-neutral-600 border-b">
            {s.title}
          </div>
          {s.items.map((th) => (
            <div key={th.lead.id} className={`px-3 py-2 border-b hover:bg-neutral-50 cursor-pointer ${p.selectedLeadId === th.lead.id ? 'bg-neutral-50' : ''}`}
                 onClick={() => p.onSelectLead(th.lead.id)}>
              <div className="grid grid-cols-[28px_1fr_auto] items-center gap-3">
                <LeadAvatar lead={th.lead} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium truncate">{displayName(th.lead)}</div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {th.tasks.slice(0,4).map((t) => (
                        <Chip key={t.id} label={`${t.platform}`} status={t.status} onClick={(e) => { e.stopPropagation(); p.onSelectTask(t.id) }} />
                      ))}
                    </div>
                  </div>
                  <div className="text-xs opacity-70 truncate mt-0.5">
                    {snippet(th.tasks[0])}
                  </div>
                </div>
                <div className="text-xs opacity-60">{since(th.lastAt)}</div>
              </div>
              {p.selectedLeadId === th.lead.id && (
                <div className="pl-11 pr-3 pb-2 mt-1">
                  <div className="grid gap-1">
                    {th.tasks.slice(0,6).map((t) => (
                      <div key={t.id} className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded px-2 py-1 ${p.selectedTaskId === t.id ? 'bg-neutral-100' : 'hover:bg-neutral-100'}`}
                           onClick={(e) => { e.stopPropagation(); p.onSelectTask(t.id) }}>
                        <Chip label={t.platform + ' · ' + t.product} status={t.status} />
                        <div className="text-xs opacity-70 truncate">{t.logs?.split('\n').slice(-1)[0] || '—'}</div>
                        <div className="text-xs opacity-60">{since(t.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {s.items.length === 0 && (
            <div className="px-3 py-6 text-sm opacity-60">Aucun élément</div>
          )}
        </div>
      ))}
    </section>
  )
}

function Chip(p: { label: string; status: Task['status']; onClick?: (e: React.MouseEvent) => void }) {
  const color = p.status === 'success' ? 'bg-green-100 text-green-700' : p.status === 'failed' ? 'bg-rose-100 text-rose-700' : p.status === 'running' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
  return (
    <span onClick={p.onClick} className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${color}`}>{p.label}</span>
  )
}

function buildSections(leads: LeadGenerique[], tasks: Task[], folder: string, status: 'all'|Task['status'], q: string): Section[] {
  const allowedLeadIds = new Set(
    leads.filter((l) => (l.metadata?.folder || 'Nouveaux') === folder).map((l) => l.id)
  )
  const byLead = new Map<string, Task[]>()
  for (const t of tasks) {
    if (!allowedLeadIds.has(t.leadId)) continue
    if (status !== 'all' && t.status !== status) continue
    if (q) {
      const s = q.toLowerCase()
      const l = leads.find((x) => x.id === t.leadId)
      const text = `${t.platform} ${t.product} ${l?.subscriber.firstName ?? ''} ${l?.subscriber.lastName ?? ''} ${t.logs ?? ''}`.toLowerCase()
      if (!text.includes(s)) continue
    }
    const arr = byLead.get(t.leadId) || []
    arr.push(t)
    byLead.set(t.leadId, arr)
  }
  const threads: Thread[] = []
  for (const [leadId, arr] of byLead) {
    arr.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    const lead = leads.find((l) => l.id === leadId)!
    threads.push({ lead, tasks: arr, lastAt: arr[0].createdAt })
  }
  threads.sort((a, b) => (a.lastAt > b.lastAt ? -1 : 1))
  return groupByDate(threads)
}

function displayName(l: LeadGenerique) {
  const f = l.subscriber.firstName || ''
  const n = l.subscriber.lastName || ''
  return (f + ' ' + n).trim() || l.id.slice(0, 8)
}

function snippet(t: Task | undefined) {
  if (!t) return '—'
  const last = t.logs?.split('\n').slice(-1)[0]
  return last || `${t.platform} · ${t.product}`
}

function since(dateIso?: string | null) {
  if (!dateIso) return ''
  const ms = Date.now() - new Date(dateIso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}j`
}

function groupByDate(items: Thread[]): Section[] {
  const today = startOfDay(new Date())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const weekStart = startOfWeek(today)
  const s1: Thread[] = []
  const s2: Thread[] = []
  const s3: Thread[] = []
  const s4: Thread[] = []
  for (const th of items) {
    const d = new Date(th.lastAt)
    if (d >= today) s1.push(th)
    else if (d >= yesterday) s2.push(th)
    else if (d >= weekStart) s3.push(th)
    else s4.push(th)
  }
  return [
    { title: 'Aujourd\'hui', items: s1 },
    { title: 'Hier', items: s2 },
    { title: 'Cette semaine', items: s3 },
    { title: 'Plus ancien', items: s4 },
  ]
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function startOfWeek(d: Date) {
  // Monday as first day of week
  const day = d.getDay() || 7
  const diff = d.getDate() - day + 1
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

