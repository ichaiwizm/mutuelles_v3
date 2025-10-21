/**
 * useRunDetails Hook
 * Manages the state for run details modal
 */

import { useState, useCallback } from 'react'

export interface RunDetails {
  runDir: string
  leadName: string
  platformName: string
  flowName: string
}

export interface UseRunDetailsResult {
  selectedRunDetails: RunDetails | null
  handleViewDetails: (runDir: string, leadName: string, platformName: string, flowName: string) => void
  clearDetails: () => void
}

/**
 * Hook to manage run details modal state
 * Used in ExecutionCurrentView and ExecutionHistoryView
 */
export function useRunDetails(): UseRunDetailsResult {
  const [selectedRunDetails, setSelectedRunDetails] = useState<RunDetails | null>(null)

  const handleViewDetails = useCallback((
    runDir: string,
    leadName: string,
    platformName: string,
    flowName: string
  ) => {
    setSelectedRunDetails({ runDir, leadName, platformName, flowName })
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
