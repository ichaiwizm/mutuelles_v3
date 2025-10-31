import React from 'react'

export type ListItem = { id: string; title: string; subtitle?: string }

export function LeadList(p: {
  items: ListItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onImport: () => void
}) {
  return (
    <section className="border rounded p-2 flex flex-col">
      <div className="flex gap-2 mb-2">
        <button className="px-2 py-1 border rounded" onClick={p.onAdd}>Nouveau</button>
        <button className="px-2 py-1 border rounded" onClick={p.onImport}>Importer</button>
      </div>
      <div className="flex-1 overflow-auto divide-y">
        {p.items.map((it) => (
          <div
            key={it.id}
            className={`p-2 cursor-pointer ${p.selectedId === it.id ? 'bg-neutral-200' : ''}`}
            onClick={() => p.onSelect(it.id)}
          >
            <div className="text-sm font-medium">{it.title}</div>
            {it.subtitle && <div className="text-xs opacity-70">{it.subtitle}</div>}
          </div>
        ))}
      </div>
    </section>
  )
}

