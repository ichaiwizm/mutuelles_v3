/**
 * Data enrichment for parsed leads (v2 - Zod-based)
 *
 * Applies default values and computes derived fields for leads parsed from emails.
 * Uses the v2 Zod schemas and form metadata instead of base.domain.json
 */

import { ParsedLeadData, ParsedField } from './types'
import { formMetadata } from '@shared/domain/form-metadata'
import { evaluateDefaultExpression } from '@shared/domain/form-generator'
import { computeDerivedFields } from '@shared/businessRules/computedValues'

// ------------------------------
// Normalization helpers
// ------------------------------
function normalizeCivility(input: any): 'MONSIEUR' | 'MADAME' | undefined {
  if (!input) return undefined
  const s = String(input).toLowerCase().replace(/\./g, '').trim()
  if (['m', 'mr', 'monsieur'].includes(s)) return 'MONSIEUR'
  if (['mme', 'madame', 'mlle', 'mademoiselle'].includes(s)) return 'MADAME'
  return undefined
}

function normalizeRegimeCommon(input: any): 'TNS' | 'SECURITE_SOCIALE' | 'AMEXA' | 'SECURITE_SOCIALE_ALSACE_MOSELLE' | 'AUTRES_REGIME_SPECIAUX' | undefined {
  if (!input) return undefined
  const s = String(input).toLowerCase()
  if (s.includes('tns') || s.includes('indépendant') || s.includes('independant') || s.includes('travailleurs non salaries')) return 'TNS'
  if (s.includes('alsace') || s.includes('moselle')) return 'SECURITE_SOCIALE_ALSACE_MOSELLE'
  if (s.includes('msa') || s.includes('amexa') || s.includes('agric')) return 'AMEXA'
  if (s.includes('salari')) return 'SECURITE_SOCIALE'
  if (s.includes('regime général') || s.includes('régime général') || s.includes('sécurité sociale')) return 'SECURITE_SOCIALE'
  if (s.includes('spécial') || s.includes('special')) return 'AUTRES_REGIME_SPECIAUX'
  return undefined
}

function cleanPostalCode(input: any): string | undefined {
  if (input === undefined || input === null) return undefined
  const s = String(input).replace(/\D/g, '').slice(0, 5)
  return s.length === 5 ? s : undefined
}

function cleanPhone(input: any): string | undefined {
  if (!input) return undefined
  const digits = String(input).replace(/\D/g, '')

  if (!digits) return undefined

  // If french international format (33xxxxxxxxx) -> convert to domestic 0XXXXXXXXX
  if (digits.startsWith('33') && digits.length >= 11) {
    const rest = digits.slice(2) // drop country code
    const nineOrTen = rest.length >= 9 ? rest.slice(-9) : rest
    const local = ('0' + nineOrTen).slice(0, 10)
    return local.length === 10 ? local : undefined
  }

  // Domestic already starting with 0 -> keep first 10
  if (digits.startsWith('0') && digits.length >= 10) {
    return digits.slice(0, 10)
  }

  // Fallback: take last 10 and ensure leading 0
  if (digits.length >= 10) {
    const last10 = digits.slice(-10)
    return last10.startsWith('0') ? last10 : ('0' + last10.slice(-9))
  }

  return undefined
}

/**
 * Convert ParsedLeadData (with ParsedField wrappers) to plain values object
 */
function parsedDataToValues(parsedData: ParsedLeadData): Record<string, any> {
  const values: Record<string, any> = {}

  // Helper to extract value from ParsedField or use direct value
  const extractValue = (field: any): any => {
    if (field && typeof field === 'object' && 'value' in field) {
      return (field as ParsedField).value
    }
    return field
  }

  // Extract subscriber fields
  if (parsedData.subscriber) {
    values.subscriber = {}
    for (const [key, field] of Object.entries(parsedData.subscriber)) {
      values.subscriber[key] = extractValue(field)
    }
  }

  // Extract spouse fields
  if (parsedData.spouse) {
    values.spouse = {}
    for (const [key, field] of Object.entries(parsedData.spouse)) {
      values.spouse[key] = extractValue(field)
    }
  }

  // Extract children fields
  if (parsedData.children && Array.isArray(parsedData.children)) {
    values.children = parsedData.children.map((child) => {
      const childValues: Record<string, any> = {}
      for (const [key, field] of Object.entries(child)) {
        childValues[key] = extractValue(field)
      }
      return childValues
    })
  }

  // Extract project fields
  if (parsedData.project) {
    values.project = {}
    for (const [key, field] of Object.entries(parsedData.project)) {
      values.project[key] = extractValue(field)
    }
  }

  return values
}

