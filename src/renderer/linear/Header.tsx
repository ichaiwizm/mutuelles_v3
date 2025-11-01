import React from 'react'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'

export type Mode = 'leads'|'quotes'|'runs'

export function Header(p: { q: string; onQ: (v: string)=>void; mode: Mode; onMode: (m: Mode)=>void; onNewLead: ()=>void; onNewQuote: ()=>void }) {
  return (
    <header className="h-12 border-b bg-white flex items-center gap-3 px-3">
      <div className="font-semibold tracking-tight">Broker</div>
      <Segment value={p.mode} onChange={p.onMode} />
      <div className="flex-1 max-w-[560px]"><Input placeholder="Rechercher" value={p.q} onChange={(e)=> p.onQ(e.target.value)} /></div>
      <Button variant="outline" onClick={p.onNewLead}>Nouveau lead</Button>
      <Button onClick={p.onNewQuote}>Nouveau devis</Button>
    </header>
  )
}

function Segment(p: { value: Mode; onChange: (m: Mode)=>void }) {
  const Item = ({ v, label }: { v: Mode; label: string }) => (
    <button onClick={()=> p.onChange(v)} className={`px-2 h-8 rounded text-sm ${p.value===v? 'bg-neutral-900 text-white':'bg-neutral-100'}`}>{label}</button>
  )
  return (
    <div className="inline-flex gap-1 bg-neutral-100 rounded p-1">
      <Item v="leads" label="Leads" />
      <Item v="quotes" label="Devis" />
      <Item v="runs" label="Exécutions" />
    </div>
  )
}

