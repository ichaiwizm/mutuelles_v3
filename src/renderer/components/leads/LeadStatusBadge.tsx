import React from 'react'
import type { LeadSource } from '../../../shared/types/leads'

interface LeadStatusBadgeProps {
  source: LeadSource
  provider?: string | null
}

export default function LeadStatusBadge({ source, provider }: LeadStatusBadgeProps) {
  const badgeClasses = {
    gmail: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    manual: 'bg-neutral-100 text-neutral-800 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
    file: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700'
  }

  const sourceLabels = {
    gmail: 'Gmail',
    manual: 'Manuel',
    file: 'Fichier'
  }

  return (
    <div className="flex flex-col gap-1">
      <span className={`text-xs px-2 py-0.5 rounded border ${badgeClasses[source]}`}>
        {sourceLabels[source]}
      </span>
      {provider && (
        <span className="text-[10px] text-neutral-400 capitalize">
          {provider}
        </span>
      )}
    </div>
  )
}