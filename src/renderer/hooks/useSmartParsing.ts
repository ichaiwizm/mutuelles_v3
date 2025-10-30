/**
 * Hook for smart lead parsing from raw text
 */

import { useState, useCallback } from 'react'
import type { EnrichedLeadData } from '../../shared/types/emailParsing'

interface UseSmartParsingResult {
  // State
  isParsing: boolean
  enrichedLead: EnrichedLeadData | null
  error: string | null

  // Actions
  parseText: (rawText: string) => Promise<EnrichedLeadData | null>
  reset: () => void
}

export function useSmartParsing(): UseSmartParsingResult {
  const [isParsing, setIsParsing] = useState(false)
  const [enrichedLead, setEnrichedLead] = useState<EnrichedLeadData | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Parse raw text to extract lead data
   */
  const parseText = useCallback(async (rawText: string) => {
    setIsParsing(true)
    setError(null)
    setEnrichedLead(null)

    try {
      const result = await window.api.leads.parseRawText(rawText)

      if (!result.success) {
        throw new Error(result.error || 'Échec du parsing')
      }

      const enriched = result.data as EnrichedLeadData
      setEnrichedLead(enriched)
      return enriched
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(errorMessage)
      return null
    } finally {
      setIsParsing(false)
    }
  }, [])

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setIsParsing(false)
    setEnrichedLead(null)
    setError(null)
  }, [])

  return {
    isParsing,
    enrichedLead,
    error,
    parseText,
    reset
  }
}
