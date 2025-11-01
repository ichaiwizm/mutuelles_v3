import React, { useState } from 'react'
import { Button } from '../../components/ui/button'
import { PlatformConfigDialog } from '../modals/PlatformConfigDialog'

export function SettingsPage() {
  const [open, setOpen] = useState<null|string>(null)
  const items = [
    { key: 'swisslife', label: 'SwissLife One' },
    { key: 'alptis', label: 'Alptis' },
    { key: 'malakoff', label: 'Malakoff Humanis' },
  ]
  return (
    <section className="p-3 space-y-2">
      {items.map((it)=> (
        <div key={it.key} className="border rounded p-2 flex items-center justify-between">
          <div className="text-sm">{it.label}</div>
          <Button variant="outline" onClick={()=> setOpen(it.key)}>Configurer</Button>
        </div>
      ))}
      {open && <PlatformConfigDialog open={true} onClose={()=> setOpen(null)} platform={open} />}
    </section>
  )
}

