import React, { useMemo } from 'react'
import type { Task } from '../../shared/types/canonical'

function since(dateIso?: string | null) {
  if (!dateIso) return ''
  const ms = Date.now() - new Date(dateIso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}j`
}

export function ExecutionList(p: {
  tasks: Task[]
  nameOf: (leadId: string) => string
  selectedId: string | null
  onSelect: (id: string) => void
  q: string
}) {
  const items = useMemo(() => {
    const s = p.q.toLowerCase()
    return p.tasks.filter((t) => {
      const txt = `${t.platform} ${t.product} ${p.nameOf(t.leadId)}`.toLowerCase()
      return !s || txt.includes(s)
    })
  }, [p.tasks, p.q])

  return (
    <section className="flex-1 overflow-auto">
      {items.map((t) => (
        <div
          key={t.id}
          className={`grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-2 border-b cursor-pointer hover:bg-neutral-50 ${
            p.selectedId === t.id ? 'bg-neutral-50' : ''
          }`}
          onClick={() => p.onSelect(t.id)}
        >
          <div className="truncate">
            <span className="font-medium">{t.platform}</span> · {t.product} — {p.nameOf(t.leadId)}
          </div>
          <div className="text-xs opacity-60">{since(t.createdAt)} · {t.status}</div>
        </div>
      ))}
      {items.length === 0 && <div className="p-6 text-sm opacity-70">Aucune exécution</div>}
    </section>
  )
}

