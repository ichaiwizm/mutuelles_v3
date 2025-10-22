/**
 * Service for calculating lead status badges
 * Determines which badge to display based on priority:
 * Doublon > Échec > Incomplet > Nouveau
 */

import type { Lead } from '../../shared/types/leads'
import type { RunHistoryItem, ExecutionHistoryItem } from '../../shared/types/automation'

export type LeadStatusType = 'duplicate' | 'error' | 'incomplete' | 'new' | 'none'

export interface LeadStatus {
  type: LeadStatusType
  label: string
  tooltip: string
  icon: string
  color: string
}

/**
 * Calculate lead status based on history and selected flows
 */
export function calculateLeadStatus(
  lead: Lead,
  selectedFlowSlugs: string[],
  runHistory: RunHistoryItem[]
): LeadStatus {
  // Priority 1: Check for duplicates (Lead × Flow in last 30 days)
  const duplicate = checkDuplicate(lead.id, selectedFlowSlugs, runHistory)
  if (duplicate) {
    return duplicate
  }

  // Priority 2: Check for recent errors
  const error = checkRecentError(lead.id, runHistory)
  if (error) {
    return error
  }

  // Priority 3: Check if lead is incomplete
  const incomplete = checkIncomplete(lead)
  if (incomplete) {
    return incomplete
  }

  // Priority 4: Check if lead is new (never submitted)
  const isNew = checkIsNew(lead.id, runHistory)
  if (isNew) {
    return {
      type: 'new',
      label: 'Nouveau',
      tooltip: 'Ce lead n\'a jamais été soumis',
      icon: '⭐',
      color: 'text-blue-600 dark:text-blue-400'
    }
  }

  // No badge needed
  return {
    type: 'none',
    label: '',
    tooltip: '',
    icon: '',
    color: ''
  }
}

/**
 * Check if lead is a duplicate for any selected flow (30 days)
 */
function checkDuplicate(
  leadId: string,
  selectedFlowSlugs: string[],
  runHistory: RunHistoryItem[]
): LeadStatus | null {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Flatten all history items - defensive filtering
  const allItems: ExecutionHistoryItem[] = runHistory
    .filter(run => Array.isArray(run.items))
    .flatMap(run => run.items)

  // Find most recent submission for this lead × selected flows
  const duplicates = allItems.filter(item => {
    // Defensive: skip items without startedAt
    if (!item.startedAt) return false

    const itemDate = new Date(item.startedAt)
    return (
      item.leadId === leadId &&
      selectedFlowSlugs.includes(item.flowSlug) &&
      itemDate >= thirtyDaysAgo
    )
  })

  if (duplicates.length === 0) {
    return null
  }

  // Find most recent duplicate
  const mostRecent = duplicates.reduce((latest, item) => {
    // Defensive: ensure both have startedAt before comparing
    if (!item.startedAt || !latest.startedAt) return latest
    return new Date(item.startedAt) > new Date(latest.startedAt) ? item : latest
  })

  // Defensive: ensure mostRecent has startedAt
  if (!mostRecent.startedAt) {
    return null
  }

  const daysAgo = Math.floor(
    (Date.now() - new Date(mostRecent.startedAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  return {
    type: 'duplicate',
    label: 'Doublon',
    tooltip: `Déjà soumis il y a ${daysAgo}j sur ${mostRecent.flowName}`,
    icon: '🔄',
    color: 'text-orange-600 dark:text-orange-400'
  }
}

/**
 * Check if lead has recent errors
 */
function checkRecentError(
  leadId: string,
  runHistory: RunHistoryItem[]
): LeadStatus | null {
  // Find most recent error for this lead - defensive filtering
  const allItems: ExecutionHistoryItem[] = runHistory
    .filter(run => Array.isArray(run.items))
    .flatMap(run => run.items)

  const errors = allItems.filter(item =>
    item.leadId === leadId && item.status === 'error' && item.startedAt  // Defensive: ensure startedAt exists
  )

  if (errors.length === 0) {
    return null
  }

  // Get most recent error
  const mostRecent = errors.reduce((latest, item) => {
    // Defensive: ensure both have startedAt before comparing
    if (!item.startedAt || !latest.startedAt) return latest
    return new Date(item.startedAt) > new Date(latest.startedAt) ? item : latest
  })

  // Defensive: ensure mostRecent has startedAt
  if (!mostRecent.startedAt) {
    return null
  }

  const count = errors.length
  const daysAgo = Math.floor(
    (Date.now() - new Date(mostRecent.startedAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  return {
    type: 'error',
    label: 'Échec récent',
    tooltip: count > 1
      ? `Échoué ${count}x, dernière fois il y a ${daysAgo}j`
      : `Échoué il y a ${daysAgo}j`,
    icon: '❌',
    color: 'text-red-600 dark:text-red-400'
  }
}

/**
 * Check if lead has missing required fields
 */
function checkIncomplete(lead: Lead): LeadStatus | null {
  const subscriber = lead.data?.subscriber || {}

  // Required fields for most flows
  const requiredFields = {
    lastName: subscriber.lastName,
    firstName: subscriber.firstName,
    birthDate: subscriber.birthDate,
    email: subscriber.email
  }

  const missingFields = Object.entries(requiredFields)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missingFields.length === 0) {
    return null
  }

  return {
    type: 'incomplete',
    label: 'Incomplet',
    tooltip: `Champs manquants: ${missingFields.join(', ')}`,
    icon: '⚠️',
    color: 'text-amber-600 dark:text-amber-400'
  }
}

/**
 * Check if lead has never been submitted
 */
function checkIsNew(leadId: string, runHistory: RunHistoryItem[]): boolean {
  // Defensive filtering
  const allItems: ExecutionHistoryItem[] = runHistory
    .filter(run => Array.isArray(run.items))
    .flatMap(run => run.items)
  return !allItems.some(item => item.leadId === leadId)
}
