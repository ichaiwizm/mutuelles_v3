/**
 * Service for detecting duplicate Lead × Flow submissions
 * Checks if selected leads have been submitted on selected flows in the last 30 days
 */

import type { RunHistoryItem, ExecutionHistoryItem } from '../../shared/types/automation'

export interface DuplicateInfo {
  leadId: string
  leadName: string
  flowSlug: string
  flowName: string
  lastSubmittedAt: string
  daysAgo: number
  status: 'success' | 'error' | 'pending'
}

export interface DuplicateDetectionResult {
  hasDuplicates: boolean
  duplicates: DuplicateInfo[]
  affectedLeadIds: Set<string>
  affectedFlowSlugs: Set<string>
}

/**
 * Detect duplicates in selected leads × flows (30 days window)
 */
export function detectDuplicates(
  selectedLeadIds: string[],
  selectedFlowSlugs: string[],
  runHistory: RunHistoryItem[],
  getLeadName: (leadId: string) => string
): DuplicateDetectionResult {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Flatten all history items
  const allItems: ExecutionHistoryItem[] = runHistory.flatMap(run => run.items)

  // Find duplicates
  const duplicates: DuplicateInfo[] = []
  const affectedLeadIds = new Set<string>()
  const affectedFlowSlugs = new Set<string>()

  for (const leadId of selectedLeadIds) {
    for (const flowSlug of selectedFlowSlugs) {
      // Find submissions for this Lead × Flow in last 30 days
      const submissions = allItems.filter(item => {
        const itemDate = new Date(item.startedAt)
        return (
          item.leadId === leadId &&
          item.flowSlug === flowSlug &&
          itemDate >= thirtyDaysAgo
        )
      })

      if (submissions.length > 0) {
        // Get most recent submission
        const mostRecent = submissions.reduce((latest, item) => {
          return new Date(item.startedAt) > new Date(latest.startedAt) ? item : latest
        })

        const daysAgo = Math.floor(
          (Date.now() - new Date(mostRecent.startedAt).getTime()) / (1000 * 60 * 60 * 24)
        )

        duplicates.push({
          leadId,
          leadName: getLeadName(leadId),
          flowSlug,
          flowName: mostRecent.flowName,
          lastSubmittedAt: mostRecent.startedAt,
          daysAgo,
          status: mostRecent.status
        })

        affectedLeadIds.add(leadId)
        affectedFlowSlugs.add(flowSlug)
      }
    }
  }

  return {
    hasDuplicates: duplicates.length > 0,
    duplicates,
    affectedLeadIds,
    affectedFlowSlugs
  }
}

/**
 * Format duplicate summary text
 */
export function formatDuplicateSummary(duplicates: DuplicateInfo[]): string {
  if (duplicates.length === 0) {
    return ''
  }

  if (duplicates.length === 1) {
    const dup = duplicates[0]
    return `1 doublon détecté : ${dup.leadName} sur ${dup.flowName} (il y a ${dup.daysAgo}j)`
  }

  // Find most recent duplicate
  const mostRecent = duplicates.reduce((latest, dup) => {
    return dup.daysAgo < latest.daysAgo ? dup : latest
  })

  return `${duplicates.length} doublons détectés (dernière soumission il y a ${mostRecent.daysAgo}j)`
}

/**
 * Exclude duplicates from selection
 * Returns new selectedLeadIds and selectedFlowSlugs without duplicates
 */
export function excludeDuplicates(
  selectedLeadIds: Set<string>,
  selectedFlowSlugs: Set<string>,
  duplicates: DuplicateInfo[]
): {
  leadIds: Set<string>
  flowSlugs: Set<string>
  excludedCount: number
} {
  const newLeadIds = new Set(selectedLeadIds)
  const newFlowSlugs = new Set(selectedFlowSlugs)

  // Remove Lead × Flow combinations that are duplicates
  // Strategy: Remove the lead from selection if ALL its selected flows are duplicates
  const leadFlowMap = new Map<string, Set<string>>()

  // Build map of leadId -> flowSlugs
  for (const dup of duplicates) {
    if (!leadFlowMap.has(dup.leadId)) {
      leadFlowMap.set(dup.leadId, new Set())
    }
    leadFlowMap.get(dup.leadId)!.add(dup.flowSlug)
  }

  let excludedCount = 0

  // For each lead, check if all selected flows are duplicates
  for (const [leadId, duplicateFlows] of leadFlowMap.entries()) {
    const leadSelectedFlows = Array.from(selectedFlowSlugs).filter(flowSlug =>
      duplicateFlows.has(flowSlug)
    )

    // If all selected flows for this lead are duplicates, remove the lead
    if (leadSelectedFlows.length === selectedFlowSlugs.size) {
      newLeadIds.delete(leadId)
      excludedCount++
    }
  }

  return {
    leadIds: newLeadIds,
    flowSlugs: newFlowSlugs,
    excludedCount
  }
}
