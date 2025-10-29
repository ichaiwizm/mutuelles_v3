/**
 * Types and interfaces for email-to-lead parsing system
 */

import type { EmailMessage } from './email'

/**
 * Confidence level for parsed data
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low'

/**
 * Validation status for a parsed lead
 */
export type ValidationStatus = 'valid' | 'partial' | 'invalid'

/**
 * Represents a single parsed field with metadata
 */
export interface ParsedField<T = any> {
  value: T
  confidence: ConfidenceLevel
  source: 'parsed' | 'default' | 'inferred'
  originalText?: string
}

/**
 * Partial lead data extracted from email
 */
export interface ParsedLeadData {
  // Subscriber info
  subscriber?: {
    civility?: ParsedField<string>
    lastName?: ParsedField<string>
    firstName?: ParsedField<string>
    birthDate?: ParsedField<string>
    email?: ParsedField<string>
    telephone?: ParsedField<string>
    address?: ParsedField<string>
    postalCode?: ParsedField<string>
    city?: ParsedField<string>
    departmentCode?: ParsedField<number | string>
    regime?: ParsedField<string>
    category?: ParsedField<string>
    status?: ParsedField<string>
    profession?: ParsedField<string>
    workFramework?: ParsedField<string>
  }

  // Spouse info
  spouse?: {
    civility?: ParsedField<string>
    lastName?: ParsedField<string>
    firstName?: ParsedField<string>
    birthDate?: ParsedField<string>
    regime?: ParsedField<string>
    category?: ParsedField<string>
    status?: ParsedField<string>
    profession?: ParsedField<string>
  }

  // Children
  children?: Array<{
    birthDate?: ParsedField<string>
    gender?: ParsedField<string>
    regime?: ParsedField<string>
    ayantDroit?: ParsedField<string>
  }>

  // Project info
  project?: {
    name?: ParsedField<string>
    dateEffet?: ParsedField<string>
    plan?: ParsedField<string>
    couverture?: ParsedField<boolean>
    ij?: ParsedField<boolean>
    madelin?: ParsedField<boolean>
    resiliation?: ParsedField<boolean>
    reprise?: ParsedField<boolean>
    currentlyInsured?: ParsedField<boolean>
  }

  // Metadata
  metadata: {
    parserUsed: string
    parsingDate: string
    sourceEmailId: string
    confidence: ConfidenceLevel
    parsedFieldsCount: number
    defaultedFieldsCount: number
    warnings: string[]
  }
}

/**
 * Result of parsing an email
 */
export interface EmailParsingResult {
  success: boolean
  emailId: string
  parsedData?: ParsedLeadData
  validationStatus?: ValidationStatus
  errors: string[]
  warnings: string[]
}

/**
 * Result of parsing multiple emails
 */
export interface BulkParsingResult {
  total: number
  successful: number
  failed: number
  results: EmailParsingResult[]
}

/**
 * Enriched lead data ready for creation
 */
export interface EnrichedLeadData {
  // Original parsed data
  parsedData: ParsedLeadData

  // Validation status
  validationStatus: ValidationStatus

  // Missing required fields
  missingRequiredFields: string[]

  // Fields that were auto-filled with defaults
  defaultedFields: string[]

  // Final data ready for insertion (flat structure for form)
  formData: Record<string, any>

  // Metadata for tracking
  metadata: {
    source: 'email'
    emailId: string
    parserUsed: string
    parsingConfidence: number
    parsedFields: string[]
    defaultedFields: string[]
    warnings: string[]
  }

  // Duplicate detection (optional, UI-only)
  duplicate?: {
    isDuplicate: boolean
    reasons: string[]
  }

  // Internal preview duplicate flag (dedupe within parsed list)
  localDuplicate?: boolean
}

/**
 * Request to create leads from emails
 */
export interface EmailToLeadRequest {
  emailIds: string[]
}

/**
 * Response from email-to-lead parsing
 */
export interface EmailToLeadResponse {
  total: number
  valid: number
  partial: number
  invalid: number
  enrichedLeads: EnrichedLeadData[]
  errors: Array<{
    emailId: string
    error: string
  }>
}

/**
 * Request to create bulk leads
 */
export interface BulkLeadCreationRequest {
  leads: Array<{
    formData: Record<string, any>
    metadata: Record<string, any>
  }>
}

/**
 * Result of a single lead creation
 */
export interface LeadCreationResult {
  success: boolean
  leadId?: string
  error?: string
  metadata?: {
    emailId?: string
    index: number
  }
}

/**
 * Response from bulk lead creation
 */
export interface BulkLeadCreationResponse {
  total: number
  successful: number
  failed: number
  results: LeadCreationResult[]
}

/**
 * Parser configuration
 */
export interface ParserConfig {
  name: string
  priority: number
  enabled: boolean
}

/**
 * Field extraction pattern
 */
export interface FieldPattern {
  regex: RegExp
  group?: number
  transform?: (value: string) => any
  confidence?: ConfidenceLevel
}
