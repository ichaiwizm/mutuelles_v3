import React, { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogClose } from '../components/ui/dialog'
import { Select } from '../components/ui/select'
import { Button } from '../components/ui/button'
import { MockBridge } from '../mocks/bridge'
import type { LeadGenerique, Quote } from '../../shared/types/canonical'

export function QuoteWizard(p: { open: boolean; onClose: () => void; lead: LeadGenerique | null }) {
  const platforms = MockBridge.platforms.list()
  const [platform, setPlatform] = useState(platforms[0]?.key || 'swisslife')
  const products = useMemo(() => ['sante-pro', 'sante-plus', 'prevoyance'], [platform])
  const [product, setProduct] = useState(products[0])
  const canSubmit = !!p.lead && !!platform && !!product
  const submit = async () => {
    if (!p.lead) return
    const q: Quote = {
      id: crypto.randomUUID(),
      leadId: p.lead.id,
      platform,
      product,
      status: 'ready',
      premium: null,
      currency: 'EUR',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: null,
    }
    await MockBridge.quotes.create(q)
    await MockBridge.tasks.enqueue([{ id: crypto.randomUUID(), leadId: p.lead.id, platform, product, status: 'pending', createdAt: new Date().toISOString() } as any])
    p.onClose()
  }
  return (
    <Dialog open={p.open}>
      <DialogContent>
        <DialogHeader>Nouveau devis</DialogHeader>
        <DialogBody>
          {!p.lead && <div className="text-sm opacity-70">Sélectionnez d'abord un lead.</div>}
          {p.lead && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 items-center gap-2 text-sm">
                <label>Plateforme</label>
                <Select className="col-span-2" value={platform} onChange={(e)=> setPlatform(e.target.value)}>
                  {platforms.map((pl)=> <option key={pl.key} value={pl.key}>{pl.label}</option>)}
                </Select>
                <label>Produit</label>
                <Select className="col-span-2" value={product} onChange={(e)=> setProduct(e.target.value)}>
                  {products.map((pd)=> <option key={pd} value={pd}>{pd}</option>)}
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Annuler</Button>
                </DialogClose>
                <Button onClick={submit} disabled={!canSubmit}>Créer</Button>
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

