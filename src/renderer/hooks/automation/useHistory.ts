import { useState, useCallback } from 'react'
import type {
  RunHistoryItem,
  ExecutionHistoryItem,
  RunHistoryStatus
} from '../../../shared/types/automation'

/**
 * Hook for managing execution run history
 *
 * Loads history from filesystem via IPC instead of localStorage.
 * The backend writes execution results to data/runs/ during execution.
 *
 * @returns History state and management functions
 */
export function useHistory() {
  const [runHistory, setRunHistory] = useState<RunHistoryItem[]>([])

  /**
   * Load history from filesystem via IPC
   * Groups individual execution items by runId into complete run records
   */
  const loadHistory = useCallback(async () => {
    try {
      const response = await window.api.scenarios.getHistory()

      if (!response.success || !Array.isArray(response.data)) {
        console.warn('[useHistory] Invalid history response')
        setRunHistory([])
        return
      }

      // Group individual items by runId (items from same run share runId)
      const grouped = groupByRunId(response.data)
      setRunHistory(grouped)

      console.log(`[useHistory] Loaded ${grouped.length} runs from filesystem`)
    } catch (error) {
      console.error('[useHistory] Failed to load history:', error)
      setRunHistory([])
    }
  }, [])

  /**
   * Delete a specific run from history
   * Note: Currently not implemented in backend
   */
  const deleteHistoryRun = useCallback((historyRunId: string) => {
    console.warn('[useHistory] Delete not yet implemented in backend')
    // TODO: Implement IPC call to delete run from filesystem
    // For now, just remove from local state
    setRunHistory(prev => prev.filter(r => r.runId !== historyRunId))
  }, [])

  return {
    runHistory,
    loadHistory,
    deleteHistoryRun
  }
}

/**
 * Group individual execution items by sessionId into RunHistoryItem records
 *
 * The backend returns a flat list where each item represents one execution.
 * Multiple items with the same sessionId are part of the same batch.
 * We group them and aggregate stats.
 */
function groupByRunId(items: any[]): RunHistoryItem[] {
  // Group items by sessionId (falls back to individual items if no sessionId)
  const groups = new Map<string, any[]>()

  for (const item of items) {
    const sessionId = item.sessionId || item.id || 'unknown'
    if (!groups.has(sessionId)) {
      groups.set(sessionId, [])
    }
    groups.get(sessionId)!.push(item)
  }

  // Convert each group into a RunHistoryItem
  const result: RunHistoryItem[] = []

  for (const [sessionId, groupItems] of groups.entries()) {
    // Aggregate stats
    const totalItems = groupItems.length
    const successItems = groupItems.filter(i => i.status === 'success').length
    const errorItems = groupItems.filter(i => i.status === 'error').length
    const pendingItems = groupItems.filter(i => i.status === 'pending').length
    const runningItems = groupItems.filter(i => i.status === 'running').length

    // Determine overall status
    let status: RunHistoryStatus
    if (pendingItems > 0 || runningItems > 0) {
      status = 'stopped'  // Some items incomplete
    } else if (errorItems === 0) {
      status = 'completed'  // All success
    } else if (successItems === 0) {
      status = 'failed'  // All failed
    } else {
      status = 'partial'  // Mix of success and error
    }

    // Find earliest start and latest completion times
    const startTimes = groupItems.map(i => i.startedAt).filter(Boolean)
    const finishTimes = groupItems.map(i => i.finishedAt).filter(Boolean)

    const startedAt = startTimes.length > 0
      ? new Date(Math.min(...startTimes.map(t => new Date(t).getTime()))).toISOString()
      : new Date().toISOString()

    const completedAt = finishTimes.length > 0
      ? new Date(Math.max(...finishTimes.map(t => new Date(t).getTime()))).toISOString()
      : new Date().toISOString()

    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime()

    // Convert items to ExecutionHistoryItem format
    const historyItems: ExecutionHistoryItem[] = groupItems.map(item => ({
      id: item.id || 'unknown',
      leadId: item.leadId || '',
      leadName: item.leadName || '',
      platform: item.platform || item.slug || '',
      platformName: item.platform || item.slug || '',
      flowSlug: item.slug || '',
      flowName: item.slug || '',  // Flow name not available in current response
      status: item.status || 'pending',
      runDir: item.runDir,
      error: item.error,
      startedAt: item.startedAt || new Date().toISOString(),
      completedAt: item.finishedAt,
      durationMs: item.durationMs
    }))

    // Use mode from first item (all items in batch should have same mode)
    const mode = groupItems[0]?.mode || 'headless'

    result.push({
      runId: sessionId,
      startedAt,
      completedAt,
      durationMs,
      totalItems,
      successItems,
      errorItems,
      pendingItems,
      status,
      settings: {
        mode,
        concurrency: 1,
        timeout: 300000,
        keepBrowserOpen: false,
        screenshotFrequency: 'all',
        retryFailed: false,
        maxRetries: 0
      },
      items: historyItems
    })
  }

  // Sort by startedAt descending (most recent first)
  return result.sort((a, b) =>
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  )
}

