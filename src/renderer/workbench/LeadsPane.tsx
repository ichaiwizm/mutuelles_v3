import React, { useMemo } from 'react'
import type { LeadGenerique } from '../../shared/types/canonical'

export function LeadsPane(p: { leads: LeadGenerique[]; folders: string[]; folder: string; onFolder: (f: string)=>void; selectedLeadId: string | null; onSelectLead: (id: string)=>void }) {
  const grouped = useMemo(() => {
    const ids = p.leads.filter(l => (l.metadata?.folder||'Nouveaux')===p.folder)
      .sort((a,b)=> a.createdAt>b.createdAt?-1:1)
    return ids
  }, [p.leads, p.folder])
  return (
    <aside className="border-r bg-white h-full flex flex-col">
      <div className="p-2 grid grid-cols-2 gap-1">
        {p.folders.map((f) => (
          <button key={f} onClick={()=> p.onFolder(f)} className={`px-2 py-1 rounded text-xs border ${p.folder===f?'bg-neutral-900 text-white border-neutral-900':'bg-white'}`}>{f}</button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {grouped.map((l) => (
          <div key={l.id} onClick={()=> p.onSelectLead(l.id)} className={`px-3 py-2 border-b cursor-pointer ${p.selectedLeadId===l.id?'bg-neutral-50':''}`}>
            <div className="font-medium text-sm truncate">{nameOf(l)}</div>
            <div className="text-xs opacity-60 truncate">{l.contact?.email || '—'}</div>
          </div>
        ))}
        {grouped.length===0 && <div className="p-3 text-sm opacity-60">Aucun lead</div>}
      </div>
    </aside>
  )
}

function nameOf(l: LeadGenerique) {
  const f = l.subscriber.firstName||''
  const n = l.subscriber.lastName||''
  return (f+' '+n).trim() || l.id.slice(0,8)
}

