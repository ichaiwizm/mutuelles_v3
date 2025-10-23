import React from 'react'
import { LayoutGrid, Server, Activity } from 'lucide-react'
import type { ExecutionItem } from '../../../hooks/useAutomation'
import type { GroupingMode } from '../../../utils/executionGrouping'
import { groupExecutionItems } from '../../../utils/executionGrouping'
import ExecutionFolder from './ExecutionFolder'

interface ExecutionFoldersViewProps {
  items: ExecutionItem[]
  groupingMode: GroupingMode
  onGroupingModeChange: (mode: GroupingMode) => void
  onViewDetails?: (
    runId: string,
    itemId: string,
    runDir: string,
    leadName: string,
    platformName: string,
    flowName: string
  ) => void
  onRetryItem?: (itemId: string) => void
  isRunning?: boolean
}

export default function ExecutionFoldersView({
  items,
  groupingMode,
  onGroupingModeChange,
  onViewDetails,
  onRetryItem,
  isRunning
}: ExecutionFoldersViewProps) {
  const groups = groupExecutionItems(items, groupingMode)

  const groupingOptions: Array<{
    value: GroupingMode
    label: string
    icon: typeof LayoutGrid
  }> = [
    { value: 'flow', label: 'Par Flow', icon: LayoutGrid },
    { value: 'platform', label: 'Par Plateforme', icon: Server },
    { value: 'status', label: 'Par Statut', icon: Activity }
  ]

  return (
    <div className="space-y-4">
      {/* Grouping Mode Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Grouper par:
        </span>
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
          {groupingOptions.map(option => {
            const Icon = option.icon
            const isActive = groupingMode === option.value

            return (
              <button
                key={option.value}
                onClick={() => onGroupingModeChange(option.value)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all
                  ${
                    isActive
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }
                `}
              >
                <Icon size={14} />
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Folders List */}
      <div className="space-y-3">
        {groups.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            Aucune exécution à afficher
          </div>
        ) : (
          groups.map(group => (
            <ExecutionFolder
              key={group.key}
              group={group}
              defaultExpanded={false}
              onViewDetails={onViewDetails}
              onRetryItem={onRetryItem}
              isRunning={isRunning}
            />
          ))
        )}
      </div>
    </div>
  )
}
