/**
 * Service for estimating execution time
 * Uses historical data when available, fallback to 1.6s per step
 */

import type { RunHistoryItem, ExecutionHistoryItem } from '../../shared/types/automation'
import type { Flow } from '../hooks/useAutomation'

const DEFAULT_STEP_DURATION_MS = 1600 // 1.6s per step (fallback)

export interface TimeEstimate {
  durationMs: number
  confidence: 'high' | 'medium' | 'low'
  source: 'history' | 'baseline'
}

/**
 * Estimate duration for a single flow execution
 */
export function estimateFlowDuration(
  flowSlug: string,
  runHistory: RunHistoryItem[],
  flows: Flow[]
): TimeEstimate {
  // Try to get historical average
  const historicalDuration = getHistoricalAverage(flowSlug, runHistory)

  if (historicalDuration !== null) {
    return {
      durationMs: historicalDuration,
      confidence: 'high',
      source: 'history'
    }
  }

  // Fallback: estimate based on step count (1.6s per step)
  const flow = flows.find(f => f.slug === flowSlug)
  if (!flow) {
    // Unknown flow, use a conservative default (2 minutes)
    return {
      durationMs: 120000,
      confidence: 'low',
      source: 'baseline'
    }
  }

  // Flow files contain step count in the name or we can parse the file
  // For now, use a heuristic: count from file property if available
  // Otherwise use baseline
  const stepCount = getStepCountFromFlow(flow)
  const estimatedDuration = stepCount * DEFAULT_STEP_DURATION_MS

  return {
    durationMs: estimatedDuration,
    confidence: 'medium',
    source: 'baseline'
  }
}

/**
 * Estimate total duration for all selected executions
 * Takes concurrency into account
 */
export function estimateTotalDuration(
  leadCount: number,
  flowSlugs: string[],
  concurrency: number,
  runHistory: RunHistoryItem[],
  flows: Flow[]
): TimeEstimate {
  // Calculate total number of executions
  const totalExecutions = leadCount * flowSlugs.length

  if (totalExecutions === 0) {
    return {
      durationMs: 0,
      confidence: 'high',
      source: 'baseline'
    }
  }

  // Estimate duration per execution (average across flows)
  let totalDurationMs = 0
  let hasHistory = false

  for (const flowSlug of flowSlugs) {
    const estimate = estimateFlowDuration(flowSlug, runHistory, flows)
    totalDurationMs += estimate.durationMs
    if (estimate.source === 'history') {
      hasHistory = true
    }
  }

  // Average duration per execution
  const avgDurationPerExecution = totalDurationMs / flowSlugs.length

  // Total duration with concurrency
  // Formula: (total items × avg duration) / concurrency
  const totalWithConcurrency = (totalExecutions * avgDurationPerExecution) / Math.max(1, concurrency)

  return {
    durationMs: totalWithConcurrency,
    confidence: hasHistory ? 'high' : 'medium',
    source: hasHistory ? 'history' : 'baseline'
  }
}

/**
 * Estimate remaining time during execution
 */
export function estimateRemainingTime(
  pendingItems: number,
  runningItems: number,
  completedItems: number,
  concurrency: number,
  runHistory: RunHistoryItem[],
  flows: Flow[],
  flowSlugs: string[]
): TimeEstimate {
  if (pendingItems === 0 && runningItems === 0) {
    return {
      durationMs: 0,
      confidence: 'high',
      source: 'history'
    }
  }

  // Calculate average duration from completed items in this run (most accurate)
  // If no completed items yet, fall back to historical average

  // For now, use historical average for remaining items
  const avgDuration = estimateTotalDuration(1, flowSlugs, 1, runHistory, flows).durationMs

  // Remaining items
  const remainingItems = pendingItems + runningItems

  // Estimate: remaining items × avg duration / concurrency
  const estimatedRemaining = (remainingItems * avgDuration) / Math.max(1, concurrency)

  return {
    durationMs: estimatedRemaining,
    confidence: completedItems > 0 ? 'high' : 'medium',
    source: completedItems > 0 ? 'history' : 'baseline'
  }
}

/**
 * Format duration as human-readable string
 */
export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.ceil(durationMs / 1000)

  if (totalSeconds < 60) {
    return `${totalSeconds}s`
  }

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`
}

/**
 * Format estimated end time
 */
export function formatEstimatedEndTime(durationMs: number): string {
  const endTime = new Date(Date.now() + durationMs)
  return endTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get historical average duration for a flow
 * Returns null if no history available
 */
function getHistoricalAverage(flowSlug: string, runHistory: RunHistoryItem[]): number | null {
  // Flatten all items
  const allItems: ExecutionHistoryItem[] = runHistory.flatMap(run => run.items)

  // Filter items for this flow that have completed successfully
  const flowItems = allItems.filter(item =>
    item.flowSlug === flowSlug &&
    item.durationMs !== undefined &&
    item.durationMs > 0
  )

  if (flowItems.length === 0) {
    return null
  }

  // Calculate simple average
  const totalDuration = flowItems.reduce((sum, item) => sum + (item.durationMs || 0), 0)
  return Math.round(totalDuration / flowItems.length)
}

/**
 * Get step count from flow metadata
 * Fallback to default if not available
 */
function getStepCountFromFlow(flow: Flow): number {
  // Try to parse from flow file name or metadata
  // For now, use a heuristic based on flow name
  // This should ideally come from the flow JSON file

  // Conservative default: 30 steps
  return 30
}
