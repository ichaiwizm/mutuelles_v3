import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogClose } from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { Checkbox } from '../../components/ui/checkbox'
import { MockBridge } from '../../mocks/bridge'

export function ImportGmailDialog(p: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<any[]>([])
  const [sel, setSel] = useState<Record<string, boolean>>({})
  useEffect(() => { if (p.open) MockBridge.gmail.list().then(setItems) }, [p.open])
  const count = Object.values(sel).filter(Boolean).length
  const importSel = async () => {
    const ids = Object.entries(sel).filter(([,v])=>v).map(([id])=>id)
    await MockBridge.gmail.import(ids)
    p.onClose()
  }
  return (
    <Dialog open={p.open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>Import Gmail</DialogHeader>
        <DialogBody>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {items.map((m)=> (
              <label key={m.id} className="grid grid-cols-[auto_1fr] gap-2 items-start border rounded p-2">
                <Checkbox checked={!!sel[m.id]} onChange={(e)=> setSel({ ...sel, [m.id]: e.target.checked })} />
                <div>
                  <div className="text-sm font-medium">{m.subject}</div>
                  <div className="text-xs opacity-70">{m.from} — {m.snippet}</div>
                  <div className="text-xs mt-1">Nom détecté: {m.detected.firstName} {m.detected.lastName} ✓</div>
                </div>
              </label>
            ))}
            {items.length===0 && <div className="text-sm opacity-60">Aucun mail détecté</div>}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={importSel} disabled={!count}>Importer {count? `(${count})`: ''}</Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

