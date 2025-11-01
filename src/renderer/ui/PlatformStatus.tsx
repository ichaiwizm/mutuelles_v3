import React from 'react'
import type { PlatformStatus } from '../mocks/bridge'

function Dot(p: { status: string }) {
  const color = p.status === 'ok' ? 'bg-green-500' : p.status === 'degrade' ? 'bg-amber-500' : 'bg-rose-500'
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />
}

export function PlatformStatusList(p: { items: PlatformStatus[] }) {
  return (
    <div className="border-t p-3 space-y-2">
      <div className="font-semibold">État des plateformes</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {p.items.map((x) => (
          <div key={x.key} className="flex items-center justify-between border rounded px-2 py-1 bg-neutral-50">
            <div>{x.label}</div>
            <div className="flex items-center gap-2"><Dot status={x.status} /><span className="opacity-60">{labelOf(x.status)}</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function labelOf(s: string) {
  return s === 'ok' ? 'OK' : s === 'degrade' ? 'Dégradé' : 'Incident'
}

