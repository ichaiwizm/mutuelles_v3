import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSettings } from './automation/useSettings'
import { useHistory } from './automation/useHistory'
import { useSelection } from './automation/useSelection'
import { useExecution, type ExecutionItem } from './automation/useExecution'
import { createLogger } from '../services/logger'

const logger = createLogger('useAutomation')

// Re-export types for backwards compatibility
export type { AdvancedSettings } from '../../shared/settings'
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
  stepsCount?: number
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
  const [leads, setLeads] = useState<Lead[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [flows, setFlows] = useState<Flow[]>([])

  const loadData = useCallback(async () => {
    try {
      const platformsList = await window.api.catalog.list()
      setPlatforms(platformsList.filter(p => p.selected))

      const leadsResponse = await window.api.leads.list({}, { limit: 100 })
      if (leadsResponse.success) {
        setLeads(leadsResponse.data.items || [])
      }

      const flowsResponse = await window.api.scenarios.listFlows()
      if (flowsResponse.success && flowsResponse.data) {
        // Flatten the platform-grouped structure into a flat array of flows
        const flowsList = flowsResponse.data.flatMap(platformGroup =>
          platformGroup.flows.map(flow => ({
            platform: platformGroup.platform,
            slug: flow.slug,
            name: flow.name,
            file: flow.file,
            stepsCount: flow.stepsCount
          }))
        )
        setFlows(flowsList)
      }
    } catch (error) {
      logger.error('[useAutomation] Failed to load data:', error)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const { settings, updateSettings: updateSettingsBase, resetSettings } = useSettings()

  const selection = useSelection({
    leads,
    flows,
    settings
  })

  const history = useHistory()

  const execution = useExecution(
    settings,
    (runId: string) => {
      history.loadHistory()
    }
  )

  const toggleItemPause = useCallback(async (itemId: string) => {
    const item = execution.items.find(i => i.id === itemId)
    if (!item) return
    if (item.isPaused) await execution.resumeItem(itemId)
    else await execution.pauseItem(itemId)
  }, [execution.items, execution])

  useEffect(() => {
    history.loadHistory()
  }, [])

  const startRun = useCallback(async (mode: 'headless' | 'dev' | 'dev_private' = 'headless') => {
    return execution.startRun(
      selection.selectedLeadIds,
      selection.selectedFlows,
      mode
    )
  }, [execution, selection.selectedLeadIds, selection.selectedFlows])

  const updateSettings = useCallback((
    partial: Partial<import('../../shared/settings').AdvancedSettings>,
    newlyHiddenFlows?: string[]
  ) => {
    updateSettingsBase(partial)

    if (newlyHiddenFlows && newlyHiddenFlows.length > 0) {
      selection.deselectFlows(newlyHiddenFlows)
    }
  }, [updateSettingsBase, selection])

  const getLeadName = useCallback((leadId: string): string => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return leadId.slice(0, 8)
    const firstName = lead.data?.subscriber?.firstName || ''
    const lastName = lead.data?.subscriber?.lastName || ''
    return `${firstName} ${lastName}`.trim() || leadId.slice(0, 8)
  }, [leads])

  const rerunHistoryRun = useCallback(async (historyRunId: string) => {
    const historyRun = history.runHistory.find(r => r.runId === historyRunId)
    if (!historyRun) {
      throw new Error(`Run ${historyRunId} not found in history`)
    }

    const items = await history.getRunItems(historyRunId)

    const leadIds = [...new Set(items.map((i: any) => i.lead_id).filter(Boolean))]
    const flowSlugs = [...new Set(items.map((i: any) => i.flow_slug).filter(Boolean))]

    selection.updateLeadSelection(new Set(leadIds))
    selection.updateFlowSelection(new Set(flowSlugs))

    const mode = historyRun.mode as 'headless' | 'dev' | 'dev_private'
    await startRun(mode)

  }, [history, selection, startRun])

  const rerunSingleItem = useCallback(async (item: import('../../shared/types/automation').ExecutionHistoryItem) => {
    selection.updateLeadSelection(new Set([item.leadId]))
    selection.updateFlowSelection(new Set([item.flowSlug]))

    const mode: 'headless' | 'dev' | 'dev_private' =
      settings.mode === 'visible' ? 'dev' :
      settings.mode === 'headless-minimized' ? 'headless' :
      'headless'

    await startRun(mode)

  }, [selection, settings.mode, startRun])

  const prepareReplayFromErrors = useCallback((failedItems: ExecutionItem[]) => {
    const leadIds = [...new Set(failedItems.map(i => i.leadId))]
    const flowSlugs = [...new Set(failedItems.map(i => i.flowSlug).filter(Boolean) as string[])]

    selection.updateLeadSelection(new Set(leadIds))
    selection.updateFlowSelection(new Set(flowSlugs))

  }, [selection])

  return {
    leads,
    platforms,
    flows,

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

    activeRun: execution.activeRun,
    executionItems: execution.items,
    runId: execution.runId,
    isRunning: execution.isRunning,
    totalExecutions: selection.totalExecutions,
    startRun,
    stopRun: execution.stopRun,
    stopItem: execution.stopItem,
    toggleItemPause,
    clearExecution: execution.clearExecution,
    requeueItem: execution.requeueItem,
    requeueItems: execution.requeueItems,
    getErrorItems: execution.getErrorItems,

    getLeadName,

    settings,
    updateSettings,
    resetSettings,

    runHistory: history.runHistory,
    rerunHistoryRun,
    rerunSingleItem,
    deleteHistoryRun: history.deleteHistoryRun,
    deleteAllRuns: history.deleteAllRuns,
    loadHistory: history.loadHistory,

    prepareReplayFromErrors
  }
}