/** Normalize common values */
function normalizeValues(values: Record<string, any>) {
  // Civility
  const civ = normalizeCivility(values.subscriber?.civility)
  if (civ) {
    values.subscriber = values.subscriber || {}
    values.subscriber.civility = civ
  }

  // Phone / postal code cleanup
  if (values.subscriber) {
    const phone = cleanPhone(values.subscriber.telephone || values.subscriber.phoneE164)
    if (phone) {
      // Keep domestic telephone for validator/UI and also set E.164
      values.subscriber.telephone = phone
      values.subscriber.phoneE164 = `+33${phone.slice(1)}`
    }
    const cp = cleanPostalCode(values.subscriber.postalCode)
    if (cp) values.subscriber.postalCode = cp
  }

  if (values.spouse) {
    const cp = cleanPostalCode(values.spouse.postalCode)
    if (cp) values.spouse.postalCode = cp
  }

  // Regime normalization
  const commonRegime = normalizeRegimeCommon(values.subscriber?.regime)
  if (commonRegime) {
    values.subscriber.regime = commonRegime
  }

  const spouseCommonRegime = normalizeRegimeCommon(values.spouse?.regime)
  if (spouseCommonRegime) {
    values.spouse.regime = spouseCommonRegime
  }
}

/**
 * Apply defaults from form metadata
 */
function applyDefaults(values: Record<string, any>): string[] {
  const defaultedFields: string[] = []

  const setIfEmpty = (section: string, field: string, value: any) => {
    if (!values[section]) values[section] = {}
    if (values[section][field] === undefined || values[section][field] === null || values[section][field] === '') {
      values[section][field] = value
      defaultedFields.push(`${section}.${field}`)
    }
  }

  // Apply defaults from metadata
  for (const [section, fields] of Object.entries(formMetadata)) {
    for (const [fieldName, metadata] of Object.entries(fields)) {
      if (metadata.defaultValue) {
        let defaultValue = metadata.defaultValue

        // Evaluate expressions
        if (typeof defaultValue === 'string' && defaultValue === 'firstOfNextMonth') {
          defaultValue = evaluateDefaultExpression(defaultValue)
        }

        setIfEmpty(section, fieldName, defaultValue)
      }
    }
  }

  return defaultedFields
}

/**
 * Convert plain values object back to ParsedLeadData structure
 */
