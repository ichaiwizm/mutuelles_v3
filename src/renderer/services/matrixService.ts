/**
 * Matrix Service
 * Functions for generating and validating execution matrices
 */

import type {
  ExecutionMatrix,
  ExecutionMatrixItem,
  ExecutionItem,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ProgressSummary,
  FlowOverrides
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
export function getLeadDisplayName(lead: any): string {
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
// Export service
// ============================================================================

export const matrixService = {
  generateMatrix,
  getLeadDisplayName,
  validateMatrix,
  calculateProgress
}
