import React, { useMemo, useState } from 'react'

export type ListItem = { id: string; title: string; subtitle?: string }

export function LeadList(p: {
  items: ListItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onImport: () => void
}) {
  const [q, setQ] = useState('')
  const items = useMemo(() => {
    if (!q) return p.items
    const s = q.toLowerCase()
    return p.items.filter((i) =>
      i.title.toLowerCase().includes(s) || (i.subtitle || '').toLowerCase().includes(s)
    )
  }, [p.items, q])

  return (
    <section className="border rounded p-2 flex flex-col h-full">
      <div className="flex gap-2 mb-2">
        <button className="px-2 py-1 border rounded" title="Nouveau" onClick={p.onAdd}>＋</button>
        <button className="px-2 py-1 border rounded" title="Importer" onClick={p.onImport}>⤓</button>
        <input
          placeholder="Rechercher"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 border px-2 py-1 rounded text-sm"
        />
      </div>
      <div className="flex-1 overflow-auto divide-y">
        {items.map((it) => (
          <div
            key={it.id}
            className={`p-2 cursor-pointer ${p.selectedId === it.id ? 'bg-neutral-200' : ''}`}
            onClick={() => p.onSelect(it.id)}
          >
            <div className="text-sm font-medium truncate" title={it.title}>{it.title}</div>
            {it.subtitle && <div className="text-xs opacity-70 truncate" title={it.subtitle}>{it.subtitle}</div>}
          </div>
        ))}
      </div>
    </section>
  )
}
