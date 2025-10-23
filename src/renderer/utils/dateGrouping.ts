import type { RunHistoryItem } from '../../shared/types/automation'

export type DateGroupKey = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'older'

export interface DateGroup {
  key: DateGroupKey
  label: string
  runs: RunHistoryItem[]
}

/**
 * Get the date group key for a given date string
 *
 * Categorizes a date into one of the following groups:
 * - today: Same calendar day as today
 * - yesterday: Previous calendar day
 * - thisWeek: Within the last 7 days (excluding today and yesterday)
 * - thisMonth: Within the last 30 days (excluding this week)
 * - older: More than 30 days ago
 *
 * @param dateString - ISO 8601 date string (e.g., "2025-10-20T10:30:00.000Z")
 * @returns Date group key
 *
 * @example
 * ```typescript
 * const group = getDateGroup("2025-10-20T10:30:00.000Z")
 * // Returns: 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'older'
 * ```
 */
export function getDateGroup(dateString: string | null | undefined): DateGroupKey {
  // Defensive: handle null/undefined dates
  if (!dateString) {
    return 'older'
  }

  const date = new Date(dateString)
  const now = new Date()

  // Reset time to compare dates only
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const diffTime = today.getTime() - compareDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'today'
  } else if (diffDays === 1) {
    return 'yesterday'
  } else if (diffDays < 7) {
    return 'thisWeek'
  } else if (diffDays < 30) {
    return 'thisMonth'
  } else {
    return 'older'
  }
}

/**
 * Get a human-readable French label for a date group
 *
 * @param key - The date group key
 * @returns Localized label in French
 */
export function getDateGroupLabel(key: DateGroupKey): string {
  switch (key) {
    case 'today':
      return "Aujourd'hui"
    case 'yesterday':
      return 'Hier'
    case 'thisWeek':
      return 'Cette semaine'
    case 'thisMonth':
      return 'Ce mois'
    case 'older':
      return 'Plus ancien'
  }
}

/**
 * Group runs by date ranges (today, yesterday, this week, etc.)
 *
 * Organizes an array of run history items into date-based groups.
 * Groups are ordered from most recent to oldest, and empty groups are excluded.
 *
 * @param runs - Array of run history items to group
 * @returns Array of date groups with runs sorted by most recent first
 *
 * @example
 * ```typescript
 * const groups = groupRunsByDate(myRuns)
 * // Returns:
 * // [
 * //   { key: 'today', label: "Aujourd'hui", runs: [...] },
 * //   { key: 'yesterday', label: 'Hier', runs: [...] },
 * //   { key: 'thisWeek', label: 'Cette semaine', runs: [...] }
 * // ]
 * ```
 */
export function groupRunsByDate(runs: RunHistoryItem[]): DateGroup[] {
  const groups: Record<DateGroupKey, RunHistoryItem[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    older: []
  }

  // Group runs - filter out invalid runs with missing data
  runs.forEach(run => {
    // Defensive: skip runs with invalid structure
    if (!run || !run.runId) return

    const group = getDateGroup(run.startedAt)
    groups[group].push(run)
  })

  // Convert to array format, filtering out empty groups
  const result: DateGroup[] = []
  const order: DateGroupKey[] = ['today', 'yesterday', 'thisWeek', 'thisMonth', 'older']

  order.forEach(key => {
    if (groups[key].length > 0) {
      result.push({
        key,
        label: getDateGroupLabel(key),
        runs: groups[key]
      })
    }
  })

  return result
}

/**
 * Format a duration in milliseconds into a human-readable French string
 *
 * Displays durations intelligently:
 * - Less than 1 minute: "Xs"
 * - Less than 1 hour: "Xm Ys"
 * - 1 hour or more: "Xh Ym" or "Xh" (if no minutes)
 *
 * @param durationMs - Duration in milliseconds
 * @returns Formatted duration string
 *
 * @example
 * ```typescript
 * formatDuration(5000)      // "5s"
 * formatDuration(125000)    // "2m 5s"
 * formatDuration(3665000)   // "1h 1m"
 * formatDuration(3600000)   // "1h"
 * ```
 */
export function formatDuration(durationMs: number | null | undefined): string {
  // Defensive: handle null/undefined durations
  if (durationMs == null) {
    return '-'
  }

  const seconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    const remainingMinutes = minutes % 60
    const remainingSeconds = seconds % 60
    if (remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}m`
    }
    return `${hours}h`
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  } else {
    return `${seconds}s`
  }
}

/**
 * Format a date as a relative time string in French (e.g., "Il y a 2h")
 *
 * @param dateString - ISO 8601 date string
 * @returns Relative time string in French
 *
 * @example
 * ```typescript
 * formatRelativeTime("2025-10-20T08:30:00Z") // "Il y a 2h"
 * formatRelativeTime("2025-10-19T10:00:00Z") // "Hier"
 * formatRelativeTime("2025-10-15T10:00:00Z") // "15 oct"
 * ```
 */
export function formatRelativeTime(dateString: string | null | undefined): string {
  // Defensive: handle null/undefined dates
  if (!dateString) {
    return '-'
  }

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) {
    return "À l'instant"
  } else if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} min`
  } else if (diffHours < 24) {
    return `Il y a ${diffHours}h`
  } else if (diffDays === 1) {
    return 'Hier'
  } else if (diffDays < 7) {
    return `Il y a ${diffDays} jours`
  } else {
    // Format as date
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }
}

/**
 * Format a full date and time
 */
export function formatDateTime(dateString: string | null | undefined): string {
  // Defensive: handle null/undefined dates
  if (!dateString) {
    return '-'
  }

  const date = new Date(dateString)
  return date.toLocaleString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
