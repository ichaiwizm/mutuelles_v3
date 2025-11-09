/**
 * Email to Lead Service - NOUVEAU avec leadParsing refactorisé
 *
 * Orchestre :
 * 1. Parsing des emails (via ParserOrchestrator)
 * 2. Validation des données
 * 3. Enrichissement avec defaults
 * 4. Transformation pour formulaire
 * 5. Génération de rapport debug
 */

import type { EmailMessage } from '../../shared/types/email'
import type {
  EmailToLeadResponse,
  EnrichedLeadData
} from '../../shared/types/emailParsing'
import type { ParsedLeadData } from '../../shared/types/emailParsing'

import { parserOrchestrator, ParsingDebugger } from './leadParsing'
import { ParsedDataValidator } from './leadParsing/ParsedDataValidator'
import { DataEnricher } from './leadParsing/DataEnricher'
import { LeadTransformer } from './leadParsing/LeadTransformer'
import { createLogger } from './logger'

const logger = createLogger('EmailToLead')

// Store debug reports globally for UI access
const debugReports = new Map<string, string>()

export class EmailToLeadService {
  /**
   * Parse emails and prepare leads for creation
   */
  static async parseEmailsToLeads(emails: EmailMessage[]): Promise<EmailToLeadResponse> {
    logger.debug(`[EmailToLeadService] Processing ${emails.length} emails`)

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
        logger.error(`[EmailToLeadService] Error processing email ${email.id}:`, error)
        errors.push({
          emailId: email.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        invalid++
      }
    }

    logger.debug(`[EmailToLeadService] Results: ${valid} valid, ${partial} partial, ${invalid} invalid`)

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
    // Step 1: Parse email avec orchestration (nettoyage + détection + parsing + debug)
    const orchestrationResult = parserOrchestrator.parse(
      email.content,
      email.id,
      false // isHtml - détection automatique dans ContentCleaner
    )

    // Sauvegarder le rapport de debug pour accès UI
    const debugMarkdown = ParsingDebugger.toMarkdown(orchestrationResult.debugReport)
    debugReports.set(email.id, debugMarkdown)

    if (!orchestrationResult.finalResult.success || !orchestrationResult.finalResult.parsedData) {
      throw new Error(orchestrationResult.finalResult.errors.join(', ') || 'Failed to parse email')
    }

    let parsedData = orchestrationResult.finalResult.parsedData

    // Step 2: Enrich with defaults and computed values (unified)
    // The new DataEnricher.enrich() applies both defaults and business rules
    const { enrichedData, defaultedFields, computedFields } = DataEnricher.enrich(parsedData as any)
    parsedData = enrichedData as any

    // Step 4: Validate
    const validationResult = ParsedDataValidator.validate(parsedData)

    // Step 5: Transform to form data
    const formData = LeadTransformer.toFormData(parsedData as any)

    // Step 6: Collect metadata
    const parsedFields = LeadTransformer.getParsedFields(parsedData as any)
    const confidenceScore = LeadTransformer.getConfidenceScore(parsedData as any)

    // Step 7: Create enriched lead data
    const enrichedLead: EnrichedLeadData = {
      parsedData: parsedData as any, // Type compatibility: both ParsedLeadData types are structurally identical
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
   * Parse raw text to lead (for smart add feature)
   * Reuses the same pipeline as email parsing but accepts raw text directly
   */
  static async parseRawText(rawText: string): Promise<EnrichedLeadData> {
    const sourceId = `raw-text-${Date.now()}`

    // Step 1: Parse text avec orchestration (nettoyage + détection + parsing + debug)
    const orchestrationResult = parserOrchestrator.parse(
      rawText,
      sourceId,
      false // isHtml - détection automatique dans ContentCleaner
    )

    // Sauvegarder le rapport de debug pour accès UI
    const debugMarkdown = ParsingDebugger.toMarkdown(orchestrationResult.debugReport)
    debugReports.set(sourceId, debugMarkdown)

    if (!orchestrationResult.finalResult.success || !orchestrationResult.finalResult.parsedData) {
      throw new Error(orchestrationResult.finalResult.errors.join(', ') || 'Failed to parse text')
    }

    let parsedData = orchestrationResult.finalResult.parsedData

    // Step 2: Enrich with defaults and computed values (unified)
    const { enrichedData, defaultedFields, computedFields } = DataEnricher.enrich(parsedData)
    parsedData = enrichedData

    // Step 3: Validate
    const validationResult = ParsedDataValidator.validate(parsedData)

    // Step 4: Transform to form data
    const formData = LeadTransformer.toFormData(parsedData)

    // Step 5: Collect metadata
    const parsedFields = LeadTransformer.getParsedFields(parsedData)
    const confidenceScore = LeadTransformer.getConfidenceScore(parsedData)

    // Step 6: Create enriched lead data
    const enrichedLead: EnrichedLeadData = {
      parsedData: parsedData as any,
      validationStatus: validationResult.status,
      missingRequiredFields: validationResult.missingRequiredFields,
      defaultedFields,
      formData,
      metadata: {
        source: 'manual', // Changed from 'email' to 'manual' to distinguish smart add
        emailId: sourceId,
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
   * Récupère le rapport de debug pour un email
   */
  static getDebugReport(emailId: string): string | undefined {
    return debugReports.get(emailId)
  }

  /**
   * Récupère tous les rapports de debug (pour copie globale)
   */
  static getAllDebugReports(): Map<string, string> {
    return debugReports
  }

  /**
   * Nettoie les rapports de debug
   */
  static clearDebugReports(): void {
    debugReports.clear()
  }

  /**
   * Get statistics about parser performance
   */
  static getParserStats() {
    return {
      registeredParsers: parserOrchestrator.listParsers()
    }
  }

  /**
   * Reset parser statistics
   */
  static resetParserStats() {
    debugReports.clear()
  }
}
