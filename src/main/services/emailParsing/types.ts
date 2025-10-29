/**
 * Backend-specific types for email parsing
 */

import type { EmailMessage } from '../../../shared/types/email'
import type {
  ParsedLeadData,
  EmailParsingResult,
  ConfidenceLevel,
  ParsedField
} from '../../../shared/types/emailParsing'

/**
 * Abstract parser interface
 */
export interface IEmailParser {
  /**
   * Name of the parser
   */
  readonly name: string

  /**
   * Priority of the parser (higher = checked first)
   */
  readonly priority: number

  /**
   * Check if this parser can handle the given email
   */
  canParse(email: EmailMessage): boolean

  /**
   * Parse the email to extract lead data
   */
  parse(email: EmailMessage): EmailParsingResult
}

/**
 * Field extraction result
 */
export interface FieldExtractionResult<T = any> {
  value: T | null
  confidence: ConfidenceLevel
  source: 'parsed' | 'inferred'
  originalText?: string
}

/**
 * Parser detection result
 */
export interface ParserDetectionResult {
  canParse: boolean
  confidence: ConfidenceLevel
  reason?: string
}

/**
 * Email content sections
 */
export interface EmailContentSections {
  text: string
  html?: string
  subject: string
  from: string
  lines: string[]
  cleanLines: string[] // Lines trimmed and without empty lines
}

/**
 * Regex pattern definition
 */
export interface RegexPatternDef {
  pattern: RegExp
  group?: number
  flags?: string
  transform?: (value: string) => any
  validate?: (value: any) => boolean
}

/**
 * Field extraction patterns
 */
export interface FieldPatterns {
  // Identity
  civility?: RegexPatternDef[]
  lastName?: RegexPatternDef[]
  firstName?: RegexPatternDef[]
  birthDate?: RegexPatternDef[]

  // Contact
  email?: RegexPatternDef[]
  telephone?: RegexPatternDef[]
  address?: RegexPatternDef[]
  postalCode?: RegexPatternDef[]
  city?: RegexPatternDef[]
  departmentCode?: RegexPatternDef[]

  // Professional
  profession?: RegexPatternDef[]
  regime?: RegexPatternDef[]
  category?: RegexPatternDef[]
  status?: RegexPatternDef[]
  workFramework?: RegexPatternDef[]

  // Project
  dateEffet?: RegexPatternDef[]
  plan?: RegexPatternDef[]
}

/**
 * Parsed data helper to build ParsedField objects
 */
export class ParsedFieldBuilder {
  static create<T>(
    value: T,
    confidence: ConfidenceLevel = 'high',
    source: 'parsed' | 'default' | 'inferred' = 'parsed',
    originalText?: string
  ): ParsedField<T> {
    return {
      value,
      confidence,
      source,
      originalText
    }
  }

  static fromExtraction<T>(extraction: FieldExtractionResult<T>): ParsedField<T> | undefined {
    if (extraction.value === null) {
      return undefined
    }

    return {
      value: extraction.value,
      confidence: extraction.confidence,
      source: extraction.source,
      originalText: extraction.originalText
    }
  }
}

/**
 * Parser statistics
 */
export interface ParserStats {
  totalParsed: number
  successful: number
  failed: number
  averageConfidence: number
  fieldExtractionRates: Record<string, number>
}
