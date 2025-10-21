import { useState, useCallback } from 'react'
import { RunHistoryService } from '../../services/runHistoryService'
import type {
  RunHistoryItem,
  ExecutionHistoryItem,
  RunHistoryStatus,
  ExecutionSettings as SharedExecutionSettings
} from '../../../shared/types/automation'
import type { AdvancedSettings } from './useSettings'

/**
 * Minimal ExecutionItem type for history (to avoid circular dependency)
 */
export type ExecutionItemForHistory = {
  id: string
  leadId: string
  leadName: string
  platform: string
  platformName: string
  flowSlug?: string
  flowName?: string
  status: 'pending' | 'running' | 'success' | 'error'
  runDir?: string
  message?: string
  startedAt?: Date
  completedAt?: Date
}

/**
 * Hook for managing execution run history
 *
 * Responsibilities:
 * - Load history from localStorage
 * - Save completed runs to history
 * - Delete and clear history
 * - NO execution logic (just data persistence)
 *
 * @returns History state and management functions
 */
export function useHistory() {
  // History state
  const [runHistory, setRunHistory] = useState<RunHistoryItem[]>([])

  /**
   * Load history from localStorage
   */
  const loadHistory = useCallback(() => {
    try {
      const history = RunHistoryService.getHistory()
      setRunHistory(history)
      console.log(`[useHistory] Loaded ${history.length} runs from history`)
    } catch (error) {
      console.error('[useHistory] Failed to load history:', error)
    }
  }, [])

  /**
   * Save a completed run to history
   *
   * @param runId - The run ID
   * @param executionItems - Map of execution items
   * @param settings - Settings used for the run
   */
  const saveRunToHistory = useCallback((
    runId: string,
    executionItems: Map<string, ExecutionItemForHistory>,
    settings: AdvancedSettings
  ) => {
    try {
      const items = Array.from(executionItems.values())

      if (items.length === 0) {
        console.warn('[useHistory] No items to save to history')
        return
      }

      // Keep ALL items (including pending and running) to preserve full state
      // This allows tracking incomplete runs and provides complete history
      const allItems = items

      // Calculate stats based on all items
      const successItems = allItems.filter(i => i.status === 'success').length
      const errorItems = allItems.filter(i => i.status === 'error').length
      const pendingItems = allItems.filter(i => i.status === 'pending').length
      const runningItems = allItems.filter(i => i.status === 'running').length

      // Determine overall status based on actual item states
      let status: RunHistoryStatus
      if (pendingItems > 0 || runningItems > 0) {
        // Run was stopped/interrupted - has incomplete items
        status = 'stopped'
      } else if (errorItems === 0) {
        // All completed successfully
        status = 'completed'
      } else if (successItems === 0) {
        // All failed
        status = 'failed'
      } else {
        // Mix of success and errors
        status = 'partial'
      }

      // Find earliest start and latest completion times from all items
      const startTimes = allItems.map(i => i.startedAt).filter(Boolean) as Date[]
      const completeTimes = allItems.map(i => i.completedAt).filter(Boolean) as Date[]

      const startedAt = startTimes.length > 0
        ? new Date(Math.min(...startTimes.map(d => d.getTime())))
        : new Date()

      const completedAt = completeTimes.length > 0
        ? new Date(Math.max(...completeTimes.map(d => d.getTime())))
        : new Date()

      const durationMs = completedAt.getTime() - startedAt.getTime()

      // Convert ExecutionItem[] to ExecutionHistoryItem[] (all items including pending/running)
      const historyItems: ExecutionHistoryItem[] = allItems.map(item => ({
        id: item.id,
        leadId: item.leadId,
        leadName: item.leadName,
        platform: item.platform,
        platformName: item.platformName,
        flowSlug: item.flowSlug || '',
        flowName: item.flowName || '',
        status: item.status,
        runDir: item.runDir,
        error: item.message,
        startedAt: item.startedAt?.toISOString() || new Date().toISOString(),
        completedAt: item.completedAt?.toISOString(),
        durationMs: item.completedAt && item.startedAt
          ? item.completedAt.getTime() - item.startedAt.getTime()
          : undefined
      }))

      // Convert AdvancedSettings to ExecutionSettings (shared type)
      const executionSettings: SharedExecutionSettings = {
        mode: settings.mode === 'visible' ? 'dev' : settings.mode === 'headless-minimized' ? 'headless' : settings.mode,
        concurrency: settings.concurrency,
        timeout: 300000,
        keepBrowserOpen: settings.keepBrowserOpen,
        screenshotFrequency: 'all',
        retryFailed: settings.retryFailed,
        maxRetries: settings.maxRetries
      }

      // Build history item
      const historyItem: RunHistoryItem = {
        runId,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs,
        totalItems: allItems.length,
        successItems,
        errorItems,
        pendingItems,
        status,
        settings: executionSettings,
        items: historyItems
      }

      // Save to localStorage
      RunHistoryService.saveRun(historyItem)

      // Update local state - replace if exists, add if new
      setRunHistory(prev => {
        const existingIndex = prev.findIndex(h => h.runId === runId)
        if (existingIndex >= 0) {
          // Update existing run
          const updated = [...prev]
          updated[existingIndex] = historyItem
          return updated
        } else {
          // Add new run at the beginning
          return [historyItem, ...prev]
        }
      })

      console.log(`[useHistory] Saved run ${runId.slice(0, 8)} to history (status: ${status})`)
    } catch (error) {
      console.error('[useHistory] Failed to save run to history:', error)
    }
  }, [])

  /**
   * Delete a specific run from history
   */
  const deleteHistoryRun = useCallback((historyRunId: string) => {
    RunHistoryService.deleteRun(historyRunId)
    setRunHistory(prev => prev.filter(r => r.runId !== historyRunId))
    console.log(`[useHistory] Deleted history run ${historyRunId.slice(0, 8)}`)
  }, [])

  /**
   * Clear all history
   */
  const clearAllHistory = useCallback(() => {
    RunHistoryService.clearAll()
    setRunHistory([])
    console.log('[useHistory] Cleared all history')
  }, [])

  return {
    runHistory,
    loadHistory,
    saveRunToHistory,
    deleteHistoryRun,
    clearAllHistory
  }
}
