import React from 'react'

export function Suggestions(p: { items: string[] }) {
  if (!p.items.length) return null
  return (
    <div className="p-3 border-t">
      <div className="font-semibold mb-1">Suggestions</div>
      <ul className="list-disc list-inside text-sm space-y-1">
        {p.items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  )
}

