/**
 * Data enrichment for parsed leads
 *
 * Applies default values and computes derived fields for leads parsed from emails.
 * Uses the unified defaults system (simpleDefaults) and business rules (computedValues).
 */

import { ParsedLeadData, ParsedField } from './types'
import { applyDefaults, getAllDefaults, type DomainSchema } from '@shared/defaults/simpleDefaults'
import { computeDerivedFields } from '@shared/businessRules/computedValues'
import { loadDomainSchema } from '@shared/defaults/schemaLoader'

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

/**
 * Convert plain values object back to ParsedLeadData structure
 * Only wraps newly-added default/computed values, preserves existing ParsedFields
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
    // Preserve metadata from original parsed data
    metadata: {
      ...originalParsed.metadata,
      // Update defaults count
      defaultedFieldsCount: (originalParsed.metadata.defaultedFieldsCount || 0) + defaultedFields.length,
      // Add warnings for computed fields
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
      result.subscriber[key] = createField(value, `subscriber.${key}`)
    }
  }

  // Reconstruct spouse
  if (values.spouse) {
    result.spouse = {}
    for (const [key, value] of Object.entries(values.spouse)) {
      result.spouse[key] = createField(value, `spouse.${key}`)
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
      result.project[key] = createField(value, `project.${key}`)
    }
  }

  return result
}

/**
 * Enrich parsed lead data with defaults and computed values
 *
 * This is the main entry point for data enrichment during email parsing.
 * It applies defaults from base.domain.json and computes derived fields.
 *
 * @param parsedData - Parsed lead data from email
 * @param platform - Optional platform for carrier-specific defaults
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
  // Load domain schema
  const schema = loadDomainSchema()

  // Convert ParsedLeadData to plain values
  const currentValues = parsedDataToValues(parsedData)

  // Apply defaults from schema
  const defaultedFields = applyDefaults(currentValues, schema, {
    platform,
    overwrite: false, // Never overwrite parsed values
  })

  // Compute derived fields (business rules)
  const computedValues = computeDerivedFields(currentValues, {
    overwriteExisting: false, // Never overwrite existing values
  })

  // Apply computed values to current values
  const computedFieldsList: string[] = []
  for (const [fieldPath, value] of Object.entries(computedValues)) {
    // Use nested setter
    const parts = fieldPath.split('.')
    let current = currentValues
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      // Handle array notation
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/)
      if (arrayMatch) {
        const arrayName = arrayMatch[1]
        const index = parseInt(arrayMatch[2], 10)
        if (!current[arrayName]) current[arrayName] = []
        if (!current[arrayName][index]) current[arrayName][index] = {}
        current = current[arrayName][index]
      } else {
        if (!current[part]) current[part] = {}
        current = current[part]
      }
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
 *
 * @param platform - Optional platform for carrier-specific defaults
 * @returns Object with all default values
 */
export function getAvailableDefaults(platform?: string): Record<string, any> {
  const schema = loadDomainSchema()
  return getAllDefaults(schema, platform)
}

// Export for backward compatibility (used by other modules)
export const DataEnricher = {
  enrich,
  getAvailableDefaults,
}
