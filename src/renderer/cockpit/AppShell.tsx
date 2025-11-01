import React from 'react'
import { cn } from '../lib/cn'
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '../components/ui/tooltip'

type NavKey = 'leads'|'automations'|'history'|'settings'|'credentials'

export function AppShell(p: { nav: NavKey; onNav: (k: NavKey)=>void; children: React.ReactNode; status?: React.ReactNode; title?: string; right?: React.ReactNode; automationsActive?: boolean; leadsAwaiting?: number; density?: 'compact'|'comfortable'; onToggleDensity?: ()=>void }) {
  const rootClass = p.density==='compact' ? 'compact' : ''
  return (
    <div className={`h-full grid grid-rows-[1fr_auto] ${rootClass}`}>
      <div className="grid grid-cols-[220px_1fr]">
        <aside className="border-r bg-white h-full flex flex-col">
          <div className="h-12 px-3 flex items-center justify-between font-semibold">
            <div>Broker Cockpit</div>
            <button title="Densité" onClick={p.onToggleDensity} className="text-xs px-2 py-1 border rounded">{p.density==='compact'?'Compact':'Confort'}</button>
          </div>
          <nav className="p-1 text-sm">
            <Item label="Leads" active={p.nav==='leads'} onClick={()=> p.onNav('leads')} badge={p.leadsAwaiting} />
            <Item label="Automatisations" active={p.nav==='automations'} onClick={()=> p.onNav('automations')} pulse={!!p.automationsActive} />
            <Item label="Historique / Résultats" active={p.nav==='history'} onClick={()=> p.onNav('history')} />
            <div className="h-3" />
            <Item label="Configuration" active={p.nav==='settings'} onClick={()=> p.onNav('settings')} />
            <Item label="Identifiants plateformes" active={p.nav==='credentials'} onClick={()=> p.onNav('credentials')} />
          </nav>
        </aside>
        <main className="min-h-0 flex flex-col">
          <header className="h-12 border-b px-3 flex items-center justify-between bg-white">
            <div className="text-sm opacity-70">{p.title || ''}</div>
            <div>{p.right}</div>
          </header>
          <div className="flex-1 min-h-0 overflow-hidden bg-neutral-50">{p.children}</div>
        </main>
      </div>
      <footer className="h-8 border-t bg-white px-3 text-xs flex items-center justify-between">
        <div className="opacity-70">DB: OK · Sync: il y a 2 min · v<span id="app-version">—</span></div>
        <div className="opacity-70">{p.status}</div>
      </footer>
    </div>
  )
}

function Item(p: { label: string; active?: boolean; onClick: ()=>void; badge?: number; pulse?: boolean }) {
  return (
    <div className={cn('px-3 py-2 rounded cursor-pointer flex items-center justify-between', p.active ? 'bg-neutral-100' : 'hover:bg-neutral-50')} onClick={p.onClick}>
      <div>{p.label}</div>
      <div className="flex items-center gap-2">
        {p.pulse && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
        {typeof p.badge === 'number' && <span className="text-xs bg-neutral-100 rounded px-1">{p.badge}</span>}
      </div>
    </div>
  )
}
