/**
 * Base abstract class for email parsers
 */

import type { EmailMessage } from '../../shared/types/email'
import type {
  ParsedLeadData,
  EmailParsingResult,
  ParsedField
} from '../../shared/types/emailParsing'
import type { IEmailParser, ParserDetectionResult } from './types'
import { FieldExtractor } from './FieldExtractor'

export abstract class BaseEmailParser implements IEmailParser {
  abstract readonly name: string
  abstract readonly priority: number

  /**
   * Check if this parser can handle the email
   * Subclasses should implement this with specific detection logic
   */
  abstract canParse(email: EmailMessage): boolean

  /**
   * Perform detection with confidence level
   * Override this for more sophisticated detection
   */
  protected detectWithConfidence(email: EmailMessage): ParserDetectionResult {
    return {
      canParse: this.canParse(email),
      confidence: 'medium'
    }
  }

  /**
   * Parse the email to extract lead data
   * This is the main method that subclasses must implement
   */
  abstract parse(email: EmailMessage): EmailParsingResult

  /**
   * Helper: Create a successful parsing result
   */
  protected createSuccessResult(
    email: EmailMessage,
    parsedData: ParsedLeadData
  ): EmailParsingResult {
    return {
      success: true,
      emailId: email.id,
      parsedData,
      errors: [],
      warnings: []
    }
  }

  /**
   * Helper: Create a failed parsing result
   */
  protected createFailureResult(email: EmailMessage, error: string): EmailParsingResult {
    return {
      success: false,
      emailId: email.id,
      errors: [error],
      warnings: []
    }
  }

  /**
   * Helper: Extract common fields using FieldExtractor
   */
  protected extractCommonFields(content: string): Partial<ParsedLeadData['subscriber']> {
    // ✅ FIXED: Clean content before extraction
    const prepared = FieldExtractor.prepareContent(content)
    const cleanContent = prepared.text

    const identity = FieldExtractor.extractIdentity(cleanContent)
    const contact = FieldExtractor.extractContactInfo(cleanContent)
    const professional = FieldExtractor.extractProfessionalInfo(cleanContent)

    const result: Partial<ParsedLeadData['subscriber']> = {}

    // Identity
    if (identity.civility.value) {
      result.civility = this.createParsedField(identity.civility)
    }
    if (identity.lastName.value) {
      result.lastName = this.createParsedField(identity.lastName)
    }
    if (identity.firstName.value) {
      result.firstName = this.createParsedField(identity.firstName)
    }
    if (identity.birthDate.value) {
      result.birthDate = this.createParsedField(identity.birthDate)
    }

    // Contact
    if (contact.email.value) {
      result.email = this.createParsedField(contact.email)
    }
    if (contact.telephone.value) {
      result.telephone = this.createParsedField(contact.telephone)
    }
    if (contact.address.value) {
      result.address = this.createParsedField(contact.address)
    }
    if (contact.postalCode.value) {
      result.postalCode = this.createParsedField(contact.postalCode)

      // Auto-extract department code
      const dept = FieldExtractor.departmentFromPostalCode(contact.postalCode.value)
      if (dept) {
        result.departmentCode = {
          value: dept,
          confidence: 'high',
          source: 'inferred',
          originalText: contact.postalCode.value
        }
      }
    }
    if (contact.city.value) {
      result.city = this.createParsedField(contact.city)
    }

    // Professional
    if (professional.profession.value) {
      result.profession = this.createParsedField(professional.profession)
    }
    if (professional.regime.value) {
      result.regime = this.createParsedField(professional.regime)
    }
    if (professional.category.value) {
      result.category = this.createParsedField(professional.category)
    }
    if (professional.status.value) {
      result.status = this.createParsedField(professional.status)
    }

    return result
  }

  /**
   * Helper: Convert FieldExtractionResult to ParsedField
   */
  protected createParsedField<T>(extraction: {
    value: T
    confidence: any
    source: any
    originalText?: string
  }): ParsedField<T> {
    return {
      value: extraction.value,
      confidence: extraction.confidence,
      source: extraction.source,
      originalText: extraction.originalText
    }
  }

