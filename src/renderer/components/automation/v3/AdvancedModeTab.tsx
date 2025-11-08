import React, { useState, useMemo } from 'react'
import { Rocket } from 'lucide-react'
import LeadSelector from './LeadSelector'
import AutoPreviewModal from './AutoPreviewModal'
import ExecutionDashboard from './ExecutionDashboard'
import FlowsBrowserPanel from './FlowsBrowserPanel'
import FlowDetailsModal from './FlowDetailsModal'
import DuplicateWarningBanner from './DuplicateWarningBanner'
import { detectDuplicates, excludeDuplicates } from '../../../services/duplicateDetector'
import { estimateTotalDuration, formatDuration } from '../../../services/timeEstimationService'
import type { Lead, Platform, Flow, ExecutionItem, AdvancedSettings } from '../../../hooks/useAutomation'
import type { RunHistoryItem, ExecutionHistoryItem } from '../../../../shared/types/automation'

interface AdvancedModeTabProps {
  // Data
  leads: Lead[]
  platforms: Platform[]
  flows: Flow[]

  // Selection
  selectedLeadIds: Set<string>
  selectedFlowIds: Set<string>
  onToggleLead: (id: string) => void
  onToggleFlow: (id: string) => void
  onTogglePlatform: (slug: string) => void
  onSelectAllLeads: () => void
  onClearLeadSelection: () => void
  onSelectAllFlows: () => void
  onClearFlowSelection: () => void

  // Execution
  isRunning: boolean
  runId: string | null
  executionItems: ExecutionItem[]
  totalExecutions: number
  onStartRun: (mode: 'headless' | 'dev' | 'dev_private') => Promise<string | void>
  onStopExecution?: () => void
  onClearCompletedExecutions?: () => void

  // History
  runHistory: RunHistoryItem[]
  onRerunHistory: (runId: string) => void
  onRerunHistoryItem: (item: ExecutionHistoryItem) => void
  onDeleteHistory: (runId: string) => void
  onDeleteAllHistory?: () => void

  // Settings
  settings: AdvancedSettings
  onUpdateSettings: (settings: AdvancedSettings) => void

  // Helpers
  getLeadName: (leadId: string) => string

  // Replay
  onPrepareReplayFromErrors?: (failedItems: ExecutionItem[]) => void
  onEditLead?: (leadId: string) => void

  // Requeue
  onRetryItem?: (itemId: string) => void
  onRetryFailedItems?: (itemIds: string[]) => void
  onStopItem?: (itemId: string) => void
  onTogglePauseItem?: (itemId: string) => void
  // Active run mode to control headed/headless UI
  activeRunMode?: string
}

