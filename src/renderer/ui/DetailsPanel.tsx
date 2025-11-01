import React from 'react'
import type { LeadGenerique, Task } from '../../shared/types/canonical'

export function DetailsPanel(p: { lead: LeadGenerique; task: Task | null }) {
  return (
    <section className="border rounded p-2 h-full overflow-auto space-y-3">
      {p.task ? (
        <div className="space-y-2">
          <div className="font-semibold">Détails exécution</div>
          <div className="text-sm">
            <div>Plateforme: {p.task.platform}</div>
            <div>Produit: {p.task.product}</div>
            <div>Statut: {p.task.status}</div>
            {p.task.resultPath && (
              <div className="truncate" title={p.task.resultPath}>Résultat: {p.task.resultPath}</div>
            )}
          </div>
          {p.task.logs && (
            <div>
              <div className="font-medium mb-1">Logs</div>
              <pre className="text-xs bg-neutral-100 p-2 rounded whitespace-pre-wrap">
                {p.task.logs}
              </pre>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="font-semibold">Détails lead</div>
          <pre className="text-xs bg-neutral-100 p-2 rounded overflow-auto">
            {JSON.stringify(p.lead, null, 2)}
          </pre>
        </div>
      )}
    </section>
  )
}

