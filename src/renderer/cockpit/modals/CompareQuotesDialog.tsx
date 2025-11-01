import React, { useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogClose } from '../../components/ui/dialog'
import type { Quote, LeadGenerique } from '../../../shared/types/canonical'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'

function h(s: string) { let x=0; for (let i=0;i<s.length;i++) x=(x*31 + s.charCodeAt(i))>>>0; return x }
function crit(id: string) {
  const x = h(id)
  const fran = [0,50,100,150][x%4]
  const car = [0,1,2,3][(x>>3)%4]
  const net = ['Étroit','Standard','Étendu'][(x>>5)%3]
  return { franchise: fran, carence: car, reseau: net }
}

export function CompareQuotesDialog(p: { open: boolean; onClose: () => void; quotes: Quote[]; leads: LeadGenerique[] }) {
  const rows = useMemo(() => p.quotes.slice().sort((a,b)=> (Number(a.premium||999999) - Number(b.premium||999999))), [p.quotes])
  const best = rows.length? rows[0] : null
  return (
    <Dialog open={p.open}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>Comparer les devis</DialogHeader>
        <DialogBody>
          <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] text-sm border-b bg-neutral-50">
            <div className="px-2 py-1 font-medium">Plateforme / Produit</div>
            <div className="px-2 py-1 font-medium text-right">Prime</div>
            <div className="px-2 py-1 font-medium text-right">Franchise</div>
            <div className="px-2 py-1 font-medium text-right">Carence</div>
            <div className="px-2 py-1 font-medium">Statut</div>
          </div>
          {rows.map((q)=> (
            <div key={q.id} className={`grid grid-cols-[1fr_auto_auto_auto_1fr] items-center border-b ${best?.id===q.id?'bg-green-50':''}`}>
              <div className="px-2 py-2">{q.platform} · {q.product}</div>
              <div className="px-2 py-2 text-right">{q.premium? `${q.premium} €`:'—'}</div>
              <div className="px-2 py-2 text-right">{crit(q.id).franchise} €</div>
              <div className="px-2 py-2 text-right">{crit(q.id).carence} mois</div>
              <div className="px-2 py-2"><Badge variant={q.status==='won'?'success':q.status==='lost'?'error':q.status==='submitted'?'warning':undefined}>{q.status}</Badge> <Button className="ml-2" variant="outline">📄 PDF</Button></div>
            </div>
          ))}
          {rows.length===0 && <div className="p-3 text-sm opacity-60">Aucun devis à comparer</div>}
          <div className="mt-3 text-xs opacity-60">Astuce: le meilleur prix est surligné en vert.</div>
          <div className="mt-3 text-right"><DialogClose asChild><Button variant="outline">Fermer</Button></DialogClose></div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
