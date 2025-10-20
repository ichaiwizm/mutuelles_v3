import React, { useState } from 'react'
import { Rocket } from 'lucide-react'
import LeadSelector from './LeadSelector'
import AutoPreviewModal from './AutoPreviewModal'
import ExecutionDashboard from './ExecutionDashboard'
import FlowsBrowserPanel from './FlowsBrowserPanel'
import FlowTestModal from './FlowTestModal'
import FlowDetailsModal from './FlowDetailsModal'
import type { Lead, Platform, Flow, ExecutionItem, AdvancedSettings } from '../../../hooks/useAutomation'

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

  // Execution
  isRunning: boolean
  runId: string | null
  executionItems: Map<string, ExecutionItem>
  totalExecutions: number
  onStartRun: (mode: 'headless' | 'dev' | 'dev_private') => Promise<string | void>
  onStopExecution?: () => void

  // Settings
  settings: AdvancedSettings
  onUpdateSettings: (settings: AdvancedSettings) => void

  // Helpers
  getLeadName: (leadId: string) => string
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
  isRunning,
  runId,
  executionItems,
  totalExecutions,
  onStartRun,
  onStopExecution,
  settings,
  onUpdateSettings,
  getLeadName
}: AdvancedModeTabProps) {
  const [showAutoPreview, setShowAutoPreview] = useState(false)
  const [selectedDetailsFlow, setSelectedDetailsFlow] = useState<Flow | null>(null)
  const [selectedTestFlow, setSelectedTestFlow] = useState<Flow | null>(null)

  // Get selected leads and flows for preview
  const selectedLeads = leads.filter((lead) => selectedLeadIds.has(lead.id))
  const selectedFlows = flows.filter((flow) => selectedFlowIds.has(flow.slug))

  const canStart = selectedLeadIds.size > 0 && selectedFlowIds.size > 0

  // Map settings mode to API expected mode
  const getModeForAPI = (mode: AdvancedSettings['mode']): 'headless' | 'dev' | 'dev_private' => {
    switch (mode) {
      case 'headless':
        return 'headless'
      case 'headless-minimized':
        return 'dev' // Use dev mode for headless-minimized
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
            />

            <FlowsBrowserPanel
              platforms={platforms}
              flows={flows}
              selectedFlowIds={selectedFlowIds}
              onToggleFlow={onToggleFlow}
              onTogglePlatform={onTogglePlatform}
              onViewFlow={(flow) => setSelectedDetailsFlow(flow)}
              settings={settings}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center">
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

      {/* Execution Dashboard */}
      {isRunning && runId && (
        <ExecutionDashboard
          runId={runId}
          executionItems={executionItems}
          onStopExecution={onStopExecution}
        />
      )}

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
        onLaunchTest={(flow) => {
          setSelectedDetailsFlow(null)
          setSelectedTestFlow(flow)
        }}
      />

      {selectedTestFlow && (
        <FlowTestModal
          isOpen={true}
          onClose={() => setSelectedTestFlow(null)}
          flow={selectedTestFlow}
          leads={leads}
        />
      )}
    </div>
  )
}
