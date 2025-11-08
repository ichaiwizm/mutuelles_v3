import { useState, useCallback } from 'react'
import type { RunHistoryItem as SharedRunHistoryItem } from '../../../shared/types/automation'

export type HistoryFilters = {
  status?: string
  platform?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

/**
 * Hook for managing execution run history from database
 *
 * Loads history directly from DB with optional filtering.
 * Much simpler than before - DB returns pre-aggregated runs.
 *
 * @returns History state and management functions
 */
export function useHistory() {
  const [runHistory, setRunHistory] = useState<SharedRunHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  /**
   * Load history from database with optional filters
   */
  const loadHistory = useCallback(async (filters?: HistoryFilters) => {
    setIsLoading(true)

    try {
      const response = await window.api.scenarios.getHistory(filters)

      if (!response.success || !Array.isArray(response.data)) {
        setRunHistory([])
        return
      }

      // Transform DB runs to RunHistoryItem format with defensive filtering
      const runs: SharedRunHistoryItem[] = response.data
        .filter((run: any) => {
          // Defensive: filter out invalid runs
          if (!run || !run.id || !run.started_at) { return false }
          return true
        })
        .map((run: any) => {
          const computed = computeRunStatus(run)
          const base: SharedRunHistoryItem = {
            runId: run.id,
            // Compute partial for UI clarity
            status: computed,
            mode: run.mode,
            concurrency: run.concurrency,
            totalItems: run.total_items,
            successItems: run.success_items,
            errorItems: run.error_items,
            pendingItems: run.pending_items,
            cancelledItems: run.cancelled_items || 0,
            startedAt: run.started_at,
            completedAt: run.completed_at,
            durationMs: run.duration_ms,
            settings: {
              mode: 'headless',
              concurrency: run.concurrency ?? 2,
              timeout: 300000,
              keepBrowserOpen: false,
              screenshotFrequency: 'all',
              retryFailed: false,
              maxRetries: 1
            },
            items: []
          }
          return base
        })

      setRunHistory(runs)
      // Check if DB has running runs that are not yet finalized (silent)
      let runningCount = 0
      try {
        const runningResp = await window.api.scenarios.getHistory({ status: 'running' })
        if (runningResp?.success && Array.isArray(runningResp.data)) {
          runningCount = runningResp.data.length
        }
      } catch {}

      if (runs.length === 0 && runningCount > 0) {
        // Attempt a silent repair; then reload once
        try {
          const repaired = await window.api.scenarios.repairFinalize()
          if (repaired?.success) {
            const again = await window.api.scenarios.getHistory()
            if (again?.success && Array.isArray(again.data)) {
              setRunHistory(again.data.map((run: any) => ({
                runId: run.id,
                status: computeRunStatus(run),
                mode: run.mode,
                concurrency: run.concurrency,
                totalItems: run.total_items,
                successItems: run.success_items,
                errorItems: run.error_items,
                pendingItems: run.pending_items,
                cancelledItems: run.cancelled_items || 0,
                startedAt: run.started_at,
                completedAt: run.completed_at,
                durationMs: run.duration_ms,
                settings: {
                  mode: 'headless',
                  concurrency: run.concurrency ?? 2,
                  timeout: 300000,
                  keepBrowserOpen: false,
                  screenshotFrequency: 'all',
                  retryFailed: false,
                  maxRetries: 1
                },
                items: []
              } as SharedRunHistoryItem)))
            }
          }
        } catch {}
      }
    } catch (error) {
      setRunHistory([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Delete a specific run from database (cascade deletes items, steps, attempts)
   */
  const deleteHistoryRun = useCallback(async (runId: string) => {
    try {
      const result = await window.api.scenarios.deleteRun(runId)

      if (result.success) {
        setRunHistory(prev => prev.filter(r => r.runId !== runId))
      }

      return result
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }, [])

  /**
   * Delete all completed/failed/stopped runs from database
   */
  const deleteAllRuns = useCallback(async () => {
    try {
      const result = await window.api.scenarios.deleteAllRuns()

      if (result.success) {
        // Clear all history from state
        setRunHistory([])
      }

      return result
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }, [])

  /**
   * Get run items for a specific run (for details modal)
   */
  const getRunItems = useCallback(async (runId: string) => {
    try {
      const response = await window.api.scenarios.getRunItems(runId)
      return response.success ? response.data : []
    } catch (error) {
      return []
    }
  }, [])

  /**
   * Get steps for a specific item (for step details)
   */
  const getItemSteps = useCallback(async (itemId: string) => {
    try {
      const response = await window.api.scenarios.getRunSteps(itemId)
      return response.success ? response.data : []
    } catch (error) {
      return []
    }
  }, [])

  return {
    runHistory,
    isLoading,
    loadHistory,
    deleteHistoryRun,
    deleteAllRuns,
    getRunItems,
    getItemSteps
  }
}

// Helpers
function computeRunStatus(run: any): 'completed' | 'partial' | 'failed' | 'stopped' {
  // If DB says stopped, keep stopped
  if (run.status === 'stopped') return 'stopped'
  // If DB says running (should be filtered out), fallback to partial/failed rules anyway
  const success = run.success_items || 0
  const error = run.error_items || 0
  const cancelled = run.cancelled_items || 0
  if (error > 0 || cancelled > 0) {
    return success > 0 ? 'partial' : 'failed'
  }
  return 'completed'
}
