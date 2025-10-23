import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Lead, Flow } from '../useAutomation'
import type { AdvancedSettings } from '../../../shared/settings'

export type UseSelectionOptions = {
  leads: Lead[]
  flows: Flow[]
  settings: AdvancedSettings
}

/**
 * Hook for managing lead and flow selection state
 *
 * Handles:
 * - Lead selection (individual, all, clear)
 * - Flow selection (individual, all, clear, by platform)
 * - Visibility filtering (auto-deselect hidden flows)
 * - Computed values (selectedLeads, selectedFlows, totalExecutions)
 *
 * @param options - Dependencies from parent useAutomation hook
 * @returns Selection state and management functions
 */
export function useSelection(options: UseSelectionOptions) {
  const { leads, flows, settings } = options

  // Selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())
  const [selectedFlowIds, setSelectedFlowIds] = useState<Set<string>>(new Set())

  /**
   * Auto-deselect hidden flows when visibility filtering is enabled
   *
   * This ensures that hidden flows are never selected when filtering is active
   */
  useEffect(() => {
    if (!settings.enableVisibilityFiltering) return
    if (!settings.hiddenFlows || settings.hiddenFlows.length === 0) return

    // Deselect all hidden flows automatically
    setSelectedFlowIds(prev => {
      const next = new Set(prev)
      let changed = false

      settings.hiddenFlows.forEach(hiddenSlug => {
        if (next.has(hiddenSlug)) {
          next.delete(hiddenSlug)
          changed = true
        }
      })

      // silent

      return changed ? next : prev
    })
  }, [settings.hiddenFlows, settings.enableVisibilityFiltering])

  // ============================================================
  // LEAD SELECTION
  // ============================================================

  /**
   * Toggle selection state of a single lead
   *
   * @param leadId - The ID of the lead to toggle
   */
  const toggleLead = useCallback((leadId: string) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev)
      if (next.has(leadId)) {
        next.delete(leadId)
      } else {
        next.add(leadId)
      }
      return next
    })
  }, [])

  /**
   * Select all available leads
   */
  const selectAllLeads = useCallback(() => {
    setSelectedLeadIds(new Set(leads.map(l => l.id)))
  }, [leads])

  /**
   * Clear all lead selections
   */
  const clearLeadSelection = useCallback(() => {
    setSelectedLeadIds(new Set())
  }, [])

  // ============================================================
  // FLOW SELECTION
  // ============================================================

  /**
   * Toggle selection state of a single flow
   *
   * @param flowId - The slug of the flow to toggle
   */
  const toggleFlow = useCallback((flowId: string) => {
    setSelectedFlowIds(prev => {
      const next = new Set(prev)
      if (next.has(flowId)) {
        next.delete(flowId)
      } else {
        next.add(flowId)
      }
      return next
    })
  }, [])

  /**
   * Toggle selection state of all flows for a specific platform
   *
   * If all platform flows are selected, deselects them all.
   * Otherwise, selects all visible flows for the platform.
   *
   * Respects visibility filtering settings.
   *
   * @param platformSlug - The slug of the platform
   */
  const togglePlatform = useCallback((platformSlug: string) => {
    // Filter platform flows
    let platformFlows = flows.filter(f => f.platform === platformSlug)

    // Exclude hidden flows if visibility filtering is enabled
    if (settings.enableVisibilityFiltering && settings.hiddenFlows && settings.hiddenFlows.length > 0) {
      platformFlows = platformFlows.filter(f => !settings.hiddenFlows.includes(f.slug))
    }

    const platformFlowIds = platformFlows.map(f => f.slug)

    setSelectedFlowIds(prev => {
      const next = new Set(prev)
      const allSelected = platformFlowIds.every(id => next.has(id))

      if (allSelected) {
        // Deselect all flows of this platform
        platformFlowIds.forEach(id => next.delete(id))
      } else {
        // Select all flows of this platform (excluding hidden ones)
        platformFlowIds.forEach(id => next.add(id))
      }
      return next
    })
  }, [flows, settings.enableVisibilityFiltering, settings.hiddenFlows])

  /**
   * Select all available flows
   *
   * Respects visibility filtering settings - only selects visible flows
   */
  const selectAllFlows = useCallback(() => {
    // Filter hidden flows if visibility filtering is enabled
    let flowsToSelect = flows
    if (settings.enableVisibilityFiltering && settings.hiddenFlows && settings.hiddenFlows.length > 0) {
      flowsToSelect = flows.filter(f => !settings.hiddenFlows.includes(f.slug))
    }
    setSelectedFlowIds(new Set(flowsToSelect.map(f => f.slug)))
  }, [flows, settings.enableVisibilityFiltering, settings.hiddenFlows])

  /**
   * Clear all flow selections
   */
  const clearFlowSelection = useCallback(() => {
    setSelectedFlowIds(new Set())
  }, [])

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

  /**
   * Get array of selected lead objects
   */
  const selectedLeads = useMemo(
    () => leads.filter(l => selectedLeadIds.has(l.id)),
    [leads, selectedLeadIds]
  )

  /**
   * Get array of selected flow objects
   */
  const selectedFlows = useMemo(
    () => flows.filter(f => selectedFlowIds.has(f.slug)),
    [flows, selectedFlowIds]
  )

  /**
   * Calculate total number of execution items that would be created
   * (leads × flows)
   */
  const totalExecutions = useMemo(
    () => selectedLeadIds.size * selectedFlowIds.size,
    [selectedLeadIds, selectedFlowIds]
  )

  // ============================================================
  // EXTERNAL UPDATES
  // ============================================================

  /**
   * Update lead selection from external source (e.g., history rerun)
   *
   * @param newSelection - New set of selected lead IDs
   */
  const updateLeadSelection = useCallback((newSelection: Set<string>) => {
    setSelectedLeadIds(newSelection)
  }, [])

  /**
   * Update flow selection from external source (e.g., history rerun)
   *
   * @param newSelection - New set of selected flow IDs
   */
  const updateFlowSelection = useCallback((newSelection: Set<string>) => {
    setSelectedFlowIds(newSelection)
  }, [])

  /**
   * Deselect specific flows (e.g., newly hidden flows from settings)
   *
   * @param flowSlugs - Array of flow slugs to deselect
   */
  const deselectFlows = useCallback((flowSlugs: string[]) => {
    if (!flowSlugs || flowSlugs.length === 0) return

    setSelectedFlowIds(prev => {
      const next = new Set(prev)
      let changed = false

      flowSlugs.forEach(slug => {
        if (next.has(slug)) {
          next.delete(slug)
          changed = true
        }
      })

      // silent

      return changed ? next : prev
    })
  }, [])

  return {
    // State
    selectedLeadIds,
    selectedFlowIds,

    // Lead actions
    toggleLead,
    selectAllLeads,
    clearLeadSelection,

    // Flow actions
    toggleFlow,
    togglePlatform,
    selectAllFlows,
    clearFlowSelection,

    // External updates
    updateLeadSelection,
    updateFlowSelection,
    deselectFlows,

    // Computed
    selectedLeads,
    selectedFlows,
    totalExecutions
  }
}
