import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogClose } from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { Select } from '../../components/ui/select'
import { MockBridge } from '../../mocks/bridge'

export function ImportCsvDialog(p: { open: boolean; onClose: () => void }) {
  const [preview, setPreview] = useState<{ headers: string[]; sample: string[][]; mapping: Record<string,string> }|null>(null)
  useEffect(()=> { if (p.open) MockBridge.csv.preview().then(setPreview) }, [p.open])
  const setMap = (k: string, v: string) => setPreview(prev => prev ? { ...prev, mapping: { ...prev.mapping, [k]: v } } : prev)
  const confirm = async () => { await MockBridge.csv.import(preview?.mapping || {}); p.onClose() }
  return (
    <Dialog open={p.open}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>Import CSV</DialogHeader>
        <DialogBody>
          {!preview && <div className="text-sm opacity-60">Préparation…</div>}
          {preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm items-center">
                {preview.headers.map((h) => (
                  <React.Fragment key={h}>
                    <label>{h}</label>
                    <Select className="col-span-2" value={preview.mapping[h]||''} onChange={(e)=> setMap(h, e.target.value)}>
                      <option value="">—</option>
                      <option value="subscriber.firstName">Prénom</option>
                      <option value="subscriber.lastName">Nom</option>
                      <option value="contact.email">Email</option>
                      <option value="contact.telephone">Téléphone</option>
                    </Select>
                  </React.Fragment>
                ))}
              </div>
              <div className="border rounded">
                <div className="px-2 py-1 text-xs bg-neutral-50 border-b">Aperçu</div>
                <div className="p-2 text-sm">
                  {preview.sample.map((row, i)=>(<div key={i} className="grid grid-cols-4"><span>{row[0]}</span><span>{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span></div>))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
                <Button onClick={confirm}>Importer</Button>
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

