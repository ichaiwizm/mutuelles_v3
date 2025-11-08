import React, { useMemo, useState } from 'react'
import ExecutionCurrentView from './ExecutionCurrentView'
import ExecutionHistoryView from './ExecutionHistoryView'
import type { ExecutionItem, Flow } from '../../../hooks/useAutomation'
import type { RunHistoryItem, ExecutionHistoryItem } from '../../../../shared/types/automation'
import { calculateExecutionStats } from '../../../utils/executionStats'

interface ExecutionDashboardProps {
  runId: string
  executionItems: ExecutionItem[]
  runHistory: RunHistoryItem[]
  isRunning: boolean
  onStopExecution?: () => void
  onClearCompletedExecutions?: () => void
  onRerunHistory?: (runId: string) => void
  onRerunHistoryItem?: (item: ExecutionHistoryItem) => void
  onDeleteHistory?: (runId: string) => void
  onDeleteAllHistory?: () => void
  // For time estimation
  flows?: Flow[]
  concurrency?: number
  // For replay
  onPrepareReplayFromErrors?: (failedItems: ExecutionItem[]) => void
  onEditLead?: (leadId: string) => void
  // For requeue
  onRetryItem?: (itemId: string) => void
  onRetryFailedItems?: (itemIds: string[]) => void
  onStopItem?: (itemId: string) => void
  onTogglePauseItem?: (itemId: string) => void
  // Active run mode (to hide window controls in headless)
  activeRunMode?: string
  // Current settings.mode as fallback before activeRun is available
  settingsMode?: 'headless' | 'headless-minimized' | 'visible'
}

export default function ExecutionDashboard({
  runId,
  executionItems,
  runHistory,
  isRunning,
  onStopExecution,
  onRerunHistory,
  onRerunHistoryItem,
  onDeleteHistory,
  onDeleteAllHistory,
  flows = [],
  concurrency = 2,
  onPrepareReplayFromErrors,
  onEditLead,
  onRetryItem,
  onRetryFailedItems,
  onStopItem,
  onTogglePauseItem,
  activeRunMode,
  settingsMode
}: ExecutionDashboardProps) {
  const items = executionItems
  const [groupingMode, setGroupingMode] = useState<'flow' | 'platform' | 'status'>('status')
  const currentStats = useMemo(() => calculateExecutionStats(items), [items])
  const fallbackExecMode = settingsMode === 'headless' ? 'headless' : 'dev'
  const effectiveMode = activeRunMode || fallbackExecMode
  const headedMode = effectiveMode !== 'headless'
  // Show current view ONLY while a run is actually running.
  // Finished runs basculent directement dans l'historique (Option A).
  const showCurrent = isRunning
  const showHistory = true

  return (
    <div className="space-y-4">

      {/* Current Execution View */}
      {showCurrent && (
        <ExecutionCurrentView
          runId={runId}
          items={items}
          currentStats={currentStats}
          groupingMode={groupingMode}
          isRunning={isRunning}
          onGroupingModeChange={setGroupingMode}
          onStopExecution={onStopExecution}
          flows={flows}
          runHistory={runHistory}
          concurrency={concurrency}
          onReplayFailures={onPrepareReplayFromErrors}
          onEditLead={onEditLead}
          onRetryItem={onRetryItem}
          onRetryFailedItems={onRetryFailedItems}
          onStopItem={onStopItem}
          onTogglePauseItem={onTogglePauseItem}
          headedMode={headedMode}
        />
      )}

      {/* History View - always shown below when available */}
      {showHistory && (
        <ExecutionHistoryView
          runHistory={runHistory}
          onRerunHistory={onRerunHistory!}
          onRerunHistoryItem={onRerunHistoryItem!}
          onDeleteHistory={onDeleteHistory!}
          onDeleteAllHistory={onDeleteAllHistory}
        />
      )}
    </div>
  )
}
