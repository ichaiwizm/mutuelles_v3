/**
 * Automation Service
 * Formatting utilities for automation execution
 * For matrix operations, see matrixService.ts
 */

import {
  generateMatrix,
  validateMatrix,
  calculateProgress,
  getLeadDisplayName,
  matrixService
} from './matrixService'

// Re-export matrix functions for backward compatibility
export {
  generateMatrix,
  validateMatrix,
  calculateProgress,
  getLeadDisplayName,
  matrixService
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format duration in milliseconds to human-readable string
 * Re-exported from dateGrouping for backward compatibility
 */
export { formatDuration } from '../utils/dateGrouping'

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
// Export service
// ============================================================================

export const automationService = {
  // Matrix operations (re-exported from matrixService)
  generateMatrix,
  validateMatrix,
  calculateProgress,
  // Formatting
  formatDuration,
  formatTimestamp,
  formatRelativeTime
}
