/**
 * Email to Lead Service
 *
 * Main orchestration service that:
 * 1. Parses emails to extract lead data
 * 2. Validates the parsed data
 * 3. Enriches with defaults
 * 4. Transforms to form data
 * 5. Prepares for preview/creation
 */

import type { EmailMessage } from '../shared/types/email'
import type {
  EmailToLeadResponse,
  EnrichedLeadData,
  ParsedLeadData
} from '../shared/types/emailParsing'

import { parserRegistry } from './emailParsing/ParserRegistry'
import { ParsedDataValidator } from './emailParsing/ParsedDataValidator'
import { DataEnricher } from './emailParsing/DataEnricher'
import { LeadTransformer } from './emailParsing/LeadTransformer'

export class EmailToLeadService {
  /**
   * Parse emails and prepare leads for creation
   */
  static async parseEmailsToLeads(emails: EmailMessage[]): Promise<EmailToLeadResponse> {
    console.log(`[EmailToLeadService] Processing ${emails.length} emails`)

    const enrichedLeads: EnrichedLeadData[] = []
    const errors: Array<{ emailId: string; error: string }> = []
    let valid = 0
    let partial = 0
    let invalid = 0

    for (const email of emails) {
      try {
        const enrichedLead = await this.processEmail(email)

        if (enrichedLead.validationStatus === 'valid') {
          valid++
        } else if (enrichedLead.validationStatus === 'partial') {
          partial++
        } else {
          invalid++
        }

        enrichedLeads.push(enrichedLead)
      } catch (error) {
        console.error(`[EmailToLeadService] Error processing email ${email.id}:`, error)
        errors.push({
          emailId: email.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        invalid++
      }
    }

    console.log(`[EmailToLeadService] Results: ${valid} valid, ${partial} partial, ${invalid} invalid`)

    return {
      total: emails.length,
      valid,
      partial,
      invalid,
      enrichedLeads,
      errors
    }
  }

  /**
   * Process a single email through the complete pipeline
   */
  private static async processEmail(email: EmailMessage): Promise<EnrichedLeadData> {
    // Step 1: Parse email to extract lead data
    const parsingResult = parserRegistry.parse(email)

    if (!parsingResult.success || !parsingResult.parsedData) {
      throw new Error(parsingResult.errors.join(', ') || 'Failed to parse email')
    }

    let parsedData = parsingResult.parsedData

    // Step 2: Apply business rules
    DataEnricher.applyBusinessRules(parsedData)

    // Step 3: Enrich with defaults
    const { enrichedData, defaultedFields } = DataEnricher.enrich(parsedData)
    parsedData = enrichedData

    // Step 4: Validate
    const validationResult = ParsedDataValidator.validate(parsedData)

    // Step 5: Transform to form data
    const formData = LeadTransformer.toFormData(parsedData)

    // Step 6: Collect metadata
    const parsedFields = LeadTransformer.getParsedFields(parsedData)
    const confidenceScore = LeadTransformer.getConfidenceScore(parsedData)

    // Step 7: Create enriched lead data
    const enrichedLead: EnrichedLeadData = {
      parsedData,
      validationStatus: validationResult.status,
      missingRequiredFields: validationResult.missingRequiredFields,
      defaultedFields,
      formData,
      metadata: {
        source: 'email',
        emailId: email.id,
        parserUsed: parsedData.metadata.parserUsed,
        parsingConfidence: confidenceScore,
        parsedFields,
        defaultedFields,
        warnings: [
          ...parsedData.metadata.warnings,
          ...validationResult.warnings
        ]
      }
    }

    return enrichedLead
  }

  /**
   * Get statistics about parser performance
   */
  static getParserStats() {
    return parserRegistry.getStats()
  }

  /**
   * Reset parser statistics
   */
  static resetParserStats() {
    parserRegistry.resetStats()
  }
}
