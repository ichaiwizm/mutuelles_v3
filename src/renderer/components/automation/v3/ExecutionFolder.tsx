import React, { useState } from 'react'
import { ChevronRight, Folder } from 'lucide-react'
import type { ExecutionGroup } from '../../../utils/executionGrouping'
import { getGroupColorConfig, formatGroupStats } from '../../../utils/executionGrouping'
import ExecutionItemCard from './ExecutionItemCard'

interface ExecutionFolderProps {
  group: ExecutionGroup
  defaultExpanded?: boolean
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

export default function ExecutionFolder({
  group,
  defaultExpanded = false,
  onViewDetails,
  onRetryItem,
  isRunning
}: ExecutionFolderProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const colorConfig = getGroupColorConfig(group)
  const statsText = formatGroupStats(group)

  const completedCount = group.success + group.error
  const progressText = `${completedCount}/${group.total}`

  return (
    <div className={`rounded-lg border ${colorConfig.borderColor} overflow-hidden transition-all`}>
      {/* Folder Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full px-4 py-3 ${colorConfig.bgColor} hover:opacity-80 transition-all flex items-center gap-3 text-left`}
      >
        {/* Chevron icon */}
        <ChevronRight
          size={18}
          className={`${colorConfig.iconColor} transition-transform duration-200 flex-shrink-0 ${
            isExpanded ? 'rotate-90' : ''
          }`}
        />

        {/* Folder icon */}
        <Folder size={18} className={`${colorConfig.iconColor} flex-shrink-0`} />

        {/* Group label */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{group.label}</h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
            {statsText}
          </p>
        </div>

        {/* Progress badge */}
        <div className={`${colorConfig.badgeColor} px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0`}>
          {progressText}
        </div>
      </button>

      {/* Folder Content */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[10000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 bg-white dark:bg-neutral-900 space-y-3">
          {group.items.map((item, index) => (
            <div
              key={item.id}
              className="transform transition-all duration-200"
              style={{
                animationDelay: `${index * 30}ms`,
                animation: isExpanded ? 'slideIn 0.2s ease-out' : 'none'
              }}
            >
              <ExecutionItemCard
                item={item}
                onViewDetails={onViewDetails}
                onRetryItem={onRetryItem}
                isRunning={isRunning}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
