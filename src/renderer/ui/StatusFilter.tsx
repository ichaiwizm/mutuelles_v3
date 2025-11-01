import React from 'react'

const LABELS = {
  all: 'Tous',
  pending: 'En attente',
  running: 'En cours',
  success: 'Succès',
  failed: 'Échecs',
} as const

export type StatusKey = keyof typeof LABELS

export function StatusFilter(p: { value: StatusKey; onChange: (v: StatusKey) => void }) {
  const keys: StatusKey[] = ['all', 'pending', 'running', 'success', 'failed']
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b bg-white">
      {keys.map((k) => (
        <button
          key={k}
          className={`px-2 py-1 rounded text-sm ${p.value === k ? 'bg-neutral-900 text-white' : 'bg-neutral-100'}`}
          onClick={() => p.onChange(k)}
        >
          {LABELS[k]}
        </button>
      ))}
    </div>
  )
}
