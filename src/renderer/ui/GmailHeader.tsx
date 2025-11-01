import React from 'react'
import { Settings, Search, HelpCircle, User } from 'lucide-react'

export function GmailHeader(p: {
  onOpenSettings: () => void
  q: string
  onQ: (v: string) => void
}) {
  return (
    <header className="h-12 flex items-center justify-between px-3 border-b bg-white">
      <div className="flex items-center gap-2">
        <div className="font-semibold">Broker-Automation</div>
      </div>
      <div className="flex items-center gap-2 w-[520px]">
        <div className="flex items-center gap-1 flex-1 border rounded px-2 py-1 bg-neutral-50">
          <Search size={16} className="opacity-60" />
          <input
            className="flex-1 bg-transparent text-sm outline-none"
            placeholder="Rechercher leads, exécutions, plateformes..."
            value={p.q}
            onChange={(e) => p.onQ(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button title="Aide" className="p-1 rounded hover:bg-neutral-100"><HelpCircle size={18} /></button>
        <button title="Réglages" className="p-1 rounded hover:bg-neutral-100" onClick={p.onOpenSettings}>
          <Settings size={18} />
        </button>
        <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center">
          <User size={16} />
        </div>
      </div>
    </header>
  )
}

