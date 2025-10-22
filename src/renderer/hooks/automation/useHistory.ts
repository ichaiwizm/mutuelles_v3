import { useState, useCallback } from 'react'

export type RunHistoryItem = {
  runId: string
  status: 'running' | 'completed' | 'failed' | 'stopped'
  mode: string
  concurrency: number | null
  totalItems: number
  successItems: number
  errorItems: number
  pendingItems: number
  cancelledItems: number
  startedAt: string
  completedAt: string | null
  durationMs: number | null
}

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
  const [runHistory, setRunHistory] = useState<RunHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  /**
   * Load history from database with optional filters
   */
  const loadHistory = useCallback(async (filters?: HistoryFilters) => {
    setIsLoading(true)

    try {
      const response = await window.api.scenarios.getHistory(filters)

      if (!response.success || !Array.isArray(response.data)) {
        console.warn('[useHistory] Invalid history response')
        setRunHistory([])
        return
      }

      // Transform DB runs to RunHistoryItem format with defensive filtering
      const runs: RunHistoryItem[] = response.data
        .filter((run: any) => {
          // Defensive: filter out invalid runs
          if (!run || !run.id || !run.started_at) {
            console.warn('[useHistory] Skipping invalid run:', run)
            return false
          }
          return true
        })
        .map((run: any) => ({
          runId: run.id,
          status: run.status,
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
          items: []  // Items are loaded separately via getRunItems() when needed
        }))

      setRunHistory(runs)

      console.log(`[useHistory] Loaded ${runs.length} runs from database`)
    } catch (error) {
      console.error('[useHistory] Failed to load history:', error)
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
        // Remove from local state
        setRunHistory(prev => prev.filter(r => r.runId !== runId))
        console.log('[useHistory] Deleted run:', runId)
      } else {
        console.error('[useHistory] Failed to delete run:', result.error)
      }

      return result
    } catch (error) {
      console.error('[useHistory] Error deleting run:', error)
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
      console.error('[useHistory] Failed to load run items:', error)
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
      console.error('[useHistory] Failed to load item steps:', error)
      return []
    }
  }, [])

  return {
    runHistory,
    isLoading,
    loadHistory,
    deleteHistoryRun,
    getRunItems,
    getItemSteps
  }
}
