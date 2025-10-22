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

// ============================================================================
// Export service
// ============================================================================

export const automationService = {
  // Matrix operations (re-exported from matrixService)
  generateMatrix,
  validateMatrix,
  calculateProgress,
  // Formatting
  formatDuration
}
