import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSettings } from './automation/useSettings'
import { useHistory } from './automation/useHistory'
import { useSelection } from './automation/useSelection'
import { useExecution, type ExecutionItem } from './automation/useExecution'

// Re-export types for backwards compatibility
export type { AdvancedSettings } from './automation/useSettings'
export type { ExecutionItem } from './automation/useExecution'

export type Lead = {
  id: string
  data: {
    subscriber?: {
      firstName?: string
      lastName?: string
      civility?: string
      email?: string
      telephone?: string
    }
  }
  createdAt?: string
  metadata?: Record<string, any>
}

export type Platform = {
  id: number
  slug: string
  name: string
  selected: boolean
  has_creds: boolean
}

export type Flow = {
  platform: string
  slug: string
  name: string
  file: string
}

/**
 * Main orchestrator hook for automation system
 *
 * Responsibilities:
 * - Load initial data (leads, platforms, flows)
 * - Coordinate between sub-hooks (settings, history, selection, execution)
 * - Provide unified API for consumers
 * - Handle settings updates with side effects
 *
 * Architecture:
 * - useSettings: Manage automation settings
 * - useHistory: Manage run history persistence
 * - useSelection: Manage lead and flow selection
 * - useExecution: Manage execution state and progress
 *
 * @returns Unified automation API
 */
