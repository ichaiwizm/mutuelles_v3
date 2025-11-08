/**
 * Service for estimating execution time
 * Uses historical data when available, fallback to 1.6s per step
 */

import type { RunHistoryItem, ExecutionHistoryItem } from '../../shared/types/automation'
import type { Flow } from '../hooks/useAutomation'

const DEFAULT_STEP_DURATION_MS = 1600

export interface TimeEstimate {
  durationMs: number
  confidence: 'high' | 'medium' | 'low'
  source: 'history' | 'baseline'
}

export function estimateFlowDuration(
  flowSlug: string,
  runHistory: RunHistoryItem[],
  flows: Flow[]
): TimeEstimate {
  const historicalDuration = getHistoricalAverage(flowSlug, runHistory)

  if (historicalDuration !== null) {
    return {
      durationMs: historicalDuration,
      confidence: 'high',
      source: 'history'
    }
  }

  const flow = flows.find(f => f.slug === flowSlug)
  if (!flow) {
    return {
      durationMs: 120000,
      confidence: 'low',
      source: 'baseline'
    }
  }

  const stepCount = getStepCountFromFlow(flow)
  const estimatedDuration = stepCount * DEFAULT_STEP_DURATION_MS

  return {
    durationMs: estimatedDuration,
    confidence: 'medium',
    source: 'baseline'
  }
}

export function estimateTotalDuration(
  leadCount: number,
  flowSlugs: string[],
  concurrency: number,
  runHistory: RunHistoryItem[],
  flows: Flow[]
): TimeEstimate {
  const totalExecutions = leadCount * flowSlugs.length

  if (totalExecutions === 0) {
    return {
      durationMs: 0,
      confidence: 'high',
      source: 'baseline'
    }
  }

  let totalDurationMs = 0
  let hasHistory = false

  for (const flowSlug of flowSlugs) {
    const estimate = estimateFlowDuration(flowSlug, runHistory, flows)
    totalDurationMs += estimate.durationMs
    if (estimate.source === 'history') {
      hasHistory = true
    }
  }

  const avgDurationPerExecution = totalDurationMs / flowSlugs.length

  const totalWithConcurrency = (totalExecutions * avgDurationPerExecution) / Math.max(1, concurrency)

  return {
    durationMs: totalWithConcurrency,
    confidence: hasHistory ? 'high' : 'medium',
    source: hasHistory ? 'history' : 'baseline'
  }
}

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

  const avgDuration = estimateTotalDuration(1, flowSlugs, 1, runHistory, flows).durationMs

  const remainingItems = pendingItems + runningItems

  const estimatedRemaining = (remainingItems * avgDuration) / Math.max(1, concurrency)

  return {
    durationMs: estimatedRemaining,
    confidence: completedItems > 0 ? 'high' : 'medium',
    source: completedItems > 0 ? 'history' : 'baseline'
  }
}

export { formatDuration } from '../utils/dateGrouping'

function getHistoricalAverage(flowSlug: string, runHistory: RunHistoryItem[]): number | null {
  const allItems: ExecutionHistoryItem[] = runHistory
    .filter(run => Array.isArray(run.items))
    .flatMap(run => run.items)

  const flowItems = allItems.filter(item =>
    item.flowSlug === flowSlug &&
    item.durationMs !== undefined &&
    item.durationMs > 0
  )

  if (flowItems.length === 0) {
    return null
  }

  const totalDuration = flowItems.reduce((sum, item) => sum + (item.durationMs || 0), 0)
  return Math.round(totalDuration / flowItems.length)
}

function getStepCountFromFlow(flow: Flow): number {
  const n = (flow as any).stepsCount
  if (typeof n === 'number' && n > 0) return n
  return 30
}
