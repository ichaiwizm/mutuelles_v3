import React from 'react'
import type { LeadGenerique, Task } from '../../shared/types/canonical'

function since(dateIso?: string | null) {
  if (!dateIso) return ''
  const ms = Date.now() - new Date(dateIso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}j`
}

export function LeadOverview(p: {
  lead: LeadGenerique
  tasks: Task[]
  selectedTaskId: string | null
  onSelectTask: (id: string) => void
  onNewClick: () => void
}) {
  const name = displayName(p.lead)
  const mail = p.lead.contact?.email
  const tel = p.lead.contact?.telephone
  const items = [...p.tasks].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)).slice(0, 12)

  return (
    <section className="border rounded p-3 space-y-3 h-full overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">{name}</div>
          <div className="text-sm opacity-70 space-x-2">
            {mail && <span>{mail}</span>}
            {tel && <span>· {tel}</span>}
          </div>
        </div>
        <button className="px-3 py-1 border rounded" onClick={p.onNewClick}>Nouveau devis</button>
      </div>

      <div>
        <div className="font-semibold mb-1">Dernières exécutions</div>
        <div className="divide-y border rounded">
          {items.map((t) => (
            <div
              key={t.id}
              className={`p-2 text-sm cursor-pointer ${p.selectedTaskId === t.id ? 'bg-neutral-100' : ''}`}
              onClick={() => p.onSelectTask(t.id)}
            >
              <div className="flex items-center justify-between">
                <div className="truncate">
                  <span className="font-medium">{t.platform}</span> · {t.product}
                </div>
                <div className="opacity-60">{since(t.createdAt)} · {t.status}</div>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="p-3 text-sm opacity-70">Aucune exécution</div>}
        </div>
      </div>
    </section>
  )
}

function displayName(l: LeadGenerique) {
  const f = l.subscriber.firstName || ''
  const n = l.subscriber.lastName || ''
  return (f + ' ' + n).trim() || l.id.slice(0, 8)
}

