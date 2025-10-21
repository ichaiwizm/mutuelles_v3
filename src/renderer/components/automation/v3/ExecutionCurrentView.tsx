import React, { useMemo, useState } from 'react'
import { Square, Grid3x3, FolderKanban, Clock, Play, Check, X } from 'lucide-react'
import ExecutionItemCard from './ExecutionItemCard'
import ExecutionFoldersView from './ExecutionFoldersView'
import RunDetailsModal from './RunDetailsModal'
import GlobalTimeTracker from './GlobalTimeTracker'
import ReplayFailuresButton from './ReplayFailuresButton'
import ReplayFailuresModal from './ReplayFailuresModal'
import type { ExecutionItem, Flow } from '../../../hooks/useAutomation'
import type { GroupingMode } from '../../../utils/executionGrouping'
import type { ViewMode } from '../../../hooks/automation/useDashboardState'
import type { RunHistoryItem } from '../../../../shared/types/automation'
import { useRunDetails } from '../../../hooks/useRunDetails'
import { estimateRemainingTime, estimateFlowDuration } from '../../../services/timeEstimationService'

interface CurrentStats {
  total: number
  pending: number
  running: number
  success: number
  error: number
  completed: number
  progress: number
}

interface ExecutionCurrentViewProps {
  runId: string
  items: ExecutionItem[]
  currentStats: CurrentStats
  viewMode: ViewMode
  groupingMode: GroupingMode
  isRunning: boolean
  onViewModeChange: (mode: ViewMode) => void
  onGroupingModeChange: (mode: GroupingMode) => void
  onStopExecution?: () => void
  // Optional props for time estimation
  flows?: Flow[]
  runHistory?: RunHistoryItem[]
  concurrency?: number
  // Optional props for replay
  onReplayFailures?: (failedItems: ExecutionItem[]) => void
  onEditLead?: (leadId: string) => void
}

/**
 * Displays the current execution run with progress tracking and stats
 */
export default function ExecutionCurrentView({
  runId,
  items,
  currentStats,
  viewMode,
  groupingMode,
  isRunning,
  onViewModeChange,
  onGroupingModeChange,
  onStopExecution,
  flows = [],
  runHistory = [],
  concurrency = 2,
  onReplayFailures,
  onEditLead
}: ExecutionCurrentViewProps) {
  const { selectedRunDetails, handleViewDetails, clearDetails } = useRunDetails()
  const [showReplayModal, setShowReplayModal] = useState(false)

  // Calculate remaining time estimate
  const remainingTime = useMemo(() => {
    if (!isRunning || currentStats.pending === 0) {
      return { durationMs: 0, confidence: 'high' as const, source: 'history' as const }
    }

    // Get unique flow slugs from items
    const flowSlugs = Array.from(new Set(items.map(item => item.flowSlug).filter(Boolean))) as string[]

    return estimateRemainingTime(
      currentStats.pending,
      currentStats.running,
      currentStats.success + currentStats.error,
      concurrency,
      runHistory,
      flows,
      flowSlugs
    )
  }, [isRunning, currentStats, items, concurrency, runHistory, flows])

  // Calculate estimated duration for each pending item
  const itemEstimates = useMemo(() => {
    const estimates = new Map<string, number>()

    items.filter(item => item.status === 'pending' && item.flowSlug).forEach(item => {
      const estimate = estimateFlowDuration(item.flowSlug!, runHistory, flows)
      estimates.set(item.id, estimate.durationMs)
    })

    return estimates
  }, [items, runHistory, flows])

  // Filter failed items for replay
  const failedItems = useMemo(() => {
    return items.filter(item => item.status === 'error')
  }, [items])

  // Handle replay all failures
  const handleReplayAll = () => {
    if (onReplayFailures && failedItems.length > 0) {
      onReplayFailures(failedItems)
    }
  }

  return (
    <>
      {/* Compact Progress Header */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
        {/* Header row with controls */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3 text-xs">
            {runId && items.length > 0 && (
              <>
                <span className="text-neutral-500">Run #{runId.slice(0, 8)}</span>
                <span className="text-neutral-400">·</span>
              </>
            )}
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {currentStats.progress}%
            </span>
            {isRunning && remainingTime.durationMs > 0 && (
              <>
                <span className="text-neutral-400">·</span>
                <GlobalTimeTracker remainingTime={remainingTime} showEndTime={true} />
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Replay Failures Button */}
            {!isRunning && onReplayFailures && (
              <ReplayFailuresButton
                errorCount={failedItems.length}
                onClick={() => setShowReplayModal(true)}
              />
            )}

            {/* View Toggle */}
            {items.length > 0 && (
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded p-0.5">
                <button
                  onClick={() => onViewModeChange('grid')}
                  className={`p-1 rounded transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                  title="Vue grille"
                >
                  <Grid3x3 size={14} />
                </button>
                <button
                  onClick={() => onViewModeChange('folders')}
                  className={`p-1 rounded transition-all ${
                    viewMode === 'folders'
                      ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                  title="Vue dossiers"
                >
                  <FolderKanban size={14} />
                </button>
              </div>
            )}

            {/* Stop button - visible while execution is running */}
            {isRunning && onStopExecution && (
              <button
                onClick={onStopExecution}
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              >
                <Square size={14} />
                Arrêter
              </button>
            )}
          </div>
        </div>

        {/* Compact progress bar and stats in one line */}
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
              style={{ width: `${currentStats.progress}%` }}
            />
          </div>

          {/* Inline stats */}
          <div className="flex items-center gap-3 text-xs flex-shrink-0">
            <span className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400" title="En attente">
              <Clock size={12} />
              {currentStats.pending}
            </span>
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400" title="En cours">
              <Play size={12} className="fill-current" />
              {currentStats.running}
            </span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400" title="Réussis">
              <Check size={12} />
              {currentStats.success}
            </span>
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400" title="Échoués">
              <X size={12} />
              {currentStats.error}
            </span>
          </div>
        </div>
      </div>

      {/* Empty/Initialization State */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-3">
            <Play className={`text-blue-600 dark:text-blue-400 ${isRunning ? 'animate-pulse' : ''}`} size={24} />
          </div>
          <h3 className="font-semibold mb-1">
            {isRunning ? 'Initialisation...' : 'Aucune automation en cours'}
          </h3>
          <p className="text-sm text-neutral-500">
            {isRunning
              ? 'Préparation des exécutions en cours'
              : 'Les automations apparaîtront ici une fois démarrées'
            }
          </p>
        </div>
      ) : (
        /* Execution Items */
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <ExecutionItemCard
                  key={item.id}
                  item={item}
                  onViewDetails={handleViewDetails}
                  estimatedDurationMs={itemEstimates.get(item.id)}
                />
              ))}
            </div>
          ) : (
            <ExecutionFoldersView
              items={items}
              groupingMode={groupingMode}
              onGroupingModeChange={onGroupingModeChange}
              onViewDetails={handleViewDetails}
            />
          )}
        </>
      )}

      {/* Details Modal */}
      {selectedRunDetails && (
        <RunDetailsModal
          runDir={selectedRunDetails.runDir}
          leadName={selectedRunDetails.leadName}
          platformName={selectedRunDetails.platformName}
          flowName={selectedRunDetails.flowName}
          onClose={clearDetails}
        />
      )}

      {/* Replay Failures Modal */}
      <ReplayFailuresModal
        isOpen={showReplayModal}
        onClose={() => setShowReplayModal(false)}
        failedItems={failedItems}
        onReplayAll={handleReplayAll}
        onEditLead={onEditLead}
      />
    </>
  )
}