function valuesToParsedData(
  values: Record<string, any>,
  originalParsed: ParsedLeadData,
  defaultedFields: string[],
  computedFields: string[]
): ParsedLeadData {
  const result: ParsedLeadData = {
    subscriber: {},
    spouse: {},
    children: [],
    project: {},
    metadata: {
      ...originalParsed.metadata,
      defaultedFieldsCount: (originalParsed.metadata.defaultedFieldsCount || 0) + defaultedFields.length,
      warnings: [
        ...originalParsed.metadata.warnings,
        ...(computedFields.length > 0 ? [`${computedFields.length} computed fields added`] : [])
      ]
    }
  }

  // Helper to create ParsedField for defaults or computed values
  const createField = (value: any, fieldPath: string): ParsedField => {
    if (defaultedFields.includes(fieldPath)) {
      return {
        value,
        source: 'default',
        confidence: 'high',
      }
    } else if (computedFields.includes(fieldPath)) {
      return {
        value,
        source: 'inferred',
        confidence: 'high',
      }
    } else {
      // Preserve original parsed field if it exists
      const parts = fieldPath.split('.')
      let current: any = originalParsed
      for (const part of parts) {
        if (current === undefined) break
        current = current[part]
      }
      if (current && typeof current === 'object' && 'value' in current) {
        return current as ParsedField
      }
      // Fallback: create new parsed field
      return {
        value,
        source: 'parsed',
        confidence: 'medium',
      }
    }
  }

  // Reconstruct subscriber
  if (values.subscriber) {
    result.subscriber = {}
    for (const [key, value] of Object.entries(values.subscriber)) {
      ;(result.subscriber as any)[key] = createField(value, `subscriber.${key}`)
    }
  }

  // Reconstruct spouse
  if (values.spouse) {
    result.spouse = {}
    for (const [key, value] of Object.entries(values.spouse)) {
      ;(result.spouse as any)[key] = createField(value, `spouse.${key}`)
    }
  }

  // Reconstruct children
  if (values.children && Array.isArray(values.children)) {
    result.children = values.children.map((child, index) => {
      const childResult: Record<string, ParsedField> = {}
      for (const [key, value] of Object.entries(child)) {
        childResult[key] = createField(value, `children[${index}].${key}`)
      }
      return childResult
    })
  }

  // Reconstruct project
  if (values.project) {
    result.project = {}
    for (const [key, value] of Object.entries(values.project)) {
      ;(result.project as any)[key] = createField(value, `project.${key}`)
    }
  }

  return result
}

/**
 * Enrich parsed lead data with defaults and computed values
 *
 * This is the main entry point for data enrichment during email parsing.
 *
 * @param parsedData - Parsed lead data from email
 * @param platform - Optional platform (unused in v2, kept for compatibility)
 * @returns Enriched parsed data with metadata
 */
export function enrich(
  parsedData: ParsedLeadData,
  platform?: string
): {
  enrichedData: ParsedLeadData
  defaultedFields: string[]
  computedFields: string[]
} {
  // Convert ParsedLeadData to plain values
  const currentValues = parsedDataToValues(parsedData)

  // Normalize values
  normalizeValues(currentValues)

  // Apply defaults from form metadata
  const defaultedFields = applyDefaults(currentValues)

  // Compute derived fields (business rules)
  const computedValues = computeDerivedFields(currentValues, {
    // Allow computed (inferred) values to override generic defaults
    // so that, e.g., SALARIÉ inferred from SECURITE_SOCIALE replaces default TNS
    overwriteExisting: true,
  })

  // Apply computed values to current values
  const computedFieldsList: string[] = []
  for (const [fieldPath, value] of Object.entries(computedValues)) {
    const parts = fieldPath.split('.')
    let current = currentValues
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!current[part]) current[part] = {}
      current = current[part]
    }
    const lastPart = parts[parts.length - 1]
    current[lastPart] = value
    computedFieldsList.push(fieldPath)
  }

  // Convert back to ParsedLeadData
  const enrichedData = valuesToParsedData(
    currentValues,
    parsedData,
    defaultedFields,
    computedFieldsList
  )

  return {
    enrichedData,
    defaultedFields,
    computedFields: computedFieldsList,
  }
}

/**
 * Get all available defaults for preview (without applying)
 */
export function getAvailableDefaults(platform?: string): Record<string, any> {
  const defaults: Record<string, any> = {}

  for (const [section, fields] of Object.entries(formMetadata)) {
    for (const [fieldName, metadata] of Object.entries(fields)) {
      if (metadata.defaultValue) {
        let defaultValue = metadata.defaultValue

        // Evaluate expressions
        if (typeof defaultValue === 'string' && defaultValue === 'firstOfNextMonth') {
          defaultValue = evaluateDefaultExpression(defaultValue)
        }

        defaults[`${section}.${fieldName}`] = defaultValue
      }
    }
  }

  return defaults
}

// Export for backward compatibility
export const DataEnricher = {
  enrich,
  getAvailableDefaults,
}
