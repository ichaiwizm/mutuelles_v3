/**
 * ReplayFailuresButton - Quick action button to replay failed executions
 * Appears when there are error items in the current run
 */

import React from 'react'
import { RotateCcw } from 'lucide-react'

interface ReplayFailuresButtonProps {
  errorCount: number
  onClick: () => void
}

export default function ReplayFailuresButton({ errorCount, onClick }: ReplayFailuresButtonProps) {
  if (errorCount === 0) {
    return null
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 rounded-md hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
      title="Rejouer les exécutions échouées"
    >
      <RotateCcw size={16} />
      Rejouer les {errorCount} échec{errorCount > 1 ? 's' : ''}
    </button>
  )
}
