/**
 * Hook for email-to-lead parsing and creation
 */

import { useState, useCallback } from 'react'
import { createLogger } from '../services/logger'
import type { EmailMessage } from '../../shared/types/email'
import type {
  EmailToLeadResponse,
  EnrichedLeadData,
  BulkLeadCreationResponse
} from '../../shared/types/emailParsing'
import { transformToCleanLead } from '@shared/utils/leadFormData'

interface UseEmailToLeadResult {
  // State
  isParsing: boolean
  isCreating: boolean
  enrichedLeads: EnrichedLeadData[]
  parseResult: EmailToLeadResponse | null
  createResult: BulkLeadCreationResponse | null
  error: string | null

  // Actions
  parseEmails: (emails: EmailMessage[]) => Promise<EmailToLeadResponse | null>
  createLeads: (leadsToCreate: EnrichedLeadData[]) => Promise<void>
  reset: () => void
}

export function useEmailToLead(): UseEmailToLeadResult {
  const log = createLogger('EmailToLeadHook')
  const [isParsing, setIsParsing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [enrichedLeads, setEnrichedLeads] = useState<EnrichedLeadData[]>([])
  const [parseResult, setParseResult] = useState<EmailToLeadResponse | null>(null)
  const [createResult, setCreateResult] = useState<BulkLeadCreationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Parse emails to extract lead data
   */
  const parseEmails = useCallback(async (emails: EmailMessage[]) => {
    log.debug('parseEmails: start', { count: emails?.length || 0 })
    setIsParsing(true)
    setError(null)
    setParseResult(null)
    setEnrichedLeads([])

    try {
      const result = await window.api.email.parseToLeads({ emails })
      log.debug('parseEmails: IPC returned', { success: result?.success, keys: Object.keys(result || {}) })

      if (!result.success) {
        throw new Error(result.error || 'Failed to parse emails')
      }

      const response = result.data as EmailToLeadResponse

      setParseResult(response)
      setEnrichedLeads(response.enrichedLeads)
      log.info('parseEmails: done', { total: response.total, valid: response.valid, partial: response.partial, invalid: response.invalid })
      return response
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      log.error('parseEmails: error', msg)
      setError(msg)
      return null
    } finally {
      setIsParsing(false)
    }
  }, [])

  /**
   * Create leads from enriched data
   */
  const createLeads = useCallback(async (leadsToCreate: EnrichedLeadData[]) => {
    log.debug('createLeads: start', { count: leadsToCreate?.length || 0 })
    setIsCreating(true)
    setError(null)
    setCreateResult(null)

    try {
      // Prepare leads for bulk creation
      const leadsPayload = leadsToCreate.map((enrichedLead) => ({
        // Convert flat dot-notation formData to canonical nested structure
        formData: transformToCleanLead(enrichedLead.formData),
        metadata: enrichedLead.metadata
      }))

      log.debug('createLeads: payload prepared', { sample: leadsPayload[0]?.formData ? Object.keys(leadsPayload[0].formData).slice(0, 5) : [], metadata: leadsPayload[0]?.metadata })
      const result = await window.api.leads.createBulk({ leads: leadsPayload })
      log.debug('createLeads: IPC returned', { success: result?.success, error: result?.error })

      if (!result.success) {
        throw new Error(result.error || 'Failed to create leads')
      }

      const response = result.data as BulkLeadCreationResponse

      setCreateResult(response)
      log.info('createLeads: done', { total: response.total, successful: response.successful, failed: response.failed })

      // Show notification
      // summarize via UI toasts elsewhere if needed
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      log.error('createLeads: error', msg)
      setError(msg)
    } finally {
      setIsCreating(false)
    }
  }, [])

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setIsParsing(false)
    setIsCreating(false)
    setEnrichedLeads([])
    setParseResult(null)
    setCreateResult(null)
    setError(null)
  }, [])

  return {
    isParsing,
    isCreating,
    enrichedLeads,
    parseResult,
    createResult,
    error,
    parseEmails,
    createLeads,
    reset
  }
}