export function useAutomation() {
  // ============================================================
  // DATA LOADING
  // ============================================================

  const [leads, setLeads] = useState<Lead[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [flows, setFlows] = useState<Flow[]>([])

  /**
   * Load initial data from IPC APIs
   */
  const loadData = useCallback(async () => {
    try {
      // Load platforms (only selected ones)
      const platformsList = await window.api.catalog.list()
      setPlatforms(platformsList.filter(p => p.selected))

      // Load leads
      const leadsResponse = await window.api.leads.list({}, { limit: 100 })
      if (leadsResponse.success) {
        setLeads(leadsResponse.data.items || [])
      }

      // Load flows
      const flowsList = await window.api.adminHL.listHLFlows()
      setFlows(flowsList)
    } catch (error) {
      console.error('[useAutomation] Failed to load data:', error)
    }
  }, [])

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [loadData])

  // ============================================================
  // SUB-HOOKS (SPECIALIZED RESPONSIBILITIES)
  // ============================================================

  // Settings management
  const { settings, updateSettings: updateSettingsBase, resetSettings } = useSettings()

  // Selection management
  const selection = useSelection({
    leads,
    flows,
    settings
  })

  // History management
  const history = useHistory()

  // Execution management (with callback to save to history when run completes)
  const execution = useExecution(
    leads,
    flows,
    platforms,
    settings,
    (executionItems, runId) => {
      // Save to history when run completes or is cancelled
      history.saveRunToHistory(runId, executionItems, settings)
    }
  )

  // Load history on mount
  useEffect(() => {
    history.loadHistory()
  }, [history])

  // ============================================================
  // COORDINATED ACTIONS
  // ============================================================

  /**
   * Start automation run
   * Delegates to execution hook with selected items
   */
  const startRun = useCallback(async (mode: 'headless' | 'dev' | 'dev_private' = 'headless') => {
    return execution.startRun(
      selection.selectedLeadIds,
      selection.selectedFlows,
      mode
    )
  }, [execution, selection.selectedLeadIds, selection.selectedFlows])

  /**
   * Update settings with side effects
   * Deselects newly hidden flows
   */
  const updateSettings = useCallback((
    partial: Partial<import('./automation/useSettings').AdvancedSettings>,
    newlyHiddenFlows?: string[]
  ) => {
    updateSettingsBase(partial)

    // Clean selection: deselect newly hidden flows
    if (newlyHiddenFlows && newlyHiddenFlows.length > 0) {
      console.log('[useAutomation] Deselecting newly hidden flows:', newlyHiddenFlows)
      selection.deselectFlows(newlyHiddenFlows)
    }
  }, [updateSettingsBase, selection])

  /**
   * Helper to get formatted lead name
   */
  const getLeadName = useCallback((leadId: string): string => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return leadId.slice(0, 8)
    const firstName = lead.data?.subscriber?.firstName || ''
    const lastName = lead.data?.subscriber?.lastName || ''
    return `${firstName} ${lastName}`.trim() || leadId.slice(0, 8)
  }, [leads])

  /**
   * Rerun a historical run
   * Updates selections and starts new run
   */
  const rerunHistoryRun = useCallback(async (historyRunId: string) => {
    const historyRun = history.runHistory.find(r => r.runId === historyRunId)
    if (!historyRun) {
      throw new Error(`Run ${historyRunId} not found in history`)
    }

    // Extract unique lead IDs and flow slugs
    const leadIds = [...new Set(historyRun.items.map(i => i.leadId))]
    const flowSlugs = [...new Set(historyRun.items.map(i => i.flowSlug))]

    // Update selections
    selection.updateLeadSelection(new Set(leadIds))
    selection.updateFlowSelection(new Set(flowSlugs))

    // Start run with same mode
    const mode = historyRun.settings.mode
    await startRun(mode)

    console.log(`[useAutomation] Rerunning history run ${historyRunId.slice(0, 8)}`)
  }, [history.runHistory, selection, startRun])

  /**
   * Rerun a single execution item
   */
  const rerunSingleItem = useCallback(async (item: import('../../shared/types/automation').ExecutionHistoryItem) => {
    // Set selections for this single item
    selection.updateLeadSelection(new Set([item.leadId]))
    selection.updateFlowSelection(new Set([item.flowSlug]))

    // Convert settings.mode to execution mode
    const mode: 'headless' | 'dev' | 'dev_private' =
      settings.mode === 'visible' ? 'dev' :
      settings.mode === 'headless-minimized' ? 'headless' :
      'headless'

    // Start run with current settings
    await startRun(mode)

    console.log(`[useAutomation] Rerunning single item: ${item.leadName} × ${item.flowName}`)
  }, [selection, settings.mode, startRun])

  /**
   * Prepare replay from failed items
   * Pre-selects leads and flows from failed items without starting immediately
   */
  const prepareReplayFromErrors = useCallback((failedItems: ExecutionItem[]) => {
    // Extract unique lead IDs and flow slugs
    const leadIds = [...new Set(failedItems.map(i => i.leadId))]
    const flowSlugs = [...new Set(failedItems.map(i => i.flowSlug).filter(Boolean) as string[])]

    // Update selections
    selection.updateLeadSelection(new Set(leadIds))
    selection.updateFlowSelection(new Set(flowSlugs))

    console.log(`[useAutomation] Prepared replay for ${failedItems.length} failed items`)
  }, [selection])

  // ============================================================
  // UNIFIED API (BACKWARD COMPATIBLE)
  // ============================================================

  return {
    // Data
    leads,
    platforms,
    flows,

    // Selection (from useSelection)
    selectedLeadIds: selection.selectedLeadIds,
    selectedFlowIds: selection.selectedFlowIds,
    selectedLeads: selection.selectedLeads,
    selectedFlows: selection.selectedFlows,
    toggleLead: selection.toggleLead,
    toggleFlow: selection.toggleFlow,
    togglePlatform: selection.togglePlatform,
    selectAllLeads: selection.selectAllLeads,
    clearLeadSelection: selection.clearLeadSelection,
    selectAllFlows: selection.selectAllFlows,
    clearFlowSelection: selection.clearFlowSelection,

    // Execution (from useExecution)
    executionItems: execution.executionItems,
    runId: execution.runId,
    isRunning: execution.isRunning,
    totalExecutions: selection.totalExecutions,
    startRun,
    clearCompletedExecutions: execution.clearCompletedExecutions,
    requeueItem: execution.requeueItem,
    requeueFailedItems: execution.requeueFailedItems,

    // Helpers
    getLeadName,

    // Settings (from useSettings)
    settings,
    updateSettings,
    resetSettings,

    // History (from useHistory)
    runHistory: history.runHistory,
    rerunHistoryRun,
    rerunSingleItem,
    deleteHistoryRun: history.deleteHistoryRun,
    clearAllHistory: history.clearAllHistory,
    loadHistory: history.loadHistory,

    // Replay
    prepareReplayFromErrors
  }
}
