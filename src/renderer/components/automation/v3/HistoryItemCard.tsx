import React from 'react'
import { Play, Eye } from 'lucide-react'
import type { ExecutionHistoryItem } from '../../../../shared/types/automation'
import { formatDuration } from '../../../utils/dateGrouping'
import { getHistoryStatusConfig } from '../../../utils/statusStyles'

interface HistoryItemCardProps {
  runId: string
  item: ExecutionHistoryItem
  onRerun: (item: ExecutionHistoryItem) => void
  onViewDetails?: (
    runId: string,
    itemId: string,
    runDir: string,
    leadName: string,
    platformName: string,
    flowName: string
  ) => void
}

export default function HistoryItemCard({
  runId,
  item,
  onRerun,
  onViewDetails
}: HistoryItemCardProps) {
  const config = getHistoryStatusConfig(item.status)
  const StatusIcon = config.icon

  return (
    <div className={`p-3 rounded border ${config.borderColor} ${config.bgColor} hover:shadow-sm transition-all`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: status + labels */}
        <div className="flex items-center gap-3 min-w-0">
          <StatusIcon size={16} className={`flex-shrink-0 ${config.color}`} />
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{item.leadName}</div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
              <span>{item.platformName}</span>
              <span className="mx-1">•</span>
              <span>{item.flowName}</span>
            </div>
          </div>
        </div>

        {/* Right: duration + actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-xs text-neutral-500 text-right w-16">
            {item.durationMs ? formatDuration(item.durationMs) : '-'}
          </div>
          {/* Rerun (only for errors or cancelled) */}
          {(item.status === 'error' || item.status === 'cancelled') && (
            <button
              onClick={() => onRerun(item)}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-800 transition-colors group"
              title="Relancer cet item"
            >
              <Play size={14} className="text-neutral-600 dark:text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            </button>
          )}
          {/* View details */}
          {item.runDir && onViewDetails && (
            <button
              onClick={() =>
                onViewDetails(
                  runId,
                  item.id,
                  item.runDir!,
                  item.leadName,
                  item.platformName,
                  item.flowName
                )
              }
              className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-800 transition-colors group"
              title="Voir les détails"
            >
              <Eye size={14} className="text-neutral-600 dark:text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            </button>
          )}
        </div>
      </div>

      {/* Error message (if any) */}
      {item.status === 'error' && item.error && (
        <div className="mt-2 p-2 rounded bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap break-words max-h-32 overflow-auto">
            {item.error}
          </p>
        </div>
      )}
    </div>
  )
}
