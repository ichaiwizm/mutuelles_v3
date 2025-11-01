import React, { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogBody } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import type { LeadGenerique } from '../../../shared/types/canonical'

export function SpotlightDialog(p: { open: boolean; onClose: () => void; leads: LeadGenerique[]; onOpenLead: (id: string)=>void }) {
  const [q, setQ] = useState('')
  useEffect(()=> { if (!p.open) setQ('') }, [p.open])
  const items = useMemo(()=> p.leads.filter(l => {
    const text = `${l.subscriber.firstName||''} ${l.subscriber.lastName||''} ${l.contact?.email||''}`.toLowerCase()
    return !q || text.includes(q.toLowerCase())
  }).slice(0, 20), [p.leads, q])
  return (
    <Dialog open={p.open}>
      <DialogContent className="max-w-xl">
        <DialogHeader>Recherche</DialogHeader>
        <DialogBody>
          <Input autoFocus placeholder="Nom, email…" value={q} onChange={(e)=> setQ(e.target.value)} />
          <div className="mt-2 max-h-[60vh] overflow-auto divide-y">
            {items.map((l)=> (
              <div key={l.id} className="px-2 py-2 cursor-pointer hover:bg-neutral-50" onClick={()=> { p.onOpenLead(l.id); p.onClose() }}>
                <div className="font-medium text-sm">{nameOf(l)}</div>
                <div className="text-xs opacity-70">{l.contact?.email}</div>
              </div>
            ))}
            {items.length===0 && <div className="p-3 text-sm opacity-60">Aucun résultat</div>}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

function nameOf(l: LeadGenerique) { const f=l.subscriber.firstName||''; const n=l.subscriber.lastName||''; return (f+' '+n).trim()||l.id.slice(0,8) }

