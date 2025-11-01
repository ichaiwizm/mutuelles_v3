import React, { useMemo, useState } from 'react'
import type { LeadGenerique } from '../../shared/types/canonical'
import { LeadAvatar } from './LeadAvatar'

export function LeadFoldersPanel(p: {
  leads: LeadGenerique[]
  folders: string[]
  selectedFolder: string
  selectedLeadId: string | null
  onSelectFolder: (f: string) => void
  onSelectLead: (id: string | null) => void
  onCompose: () => void
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const groups = useMemo(() => {
    const m: Record<string, LeadGenerique[]> = {}
    p.folders.forEach((f) => (m[f] = []))
    p.leads.forEach((l) => {
      const f = (l.metadata?.folder as string) || 'Nouveaux'
      ;(m[f] || (m[f] = [])).push(l)
    })
    Object.values(m).forEach((arr) => arr.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)))
    return m
  }, [p.leads, p.folders])

  return (
    <aside className="w-72 border-r bg-white h-full flex flex-col">
      <div className="p-3">
        <button onClick={p.onCompose} className="w-full px-3 py-2 bg-blue-600 text-white rounded">Nouveau devis</button>
      </div>
      <div className="flex-1 overflow-auto">
        {p.folders.map((f) => (
          <div key={f} className="px-2 py-1">
            <div
              className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer ${p.selectedFolder === f ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`}
              onClick={() => {
                p.onSelectFolder(f)
                setOpen((o) => ({ ...o, [f]: !(o[f] ?? true) }))
              }}
            >
              <div className="font-medium text-sm">{f}</div>
              <div className="text-xs opacity-60">{groups[f]?.length || 0}</div>
            </div>
            {(open[f] ?? true) && (
              <div className="mt-1">
                {(groups[f] || []).map((l) => (
                  <div
                    key={l.id}
                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${p.selectedLeadId === l.id ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`}
                    onClick={() => p.onSelectLead(l.id)}
                  >
                    <LeadAvatar lead={l} size={20} />
                    <div className="truncate text-sm">{displayName(l)}</div>
                  </div>
                ))}
                {(groups[f] || []).length === 0 && (
                  <div className="px-2 py-1 text-xs opacity-60">Aucun lead</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  )
}

function displayName(l: LeadGenerique) {
  const f = l.subscriber.firstName || ''
  const n = l.subscriber.lastName || ''
  return (f + ' ' + n).trim() || l.id.slice(0, 8)
}

