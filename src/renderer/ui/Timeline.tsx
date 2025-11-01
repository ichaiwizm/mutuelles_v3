import React from 'react'

export type Event = { id: string; at: string; text: string; kind: string }

function time(at: string) {
  try {
    const d = new Date(at)
    return d.toLocaleString()
  } catch {
    return at
  }
}

export function Timeline(p: { items: Event[] }) {
  if (!p.items.length) return null
  return (
    <div className="p-3 border-t">
      <div className="font-semibold mb-1">Historique</div>
      <div className="space-y-1 text-sm">
        {p.items.map((e) => (
          <div key={e.id} className="flex items-center justify-between">
            <div>{e.text}</div>
            <div className="opacity-60 text-xs">{time(e.at)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

