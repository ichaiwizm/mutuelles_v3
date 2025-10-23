/**
 * Execution Stats Utility
 * Centralized calculation of execution statistics
 */

import type { ExecutionItem } from '../hooks/useAutomation'

export interface ExecutionStats {
  total: number
  pending: number
  running: number
  success: number
  error: number
  cancelled: number
  completed: number
  progress: number
}

/**
 * Calculate execution statistics from a list of execution items
 * Used in useDashboardState, executionGrouping, and other components
 */
export function calculateExecutionStats(items: ExecutionItem[]): ExecutionStats {
  const total = items.length
  const pending = items.filter(i => i.status === 'pending').length
  const running = items.filter(i => i.status === 'running').length
  const success = items.filter(i => i.status === 'success').length
  const error = items.filter(i => i.status === 'error').length
  const cancelled = items.filter(i => i.status === 'cancelled').length
  const completed = success + error + cancelled

  return {
    total,
    pending,
    running,
    success,
    error,
    cancelled,
    completed,
    progress: total > 0 ? Math.round((completed / total) * 100) : 0
  }
}
