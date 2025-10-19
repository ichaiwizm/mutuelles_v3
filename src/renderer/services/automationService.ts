/**
 * Automation Service
 * Utility functions for automation execution, validation, and formatting
 */

import type {
  ExecutionMatrix,
  ExecutionMatrixItem,
  ExecutionItem,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ProgressSummary,
  FlowOverrides,
  ExecutionItemStatus
} from '../../shared/types/automation'

// ============================================================================
// Matrix Generation
// ============================================================================

/**
 * Generate execution matrix from lead and platform selections
 */
export function generateMatrix(
  leads: any[],
  leadIds: string[],
  platforms: any[],
  platformSlugs: string[],
  flowOverrides?: FlowOverrides
): ExecutionMatrix {
  const items: ExecutionMatrixItem[] = []

  // Filter selected leads
  const selectedLeads = leads.filter(lead => leadIds.includes(lead.id))

  // Filter selected platforms
  const selectedPlatforms = platforms.filter(platform =>
    platformSlugs.includes(platform.slug)
  )

  // Generate cartesian product: leads × platforms
  for (const lead of selectedLeads) {
    for (const platform of selectedPlatforms) {
      const flowSlug = flowOverrides?.get(platform.slug)

      items.push({
        id: `${lead.id}_${platform.slug}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        leadId: lead.id,
        leadName: getLeadDisplayName(lead),
        platform: platform.slug,
        platformName: platform.name,
        flowSlug,
        flowName: flowSlug ? flowSlug : undefined,
        priority: 0
      })
    }
  }

  return {
    items,
    createdAt: new Date().toISOString(),
    totalCount: items.length
  }
}

/**
 * Get display name for a lead
 */
function getLeadDisplayName(lead: any): string {
  if (!lead.data) return lead.id

  const subscriber = lead.data.subscriber
  if (!subscriber) return lead.id

  const firstName = subscriber.firstName || subscriber.first_name || ''
  const lastName = subscriber.lastName || subscriber.last_name || ''

  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  }

  return firstName || lastName || lead.id
}

// ============================================================================
// Matrix Validation
// ============================================================================

/**
 * Validate execution matrix before starting
 */
export function validateMatrix(
  matrix: ExecutionMatrix,
  platforms: any[],
  flows: any[]
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  for (const item of matrix.items) {
    // Check platform exists
    const platform = platforms.find(p => p.slug === item.platform)
    if (!platform) {
      errors.push({
        itemId: item.id,
        leadId: item.leadId,
        platform: item.platform,
        reason: 'Platform not found',
        details: `Platform "${item.platform}" does not exist or is not selected`
      })
      continue
    }

    // Check platform has credentials
    if (!platform.has_creds) {
      errors.push({
        itemId: item.id,
        leadId: item.leadId,
        platform: item.platform,
        reason: 'Missing credentials',
        details: `Platform "${item.platformName}" has no credentials configured`
      })
    }

    // Check flow exists (if specified)
    if (item.flowSlug) {
      const platformFlows = flows.find((f: any) => f.platform === item.platform)
      if (!platformFlows) {
        warnings.push({
          itemId: item.id,
          leadId: item.leadId,
          platform: item.platform,
          message: `No flows found for platform "${item.platformName}". Default flow will be used.`
        })
      } else {
        const flowExists = platformFlows.flows.some((f: { slug: string }) => f.slug === item.flowSlug)
        if (!flowExists) {
          warnings.push({
            itemId: item.id,
            leadId: item.leadId,
            platform: item.platform,
            message: `Flow "${item.flowSlug}" not found. Default flow will be used.`
          })
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// ============================================================================
// Progress Calculation
// ============================================================================

/**
 * Calculate execution progress from items
 */
export function calculateProgress(items: ExecutionItem[]): ProgressSummary {
  const total = items.length
  const completed = items.filter(
    item => item.status === 'success' || item.status === 'error' || item.status === 'skipped'
  ).length
  const successCount = items.filter(item => item.status === 'success').length
  const errorCount = items.filter(item => item.status === 'error').length
  const pendingCount = items.filter(item => item.status === 'pending').length
  const runningCount = items.filter(item => item.status === 'running').length

  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    successCount,
    errorCount,
    pendingCount,
    runningCount
  }
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }

  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`
  }

  return `${hours}h`
}

/**
 * Get status badge color
 */
export function getStatusColor(status: ExecutionItemStatus | string): string {
  switch (status) {
    case 'success':
      return 'green'
    case 'error':
      return 'red'
    case 'running':
      return 'blue'
    case 'pending':
      return 'gray'
    case 'skipped':
      return 'yellow'
    default:
      return 'gray'
  }
}

/**
 * Get status label
 */
export function getStatusLabel(status: ExecutionItemStatus | string): string {
  switch (status) {
    case 'success':
      return 'Success'
    case 'error':
      return 'Error'
    case 'running':
      return 'Running'
    case 'pending':
      return 'Pending'
    case 'skipped':
      return 'Skipped'
    default:
      return status
  }
}

/**
 * Format timestamp to local time
 */
export function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    return date.toLocaleString()
  } catch {
    return timestamp
  }
}

/**
 * Format timestamp to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) {
      return 'Just now'
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else {
      return formatTimestamp(timestamp)
    }
  } catch {
    return timestamp
  }
}

// ============================================================================
// Export grouped service
// ============================================================================

export const automationService = {
  generateMatrix,
  validateMatrix,
  calculateProgress,
  formatDuration,
  formatTimestamp,
  formatRelativeTime,
  getStatusColor,
  getStatusLabel
}
