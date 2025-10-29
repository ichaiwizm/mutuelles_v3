import type { EnrichedLeadData } from '../../../../../shared/types/emailParsing'
import type { EmailMessage } from '../../../../../shared/types/email'

interface LeadSelectionHeaderProps {
  totalCount: number
  selectedCount: number
  completeCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  leads: EnrichedLeadData[]
  emails: EmailMessage[]
  duplicateCount?: number
  onRemoveDuplicates?: () => void
}

/**
 * Header avec statistiques et actions de sélection
 * Design épuré sur une seule ligne
 */
export function LeadSelectionHeader({
  totalCount,
  selectedCount,
  completeCount,
  onSelectAll,
  onDeselectAll,
  leads,
  emails,
  duplicateCount = 0,
  onRemoveDuplicates
}: LeadSelectionHeaderProps) {
  const incompleteCount = totalCount - completeCount

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      {/* Stats */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {totalCount} lead{totalCount > 1 ? 's' : ''}
        </span>
        {incompleteCount > 0 && (
          <span className="ml-2 text-amber-600 dark:text-amber-400">
            · {incompleteCount} incomplet{incompleteCount > 1 ? 's' : ''}
          </span>
        )}
        {duplicateCount > 0 && (
          <span className="ml-2 text-red-600 dark:text-red-400">
            · {duplicateCount} doublon{duplicateCount > 1 ? 's' : ''}
          </span>
        )}
        {selectedCount > 0 && (
          <span className="ml-2 text-blue-600 dark:text-blue-400">
            · {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* debug copy removed */}

        <button
          type="button"
          onClick={onSelectAll}
          disabled={completeCount === 0}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Tout sélectionner
        </button>
        <button
          type="button"
          onClick={onDeselectAll}
          disabled={selectedCount === 0}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Tout désélectionner
        </button>

        {duplicateCount > 0 && (
          <button
            type="button"
            onClick={onRemoveDuplicates}
            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
          >
            Supprimer les doublons
          </button>
        )}
      </div>
    </div>
  )
}
