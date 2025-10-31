import React from 'react'
import type { Task } from '../../shared/types/canonical'

export function TaskHistory(p: { tasks: Task[]; onRun: () => void }) {
  return (
    <section className="border rounded p-2 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Historique</div>
        <button className="px-2 py-1 border rounded" onClick={p.onRun}>Exécuter en attente</button>
      </div>
      <div className="flex-1 overflow-auto text-sm divide-y">
        {p.tasks.map((t) => (
          <div key={t.id} className="p-2">
            <div>
              <span className="font-medium">{t.platform}</span> · {t.product}
            </div>
            <div className="text-xs opacity-70">{t.status}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