export default function AdvancedModeTab({
  leads,
  platforms,
  flows,
  selectedLeadIds,
  selectedFlowIds,
  onToggleLead,
  onToggleFlow,
  onTogglePlatform,
  onSelectAllLeads,
  onClearLeadSelection,
  onSelectAllFlows,
  onClearFlowSelection,
  isRunning,
  runId,
  executionItems,
  totalExecutions,
  onStartRun,
  onStopExecution,
  onClearCompletedExecutions,
  runHistory,
  onRerunHistory,
  onRerunHistoryItem,
  onDeleteHistory,
  onDeleteAllHistory,
  settings,
  onUpdateSettings,
  getLeadName,
  onPrepareReplayFromErrors,
  onEditLead,
  onRetryItem,
  onRetryFailedItems,
  onStopItem,
  onTogglePauseItem,
  activeRunMode
}: AdvancedModeTabProps) {
  const [showAutoPreview, setShowAutoPreview] = useState(false)
  const [selectedDetailsFlow, setSelectedDetailsFlow] = useState<Flow | null>(null)

  // Get selected leads and flows for preview
  const selectedLeads = leads.filter((lead) => selectedLeadIds.has(lead.id))
  const selectedFlows = flows.filter((flow) => selectedFlowIds.has(flow.slug))

  const canStart = selectedLeadIds.size > 0 && selectedFlowIds.size > 0

  // Detect duplicates
  const duplicateDetection = useMemo(() => {
    return detectDuplicates(
      Array.from(selectedLeadIds),
      Array.from(selectedFlowIds),
      runHistory,
      getLeadName
    )
  }, [selectedLeadIds, selectedFlowIds, runHistory, getLeadName])

  // Handle exclude duplicates
  const handleExcludeDuplicates = () => {
    const { leadIds } = excludeDuplicates(
      selectedLeadIds,
      selectedFlowIds,
      duplicateDetection.duplicates
    )

    // Clear and re-select leads without duplicates
    onClearLeadSelection()
    leadIds.forEach(leadId => onToggleLead(leadId))
  }

  // Calculate total estimated duration
  const totalEstimate = useMemo(() => {
    if (selectedLeadIds.size === 0 || selectedFlowIds.size === 0) {
      return null
    }

    return estimateTotalDuration(
      selectedLeadIds.size,
      Array.from(selectedFlowIds),
      settings.concurrency,
      runHistory,
      flows
    )
  }, [selectedLeadIds, selectedFlowIds, settings.concurrency, runHistory, flows])

  // Map settings mode to API expected mode
  const getModeForAPI = (mode: AdvancedSettings['mode']): 'headless' | 'dev' | 'dev_private' => {
    switch (mode) {
      case 'headless':
        return 'headless'
      case 'headless-minimized':
        return 'dev' // headed + minimized via CDP
      case 'visible':
        return 'dev'
      default:
        return 'headless'
    }
  }

  const handleStartClick = () => {
    if (!canStart) return

    // Check if preview should be shown
    if (settings.showPreviewBeforeRun) {
      setShowAutoPreview(true)
    } else {
      handleStartRun()
    }
  }

  const handleStartRun = async () => {
    if (!canStart) return
    const apiMode = getModeForAPI(settings.mode)
    await onStartRun(apiMode)
  }

  const handleConfirmPreview = () => {
    setShowAutoPreview(false)
    handleStartRun()
  }

  return (
    <div className="space-y-6 py-6">
      {!isRunning && (
        <>
          {/* Two columns: Leads + Flows */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LeadSelector
              leads={leads}
              selectedLeadIds={selectedLeadIds}
              onToggleLead={onToggleLead}
              onSelectAll={onSelectAllLeads}
              onClearSelection={onClearLeadSelection}
              getLeadName={getLeadName}
              selectedFlowSlugs={Array.from(selectedFlowIds)}
              runHistory={runHistory}
            />

            <FlowsBrowserPanel
              platforms={platforms}
              flows={flows}
              selectedFlowIds={selectedFlowIds}
              onToggleFlow={onToggleFlow}
              onTogglePlatform={onTogglePlatform}
              onSelectAllFlows={onSelectAllFlows}
              onClearFlowSelection={onClearFlowSelection}
              onViewFlow={(flow) => setSelectedDetailsFlow(flow)}
              settings={settings}
            />
          </div>

          {/* Duplicate Warning */}
          {duplicateDetection.hasDuplicates && (
            <DuplicateWarningBanner
              duplicates={duplicateDetection.duplicates}
              onExcludeDuplicates={handleExcludeDuplicates}
            />
          )}

          {/* Action buttons */}
          <div className="flex flex-col items-center gap-2">
            {/* Start Button */}
            <button
              onClick={handleStartClick}
              disabled={!canStart}
              className={`flex items-center gap-2 px-6 py-3 text-base font-semibold rounded-md transition-all shadow-md ${
                canStart
                  ? 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-lg hover:scale-105'
                  : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Rocket size={20} />
              Démarrer {totalExecutions} exécution{totalExecutions > 1 ? 's' : ''}
            </button>

            {/* Estimated duration */}
            {totalEstimate && canStart && (
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Durée estimée: ~{formatDuration(totalEstimate.durationMs)}
              </div>
            )}
          </div>

          {/* Info message */}
          {!canStart && (
            <div className="text-center">
              <p className="text-sm text-neutral-500">
                Sélectionnez au moins un lead et un flow pour commencer
              </p>
            </div>
          )}
        </>
      )}

      {/* Execution Dashboard (always show) */}
      <ExecutionDashboard
        runId={runId || ''}
        executionItems={executionItems}
        runHistory={runHistory}
        isRunning={isRunning}
        onStopExecution={onStopExecution}
        onRerunHistory={onRerunHistory}
        onRerunHistoryItem={onRerunHistoryItem}
        onDeleteHistory={onDeleteHistory}
        onDeleteAllHistory={onDeleteAllHistory}
        onClearCompletedExecutions={onClearCompletedExecutions}
        flows={flows}
        concurrency={settings.concurrency}
        onPrepareReplayFromErrors={onPrepareReplayFromErrors}
        onEditLead={onEditLead}
        onRetryItem={onRetryItem}
        onRetryFailedItems={onRetryFailedItems}
        onStopItem={onStopItem}
        onTogglePauseItem={onTogglePauseItem}
        activeRunMode={activeRunMode}
        settingsMode={settings.mode}
      />

      {/* Modals */}
      <AutoPreviewModal
        isOpen={showAutoPreview}
        onClose={() => setShowAutoPreview(false)}
        onConfirm={handleConfirmPreview}
        selectedLeads={selectedLeads}
        selectedFlows={selectedFlows}
        totalExecutions={totalExecutions}
        getLeadName={getLeadName}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
      />

      <FlowDetailsModal
        isOpen={!!selectedDetailsFlow}
        onClose={() => setSelectedDetailsFlow(null)}
        flow={selectedDetailsFlow}
      />
    </div>
  )
}
