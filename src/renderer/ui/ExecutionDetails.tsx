import React from 'react'
import type { LeadGenerique, Task } from '../../shared/types/canonical'

export function ExecutionDetails(p: {
  task: Task | null
  lead: LeadGenerique | null
  onRerun?: () => void
}) {
  if (!p.task) return <div className="w-80" />
  return (
    <section className="w-80 h-full overflow-auto">
      <div className="p-3 space-y-3">
        <div>
          <div className="font-semibold">{p.task.platform} · {p.task.product}</div>
          <div className="text-sm opacity-60">{p.task.status}</div>
        </div>
        {p.lead && (
          <div className="text-sm">
            <div className="font-medium">{displayName(p.lead)}</div>
            <div className="opacity-70">{p.lead.contact?.email}</div>
          </div>
        )}
        <div className="flex gap-2">
          <button className="px-3 py-1 border rounded" onClick={p.onRerun}>Relancer</button>
          {p.task.resultPath && <a className="px-3 py-1 border rounded" href="#">Ouvrir résultat</a>}
        </div>
        {p.task.logs && (
          <div>
            <div className="font-medium mb-1">Logs</div>
            <pre className="text-xs bg-neutral-50 p-2 rounded whitespace-pre-wrap">{p.task.logs}</pre>
          </div>
        )}
      </div>
    </section>
  )
}

function displayName(l: LeadGenerique) {
  const f = l.subscriber.firstName || ''
  const n = l.subscriber.lastName || ''
  return (f + ' ' + n).trim() || l.id.slice(0, 8)
}
