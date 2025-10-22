/**
 * useRunDetails Hook
 * Manages the state for run details modal
 */

import { useState, useCallback } from 'react'

export interface RunDetails {
  runId: string      // Parent run ID
  itemId: string     // Execution item ID
  runDir: string     // Filesystem path for artifacts
  leadName: string
  platformName: string
  flowName: string
}

export interface UseRunDetailsResult {
  selectedRunDetails: RunDetails | null
  handleViewDetails: (runId: string, itemId: string, runDir: string, leadName: string, platformName: string, flowName: string) => void
  clearDetails: () => void
}

/**
 * Hook to manage run details modal state
 * Used in ExecutionCurrentView and ExecutionHistoryView
 */
export function useRunDetails(): UseRunDetailsResult {
  const [selectedRunDetails, setSelectedRunDetails] = useState<RunDetails | null>(null)

  const handleViewDetails = useCallback((
    runId: string,
    itemId: string,
    runDir: string,
    leadName: string,
    platformName: string,
    flowName: string
  ) => {
    setSelectedRunDetails({ runId, itemId, runDir, leadName, platformName, flowName })
  }, [])

  const clearDetails = useCallback(() => {
    setSelectedRunDetails(null)
  }, [])

  return {
    selectedRunDetails,
    handleViewDetails,
    clearDetails
  }
}
