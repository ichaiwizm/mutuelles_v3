import type { ExecutionItem } from '../hooks/useAutomation'
import { calculateExecutionStats } from './executionStats'

export type GroupingMode = 'flow' | 'platform' | 'status'

export interface ExecutionGroup {
  key: string
  label: string
  items: ExecutionItem[]
  pending: number
  running: number
  success: number
  error: number
  cancelled: number
  total: number
}

/**
 * Group execution items by different criteria
 */
export function groupExecutionItems(
  items: ExecutionItem[],
  mode: GroupingMode
): ExecutionGroup[] {
  const groupsMap = new Map<string, ExecutionItem[]>()

  // Group items by the selected mode
  for (const item of items) {
    let key: string

    switch (mode) {
      case 'flow':
        key = `${item.platform}:${item.flowSlug || 'unknown'}`
        break
      case 'platform':
        key = item.platform
        break
      case 'status':
        key = item.status
        break
    }

    if (!groupsMap.has(key)) {
      groupsMap.set(key, [])
    }
    groupsMap.get(key)!.push(item)
  }

  // Convert to ExecutionGroup array with stats
  const groups: ExecutionGroup[] = []
  for (const [key, groupItems] of groupsMap.entries()) {
    const stats = calculateGroupStats(groupItems)

    // Determine label from first item if not already set
    let label = key
    if (mode === 'flow') {
      label = groupItems[0]?.flowName || groupItems[0]?.flowSlug || key
    } else if (mode === 'platform') {
      label = groupItems[0]?.platformName || key
    } else if (mode === 'status') {
      label = getStatusLabel(groupItems[0]?.status)
    }

    groups.push({
      key,
      label,
      items: groupItems,
      ...stats
    })
  }

  // Sort groups by priority
  return sortGroups(groups, mode)
}

/**
 * Calculate statistics for a group of items
 */
function calculateGroupStats(items: ExecutionItem[]) {
  const stats = calculateExecutionStats(items)
  return {
    total: stats.total,
    pending: stats.pending,
    running: stats.running,
    success: stats.success,
    error: stats.error,
    cancelled: stats.cancelled
  }
}

/**
 * Get human-readable status label
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    running: 'En cours',
    success: 'Réussi',
    error: 'Échoué',
    cancelled: 'Annulé'
  }
  return labels[status] || status
}

/**
 * Sort groups based on priority
 */
function sortGroups(groups: ExecutionGroup[], mode: GroupingMode): ExecutionGroup[] {
  if (mode === 'status') {
    // Status priority for display: running > pending > error > cancelled > success
    const order: Record<string, number> = { running: 1, pending: 2, error: 3, cancelled: 4, success: 5 }
    return groups.sort((a, b) => {
      const orderA = order[a.key] || 999
      const orderB = order[b.key] || 999
      return orderA - orderB
    })
  }

  // For flow and platform: sort by label alphabetically
  return groups.sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Get color configuration for a group based on its status composition
 */
export function getGroupColorConfig(group: ExecutionGroup) {
  // Priority: error > running > pending > success
  if (group.error > 0) {
    return {
      iconColor: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950',
      borderColor: 'border-red-200 dark:border-red-800',
      badgeColor: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
    }
  }
  if (group.running > 0) {
    return {
      iconColor: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-blue-200 dark:border-blue-800',
      badgeColor: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
    }
  }
  if (group.pending > 0) {
    return {
      iconColor: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
      borderColor: 'border-amber-200 dark:border-amber-800',
      badgeColor: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
    }
  }
  // All cancelled (neutral grey)
  if (group.cancelled > 0 && group.success === 0) {
    return {
      iconColor: 'text-neutral-600 dark:text-neutral-400',
      bgColor: 'bg-neutral-50 dark:bg-neutral-950',
      borderColor: 'border-neutral-200 dark:border-neutral-800',
      badgeColor: 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
    }
  }
  // All success
  return {
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
  }
}

/**
 * Format group stats for display
 */
export function formatGroupStats(group: ExecutionGroup): string {
  const parts: string[] = []

  if (group.running > 0) parts.push(`${group.running} en cours`)
  if (group.pending > 0) parts.push(`${group.pending} en attente`)
  if (group.error > 0) parts.push(`${group.error} erreur${group.error > 1 ? 's' : ''}`)
  if (group.success > 0) parts.push(`${group.success} réussi${group.success > 1 ? 's' : ''}`)
  if (group.cancelled > 0) parts.push(`${group.cancelled} annulé${group.cancelled > 1 ? 's' : ''}`)

  return parts.join(', ') || `${group.total} élément${group.total > 1 ? 's' : ''}`
}
