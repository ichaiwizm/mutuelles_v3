import React, { useMemo } from 'react'
import { Play, Activity, History as HistoryIcon } from 'lucide-react'
import ExecutionCurrentView from './ExecutionCurrentView'
import ExecutionHistoryView from './ExecutionHistoryView'
import { useDashboardState } from '../../../hooks/automation/useDashboardState'
import type { ExecutionItem, Flow } from '../../../hooks/useAutomation'
import type { RunHistoryItem, ExecutionHistoryItem } from '../../../../shared/types/automation'

interface ExecutionDashboardProps {
  runId: string
  executionItems: Map<string, ExecutionItem>
  runHistory: RunHistoryItem[]
  isRunning: boolean
  onStopExecution?: () => void
  onRerunHistory?: (runId: string) => void
  onRerunHistoryItem?: (item: ExecutionHistoryItem) => void
  onDeleteHistory?: (runId: string) => void
  onClearAllHistory?: () => void
  onClearCompletedExecutions?: () => void
  // For time estimation
  flows?: Flow[]
  concurrency?: number
  // For replay
  onPrepareReplayFromErrors?: (failedItems: ExecutionItem[]) => void
  onEditLead?: (leadId: string) => void
}

/**
 * Main execution dashboard orchestrator
 * Routes between current execution view and history view
 */
export default function ExecutionDashboard({
  runId,
  executionItems,
  runHistory,
  isRunning,
  onStopExecution,
  onRerunHistory,
  onRerunHistoryItem,
  onDeleteHistory,
  onClearAllHistory,
  onClearCompletedExecutions,
  flows = [],
  concurrency = 2,
  onPrepareReplayFromErrors,
  onEditLead
}: ExecutionDashboardProps) {
  const items = useMemo(() => Array.from(executionItems.values()), [executionItems])

  // Handler for mode change - clear completed executions when switching views
  const handleModeChange = (newMode: any) => {
    if (onClearCompletedExecutions) {
      onClearCompletedExecutions()
    }
  }

  // Dashboard state management
  const {
    mode,
    viewMode,
    groupingMode,
    setMode,
    setViewMode,
    setGroupingMode,
    currentStats,
    showCurrent,
    showHistory,
    isRunning: dashboardIsRunning
  } = useDashboardState({ items, isRunning, onModeChange: handleModeChange })

  const showHistorySection = showHistory && runHistory.length > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="text-blue-600 dark:text-blue-400" size={20} />
            <h3 className="font-semibold">Exécutions</h3>
          </div>

          {/* Mode Toggle - Simplified 2-state toggle */}
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-md p-1">
            <button
              onClick={() => setMode('current')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                mode === 'current'
                  ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
              disabled={items.length === 0}
              title="Afficher les exécutions en cours"
            >
              En cours
            </button>
            <button
              onClick={() => setMode('history')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                mode === 'history'
                  ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
              disabled={runHistory.length === 0}
              title="Afficher l'historique des exécutions"
            >
              <HistoryIcon size={14} />
              Historique
            </button>
          </div>
        </div>
      </div>

      {/* Current Execution View */}
      {showCurrent && (
        <ExecutionCurrentView
          runId={runId}
          items={items}
          currentStats={currentStats}
          viewMode={viewMode}
          groupingMode={groupingMode}
          isRunning={dashboardIsRunning}
          onViewModeChange={setViewMode}
          onGroupingModeChange={setGroupingMode}
          onStopExecution={onStopExecution}
          flows={flows}
          runHistory={runHistory}
          concurrency={concurrency}
          onReplayFailures={onPrepareReplayFromErrors}
          onEditLead={onEditLead}
        />
      )}

      {/* History View */}
      {showHistorySection && (
        <ExecutionHistoryView
          runHistory={runHistory}
          onRerunHistory={onRerunHistory!}
          onRerunHistoryItem={onRerunHistoryItem!}
          onDeleteHistory={onDeleteHistory!}
          onClearAllHistory={onClearAllHistory!}
        />
      )}

      {/* Empty State */}
      {items.length === 0 && runHistory.length === 0 && (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center">
          <Play className="mx-auto mb-3 text-neutral-400" size={48} />
          <h3 className="font-semibold mb-1">Aucune exécution</h3>
          <p className="text-sm text-neutral-500">
            Les exécutions apparaîtront ici une fois démarrées
          </p>
        </div>
      )}
    </div>
  )
}
