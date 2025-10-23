import React, { useMemo, useState } from 'react'
import { Activity } from 'lucide-react'
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
  onRerunHistory?: (runId: string) => void
  onRerunHistoryItem?: (item: ExecutionHistoryItem) => void
  onDeleteHistory?: (runId: string) => void
  // For time estimation
  flows?: Flow[]
  concurrency?: number
  // For replay
  onPrepareReplayFromErrors?: (failedItems: ExecutionItem[]) => void
  onEditLead?: (leadId: string) => void
  // For requeue
  onRetryItem?: (itemId: string) => void
  onRetryFailedItems?: (itemIds: string[]) => void
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
  flows = [],
  concurrency = 2,
  onPrepareReplayFromErrors,
  onEditLead,
  onRetryItem,
  onRetryFailedItems
}: ExecutionDashboardProps) {
  const items = executionItems
  const [groupingMode, setGroupingMode] = useState<'flow' | 'platform' | 'status'>('flow')
  const currentStats = useMemo(() => calculateExecutionStats(items), [items])
  // Show current view ONLY while a run is actually running.
  // Finished runs basculent directement dans l'historique (Option A).
  const showCurrent = isRunning
  const showHistory = true

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <div className="flex items-center gap-3">
          <Activity className="text-blue-600 dark:text-blue-400" size={20} />
          <h3 className="font-semibold">Exécutions</h3>
        </div>
      </div>

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
        />
      )}

      {/* History View - always shown below */}
      {showHistory && (
        <ExecutionHistoryView
          runHistory={runHistory}
          onRerunHistory={onRerunHistory!}
          onRerunHistoryItem={onRerunHistoryItem!}
          onDeleteHistory={onDeleteHistory!}
        />
      )}
    </div>
  )
}
