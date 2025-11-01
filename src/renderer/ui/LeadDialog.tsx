import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogClose } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Button } from '../components/ui/button'
import { MockBridge } from '../mocks/bridge'
import type { LeadGenerique } from '../../shared/types/canonical'

export function LeadDialog(p: { open: boolean; onClose: () => void; defaultFolder: string }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [folder, setFolder] = useState(p.defaultFolder)
  React.useEffect(()=> setFolder(p.defaultFolder), [p.defaultFolder])

  const create = async () => {
    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    const lead: LeadGenerique = {
      id,
      subscriber: { firstName, lastName },
      contact: { email, telephone },
      needs: [],
      metadata: { folder },
      createdAt,
    }
    await MockBridge.leads.create(lead)
    p.onClose()
  }
  const folders = MockBridge.leads.folders()
  const can = firstName.trim().length>0 || lastName.trim().length>0
  return (
    <Dialog open={p.open}>
      <DialogContent>
        <DialogHeader>Nouveau lead</DialogHeader>
        <DialogBody>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <label>Prénom</label>
            <Input className="col-span-2" value={firstName} onChange={(e)=> setFirstName(e.target.value)} />
            <label>Nom</label>
            <Input className="col-span-2" value={lastName} onChange={(e)=> setLastName(e.target.value)} />
            <label>Email</label>
            <Input className="col-span-2" value={email} onChange={(e)=> setEmail(e.target.value)} />
            <label>Téléphone</label>
            <Input className="col-span-2" value={telephone} onChange={(e)=> setTelephone(e.target.value)} />
            <label>Dossier</label>
            <Select className="col-span-2" value={folder} onChange={(e)=> setFolder(e.target.value)}>
              {folders.map((f)=> <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={create} disabled={!can}>Créer</Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

