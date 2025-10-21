/**
 * DuplicateWarningBanner - Warning banner for duplicate submissions
 * Displays warning when selected leads have been submitted on selected flows recently
 */

import React, { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react'
import type { DuplicateInfo } from '../../../services/duplicateDetector'
import { formatDuplicateSummary } from '../../../services/duplicateDetector'

interface DuplicateWarningBannerProps {
  duplicates: DuplicateInfo[]
  onExcludeDuplicates: () => void
}

export default function DuplicateWarningBanner({
  duplicates,
  onExcludeDuplicates
}: DuplicateWarningBannerProps) {
  const [showDetails, setShowDetails] = useState(false)

  if (duplicates.length === 0) {
    return null
  }

  const summary = formatDuplicateSummary(duplicates)

  return (
    <div className="rounded-lg border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30 p-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
              {summary}
            </p>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-xs font-medium text-orange-700 dark:text-orange-300 hover:text-orange-900 dark:hover:text-orange-100 transition-colors"
            >
              {showDetails ? 'Masquer' : 'Détails'}
              {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onExcludeDuplicates}
              className="text-xs font-medium text-orange-700 dark:text-orange-300 hover:text-orange-900 dark:hover:text-orange-100 underline"
            >
              Exclure les doublons
            </button>
          </div>
        </div>
      </div>

      {/* Details List */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {duplicates.map((dup, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-3 text-xs p-2 rounded bg-white dark:bg-neutral-900 border border-orange-200 dark:border-orange-800"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {dup.leadName}
                  </div>
                  <div className="text-neutral-600 dark:text-neutral-400 mt-0.5">
                    {dup.flowName}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="text-neutral-600 dark:text-neutral-400">
                    Il y a {dup.daysAgo}j
                  </div>
                  <div
                    className={`text-xs font-medium ${
                      dup.status === 'success'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : dup.status === 'error'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {dup.status === 'success' ? '✓ Succès' : dup.status === 'error' ? '✗ Échec' : 'En attente'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
