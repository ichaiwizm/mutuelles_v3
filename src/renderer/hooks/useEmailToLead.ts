/**
 * Hook for email-to-lead parsing and creation
 */

import { useState, useCallback } from 'react'
import type { EmailMessage } from '../../shared/types/email'
import type {
  EmailToLeadResponse,
  EnrichedLeadData,
  BulkLeadCreationResponse
} from '../../shared/types/emailParsing'

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
    setIsParsing(true)
    setError(null)
    setParseResult(null)
    setEnrichedLeads([])

    try {
      // parsing started

      const result = await window.api.email.parseToLeads({ emails })

      if (!result.success) {
        throw new Error(result.error || 'Failed to parse emails')
      }

      const response = result.data as EmailToLeadResponse

      // parsing complete

      setParseResult(response)
      setEnrichedLeads(response.enrichedLeads)
      return response
    } catch (err) {
      // parse error
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    } finally {
      setIsParsing(false)
    }
  }, [])

  /**
   * Create leads from enriched data
   */
  const createLeads = useCallback(async (leadsToCreate: EnrichedLeadData[]) => {
    setIsCreating(true)
    setError(null)
    setCreateResult(null)

    try {
      // creating leads

      // Prepare leads for bulk creation
      const leadsPayload = leadsToCreate.map((enrichedLead) => ({
        formData: enrichedLead.formData,
        metadata: enrichedLead.metadata
      }))

      const result = await window.api.leads.createBulk({ leads: leadsPayload })

      if (!result.success) {
        throw new Error(result.error || 'Failed to create leads')
      }

      const response = result.data as BulkLeadCreationResponse

      // creation complete

      setCreateResult(response)

      // Show notification
      // summarize via UI toasts elsewhere if needed
    } catch (err) {
      // create error
      setError(err instanceof Error ? err.message : 'Unknown error')
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
