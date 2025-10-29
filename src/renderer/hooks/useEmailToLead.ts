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
  parseEmails: (emails: EmailMessage[]) => Promise<void>
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
      console.log(`[useEmailToLead] Parsing ${emails.length} emails...`)

      const result = await window.api.email.parseToLeads({ emails })

      if (!result.success) {
        throw new Error(result.error || 'Failed to parse emails')
      }

      const response = result.data as EmailToLeadResponse

      console.log(
        `[useEmailToLead] Parsing complete: ${response.valid} valid, ${response.partial} partial, ${response.invalid} invalid`
      )

      setParseResult(response)
      setEnrichedLeads(response.enrichedLeads)
    } catch (err) {
      console.error('[useEmailToLead] Parse error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
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
      console.log(`[useEmailToLead] Creating ${leadsToCreate.length} leads...`)

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

      console.log(
        `[useEmailToLead] Creation complete: ${response.successful} successful, ${response.failed} failed`
      )

      setCreateResult(response)

      // Show notification
      if (response.successful > 0) {
        console.log(`✅ ${response.successful} lead(s) créé(s) avec succès`)
      }

      if (response.failed > 0) {
        console.warn(`⚠️ ${response.failed} lead(s) ont échoué`)
      }
    } catch (err) {
      console.error('[useEmailToLead] Create error:', err)
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
