import type { RunHistoryItem } from '../../shared/types/automation'
import { getStats as getAnalyticsStats, checkHealth as checkAnalyticsHealth } from './runHistoryAnalytics'

/**
 * Service for managing run history persistence in localStorage
 *
 * Responsibilities:
 * - Save completed runs to localStorage
 * - Retrieve run history with validation
 * - Manage storage quota (max 100 runs, FIFO)
 *
 * For analytics and health checks, see runHistoryAnalytics.ts
 *
 * Storage format: JSON array in localStorage key 'automation-run-history'
 * Max size: 100 runs (oldest removed automatically)
 */
export class RunHistoryService {
  private static readonly STORAGE_KEY = 'automation-run-history'
  private static readonly MAX_HISTORY = 100

  /**
   * Save a run to history with automatic cleanup
   *
   * Automatically removes oldest runs if storage exceeds MAX_HISTORY.
   * Handles QuotaExceededError by cleaning old runs and retrying.
   *
   * @param run - The run history item to save
   *
   * @example
   * ```typescript
   * const run: RunHistoryItem = {
   *   runId: 'abc123',
   *   startedAt: new Date().toISOString(),
   *   completedAt: new Date().toISOString(),
   *   // ... other fields
   * }
   * RunHistoryService.saveRun(run)
   * ```
   */
  static saveRun(run: RunHistoryItem): void {
    try {
      const history = this.getHistory()

      // Add new run at the beginning (most recent first)
      const updated = [run, ...history]

      // Keep only MAX_HISTORY most recent runs
      const limited = updated.slice(0, this.MAX_HISTORY)

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(limited))

      console.log(`[RunHistoryService] Saved run ${run.runId.slice(0, 8)}, total: ${limited.length}`)
    } catch (error) {
      console.error('[RunHistoryService] Failed to save run:', error)

      // If localStorage is full, try to clear old runs and retry
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('[RunHistoryService] Storage quota exceeded, cleaning old runs')
        this.cleanOldRuns(50) // Keep only 50 most recent

        // Retry save
        try {
          const history = this.getHistory()
          const updated = [run, ...history].slice(0, this.MAX_HISTORY)
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated))
        } catch (retryError) {
          console.error('[RunHistoryService] Failed to save run after cleanup:', retryError)
        }
      }
    }
  }

  /**
   * Get all runs from history
   * Returns empty array if no history exists
   */
  static getHistory(): RunHistoryItem[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) {
        return []
      }

      const parsed = JSON.parse(stored)

      if (!Array.isArray(parsed)) {
        console.warn('[RunHistoryService] Invalid history format, resetting')
        return []
      }

      return parsed as RunHistoryItem[]
    } catch (error) {
      console.error('[RunHistoryService] Failed to load history:', error)
      return []
    }
  }

  /**
   * Get a specific run by ID
   */
  static getRun(runId: string): RunHistoryItem | null {
    const history = this.getHistory()
    return history.find(run => run.runId === runId) || null
  }

  /**
   * Delete a run from history
   */
  static deleteRun(runId: string): void {
    try {
      const history = this.getHistory()
      const filtered = history.filter(run => run.runId !== runId)

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))

      console.log(`[RunHistoryService] Deleted run ${runId.slice(0, 8)}, remaining: ${filtered.length}`)
    } catch (error) {
      console.error('[RunHistoryService] Failed to delete run:', error)
    }
  }

  /**
   * Clean old runs, keeping only the specified number
   */
  static cleanOldRuns(keepCount: number = 50): void {
    try {
      const history = this.getHistory()

      if (history.length <= keepCount) {
        console.log(`[RunHistoryService] No cleanup needed (${history.length} runs)`)
        return
      }

      const kept = history.slice(0, keepCount)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(kept))

      console.log(`[RunHistoryService] Cleaned old runs, kept ${kept.length}/${history.length}`)
    } catch (error) {
      console.error('[RunHistoryService] Failed to clean old runs:', error)
    }
  }

  /**
   * Clear all history
   */
  static clearAll(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
      console.log('[RunHistoryService] Cleared all history')
    } catch (error) {
      console.error('[RunHistoryService] Failed to clear history:', error)
    }
  }

  /**
   * Get history statistics (delegates to analytics service)
   */
  static getStats() {
    const history = this.getHistory()
    return getAnalyticsStats(history, this.STORAGE_KEY)
  }

  /**
   * Check if storage is healthy (delegates to analytics service)
   */
  static checkHealth() {
    const history = this.getHistory()
    const stats = this.getStats()
    return checkAnalyticsHealth(history, stats, this.MAX_HISTORY)
  }
}
