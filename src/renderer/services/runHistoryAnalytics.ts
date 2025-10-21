/**
 * Run History Analytics Service
 * Provides statistics and health monitoring for run history
 */

import type { RunHistoryItem } from '../../shared/types/automation'

export interface RunHistoryStats {
  totalRuns: number
  completedRuns: number
  partialRuns: number
  failedRuns: number
  stoppedRuns: number
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageDuration: number
  storageSizeKB: number
}

export interface HealthCheckResult {
  isHealthy: boolean
  issues: string[]
  warnings: string[]
}

/**
 * Calculate statistics from run history
 */
export function getStats(history: RunHistoryItem[], storageKey: string): RunHistoryStats {
  const totalRuns = history.length
  const completedRuns = history.filter(r => r.status === 'completed').length
  const partialRuns = history.filter(r => r.status === 'partial').length
  const failedRuns = history.filter(r => r.status === 'failed').length
  const stoppedRuns = history.filter(r => r.status === 'stopped').length

  const totalExecutions = history.reduce((sum, r) => sum + r.totalItems, 0)
  const successfulExecutions = history.reduce((sum, r) => sum + r.successItems, 0)
  const failedExecutions = history.reduce((sum, r) => sum + r.errorItems, 0)

  const durations = history.filter(r => r.durationMs > 0).map(r => r.durationMs)
  const averageDuration = durations.length > 0
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length
    : 0

  const stored = localStorage.getItem(storageKey) || ''
  const storageSizeKB = new Blob([stored]).size / 1024

  return {
    totalRuns,
    completedRuns,
    partialRuns,
    failedRuns,
    stoppedRuns,
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    averageDuration,
    storageSizeKB
  }
}

/**
 * Check if storage is healthy
 */
export function checkHealth(
  history: RunHistoryItem[],
  stats: RunHistoryStats,
  maxHistory: number
): HealthCheckResult {
  const issues: string[] = []
  const warnings: string[] = []

  try {
    // Check storage size
    if (stats.storageSizeKB > 5000) {
      issues.push(`Storage size too large: ${stats.storageSizeKB.toFixed(2)} KB`)
    } else if (stats.storageSizeKB > 3000) {
      warnings.push(`Storage size getting large: ${stats.storageSizeKB.toFixed(2)} KB`)
    }

    // Check run count
    if (history.length > maxHistory) {
      issues.push(`Too many runs: ${history.length} (max: ${maxHistory})`)
    } else if (history.length > maxHistory * 0.9) {
      warnings.push(`Approaching max runs: ${history.length}/${maxHistory}`)
    }

    // Check for corrupted data
    for (const run of history) {
      if (!run.runId || !run.startedAt || !run.items || !Array.isArray(run.items)) {
        issues.push(`Corrupted run found: ${run.runId || 'unknown'}`)
      }
    }

  } catch (error) {
    issues.push(`Failed to check health: ${error instanceof Error ? error.message : 'unknown error'}`)
  }

  return {
    isHealthy: issues.length === 0,
    issues,
    warnings
  }
}