  /**
   * Helper: Build metadata for parsed data
   */
  protected buildMetadata(
    email: EmailMessage,
    parsedData: ParsedLeadData['subscriber']
  ): ParsedLeadData['metadata'] {
    const parsedFields = Object.keys(parsedData || {})
    const defaultedFields = parsedFields.filter((key) => {
      const field = (parsedData as any)?.[key]
      return field && field.source === 'default'
    })

    // Calculate overall confidence
    const confidenceScores = { high: 3, medium: 2, low: 1 }
    const allFields = Object.values(parsedData || {}) as ParsedField[]
    const avgConfidence =
      allFields.reduce((sum, f) => sum + confidenceScores[f.confidence], 0) / allFields.length

    let overallConfidence: 'high' | 'medium' | 'low' = 'low'
    if (avgConfidence >= 2.5) overallConfidence = 'high'
    else if (avgConfidence >= 1.5) overallConfidence = 'medium'

    return {
      parserUsed: this.name,
      parsingDate: new Date().toISOString(),
      sourceEmailId: email.id,
      confidence: overallConfidence,
      parsedFieldsCount: parsedFields.length,
      defaultedFieldsCount: defaultedFields.length,
      warnings: []
    }
  }

  /**
   * Helper: Detect if email contains spouse/children information
   */
  protected detectSpouseAndChildren(content: string): {
    hasSpouse: boolean
    childrenCount: number
  } {
    const hasSpouse =
      content.match(/conjoint/i) !== null || content.match(/[ée]pou(se|x)/i) !== null

    // Try to find children count
    const childMatch = content.match(/(\d+)\s+enfants?/i)
    const childrenCount = childMatch ? parseInt(childMatch[1]) : 0

    return { hasSpouse, childrenCount }
  }

  /**
   * Helper: Log parsing activity (for debugging)
   */
  protected log(message: string, data?: any): void {
    console.log(`[${this.name}] ${message}`, data || '')
  }

  /**
   * Helper: Check if content contains specific keywords
   */
  protected containsKeywords(content: string, keywords: string[]): boolean {
    const lowerContent = content.toLowerCase()
    return keywords.some((keyword) => lowerContent.includes(keyword.toLowerCase()))
  }

  /**
   * Helper: Check if content contains all keywords
   */
  protected containsAllKeywords(content: string, keywords: string[]): boolean {
    const lowerContent = content.toLowerCase()
    return keywords.every((keyword) => lowerContent.includes(keyword.toLowerCase()))
  }

  /**
   * Helper: Extract project information
   */
  protected extractProjectInfo(content: string): Partial<ParsedLeadData['project']> {
    const result: Partial<ParsedLeadData['project']> = {}

    // Date d'effet
    const dateEffet = FieldExtractor.extractDateEffet(content)
    if (dateEffet.value) {
      result.dateEffet = this.createParsedField(dateEffet)
    }

    // Madelin
    if (content.match(/loi madelin/i)) {
      result.madelin = {
        value: true,
        confidence: 'high',
        source: 'parsed'
      }
    }

    // Résiliation
    if (content.match(/r[ée]siliation/i)) {
      result.resiliation = {
        value: true,
        confidence: 'medium',
        source: 'parsed'
      }
    }

    // Actuellement assuré (Oui/Non)
    const insuredYes = content.match(/(actuellement|d[ée]j[aà])\s+assur[ée]\s*:?\s*(oui)?/i)
    const insuredField = content.match(/Souscripteur\s+actuellement\s+assur[ée]\s*:?\s*(oui|non)/i)
    if (insuredField && insuredField[1]) {
      result.currentlyInsured = {
        value: insuredField[1].toLowerCase() === 'oui',
        confidence: 'high',
        source: 'parsed',
        originalText: insuredField[0]
      }
    } else if (insuredYes) {
      // Generic hint (assume true)
      result.currentlyInsured = {
        value: true,
        confidence: 'medium',
        source: 'parsed'
      }
    }

    return result
  }
}
