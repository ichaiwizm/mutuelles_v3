import React, { useState, useMemo, useEffect, useRef } from 'react'
import { ChevronRight, Folder, Check, X, Activity } from 'lucide-react'
import type { RunHistoryItem, ExecutionHistoryItem } from '../../../../shared/types/automation'
import { groupRunsByDate } from '../../../utils/dateGrouping'
import RunHistoryCard from './RunHistoryCard'

interface ExecutionHistoryFoldersViewProps {
  runs: RunHistoryItem[]
  onRerun: (runId: string) => void
  onRerunItem: (item: ExecutionHistoryItem) => void
  onDelete: (runId: string) => void
  onViewDetails?: (
    runId: string,
    itemId: string,
    runDir: string,
    leadName: string,
    platformName: string,
    flowName: string
  ) => void
}

export default function ExecutionHistoryFoldersView({
  runs,
  onRerun,
  onRerunItem,
  onDelete,
  onViewDetails
}: ExecutionHistoryFoldersViewProps) {
  // Group runs by date
  const dateGroups = useMemo(() => groupRunsByDate(runs), [runs])

  // Track which folders are expanded (default: only most recent expanded)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Track if initial setup has been done
  const initializedRef = useRef(false)

  // Initialize expanded groups only once (default: keep all collapsed)
  useEffect(() => {
    if (!initializedRef.current) {
      setExpandedGroups(new Set())
      initializedRef.current = true
    }
  }, [dateGroups])

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  if (dateGroups.length === 0) {
    return (
      <div className="text-center py-12">
        <Folder className="mx-auto mb-3 text-neutral-400" size={48} />
        <h3 className="font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
          Aucun historique
        </h3>
        <p className="text-sm text-neutral-500">
          Les runs terminées apparaîtront ici
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {dateGroups.map((group, groupIndex) => {
        const isExpanded = expandedGroups.has(group.key)

        return (
          <div key={group.key} className="space-y-2">
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group.key)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
            >
              <ChevronRight
                size={16}
                className={`text-neutral-500 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              />
              <Folder size={16} className="text-neutral-500" />
              <span className="font-semibold text-sm text-neutral-700 dark:text-neutral-300">
                {group.label}
              </span>
              <span className="text-xs text-neutral-500">
                ({group.runs.length} run{group.runs.length > 1 ? 's' : ''})
              </span>

              {/* Stats badge */}
              <div className="ml-auto flex items-center gap-2 text-xs">
                {/* Success count */}
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1">
                  <Check size={12} />
                  {group.runs.filter((r) => r.status === 'completed').length}
                </span>

                {/* Partial count */}
                {group.runs.filter((r) => r.status === 'partial').length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1">
                    <Activity size={12} />
                    {group.runs.filter((r) => r.status === 'partial').length}
                  </span>
                )}

                {/* Error count */}
                {group.runs.filter((r) => r.status === 'failed').length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 font-medium flex items-center gap-1">
                    <X size={12} />
                    {group.runs.filter((r) => r.status === 'failed').length}
                  </span>
                )}
              </div>
            </button>

            {/* Group runs */}
            {isExpanded && (
              <div
                className="space-y-3 pl-6"
                style={{
                  animation: `slideIn 0.${Math.min(2 + groupIndex, 5)}s ease-out`
                }}
              >
                {group.runs.map((run) => (
                  <RunHistoryCard
                    key={run.runId}
                    run={run}
                    onRerun={onRerun}
                    onRerunItem={onRerunItem}
                    onDelete={onDelete}
                    onViewDetails={onViewDetails}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
