import React from 'react'
import { Plus, Inbox, Clock, CheckCircle2, XCircle, Archive } from 'lucide-react'

export type FolderItem = { key: string; label: string; count: number }

const ICONS: Record<string, React.ReactNode> = {
  Nouveaux: <Inbox size={16} />,
  'En cours': <Clock size={16} />,
  'Gagnés': <CheckCircle2 size={16} />,
  'Perdus': <XCircle size={16} />,
  Archives: <Archive size={16} />,
}

export function Sidebar(p: {
  folders: FolderItem[]
  selected: string
  onSelect: (key: string) => void
  onCompose: () => void
}) {
  return (
    <aside className="w-60 border-r bg-white h-full flex flex-col">
      <div className="p-3">
        <button onClick={p.onCompose} className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded">
          <Plus size={16} /> Nouveau devis
        </button>
      </div>
      <nav className="px-1 text-sm">
        {p.folders.map((f) => (
          <div
            key={f.key}
            className={`flex items-center justify-between gap-2 px-3 py-2 rounded cursor-pointer hover:bg-neutral-100 ${
              p.selected === f.key ? 'bg-neutral-100 font-medium' : ''
            }`}
            onClick={() => p.onSelect(f.key)}
          >
            <div className="flex items-center gap-2">
              <span>{ICONS[f.label] ?? <Inbox size={16} />}</span>
              <span>{f.label}</span>
            </div>
            <span className="opacity-60">{f.count}</span>
          </div>
        ))}
      </nav>
      <div className="mt-auto p-3 text-xs opacity-60">UI style: Gmail-like</div>
    </aside>
  )
}

