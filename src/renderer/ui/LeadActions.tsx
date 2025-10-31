import React, { useEffect, useState } from 'react'
import type { LeadGenerique } from '../../shared/types/canonical'
import { TASKS_CATALOG } from '../../shared/defaults/tasks_catalog'

export function LeadActions(p: {
  lead: LeadGenerique | null
  onEnqueue: (choices: { key: string; checked: boolean }[]) => void
}) {
  const [choices, setChoices] = useState(
    TASKS_CATALOG.map((t) => ({ key: `${t.platform}:${t.product}`, label: t.label, checked: false }))
  )

  useEffect(() => {
    setChoices((prev) => prev.map((c) => ({ ...c, checked: false })))
  }, [p.lead?.id])

  if (!p.lead)
    return (
      <section className="border rounded p-4">
        <div className="opacity-70">Sélectionnez un lead</div>
      </section>
    )

  return (
    <section className="border rounded p-2 space-y-3 overflow-auto">
      <div>
        <div className="font-semibold">Lead</div>
        <pre className="text-xs bg-neutral-100 p-2 rounded overflow-auto">
          {JSON.stringify(p.lead, null, 2)}
        </pre>
      </div>
      <div>
        <div className="font-semibold mb-1">Actions disponibles</div>
        <div className="space-y-1">
          {choices.map((c) => (
            <label key={c.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={c.checked}
                onChange={(e) =>
                  setChoices((prev) => prev.map((x) => (x.key === c.key ? { ...x, checked: e.target.checked } : x)))
                }
              />
              {c.label}
            </label>
          ))}
        </div>
        <button className="mt-2 px-3 py-1 border rounded" onClick={() => p.onEnqueue(choices)}>
          Lancer
        </button>
      </div>
    </section>
  )
}

