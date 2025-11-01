import React from 'react'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'

export function Header(p: { q: string; onQ: (v: string)=>void; onNewLead: ()=>void; onNewQuote: ()=>void }) {
  return (
    <header className="h-14 border-b bg-white grid grid-cols-[220px_1fr_auto] items-center px-3 gap-3">
      <div className="font-semibold tracking-tight">Broker · Workbench</div>
      <Input placeholder="Rechercher..." value={p.q} onChange={(e)=> p.onQ(e.target.value)} />
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={p.onNewLead}>Nouveau lead</Button>
        <Button onClick={p.onNewQuote}>Nouveau devis</Button>
      </div>
    </header>
  )
}

