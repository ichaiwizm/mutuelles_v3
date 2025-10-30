/**
 * Simplified default value system
 *
 * This module provides a clean, simple API for applying default values to lead data.
 * It reads defaults exclusively from base.domain.json with no hardcoded values.
 *
 * Design principles:
 * - Single source of truth: base.domain.json
 * - Simple priority: defaultsByCarrier > defaultExpression > default > intelligent fallback
 * - Never overwrite existing values (unless explicitly requested)
 * - No complex metadata tracking
 */

import { evaluateExpression } from './expressions'

/**
 * Field schema definition from base.domain.json
 */
export interface FieldSchema {
  type: string
  default?: any
  defaultExpression?: string
  defaultsByCarrier?: Record<string, any>
  options?: Array<{ value: string; label: string }>
  optionSets?: Record<string, Array<{ value: string; label: string }>>
  disabled?: boolean
  carriers?: string[]
}

/**
 * Domain schema structure from base.domain.json
 */
export interface DomainSchema {
  domains: {
    [sectionName: string]: {
      [fieldName: string]: FieldSchema | { [nestedKey: string]: FieldSchema }
    }
  }
}

/**
 * Options for applying defaults
 */
export interface ApplyDefaultsOptions {
  overwrite?: boolean
  platform?: string
}

/**
 * Get the default value for a single field
 *
 * Priority order:
 * 1. defaultsByCarrier[platform] - Platform-specific defaults
 * 2. defaultExpression - Runtime expressions like "firstOfNextMonth"
 * 3. default - Static default value
 * 4. Intelligent fallback for select/radio (prefers SECURITE_SOCIALE > CADRES > SALARIE > AUTRE > first)
 *
 * @param field - Field schema
 * @param platform - Optional platform for carrier-specific defaults
 * @returns Default value or undefined
 */
function getFieldDefaultValue(field: FieldSchema, platform?: string): any {
  // Priority 1: Platform-specific default
  if (field.defaultsByCarrier && platform && field.defaultsByCarrier[platform] !== undefined) {
    return field.defaultsByCarrier[platform]
  }

  // Priority 2: Expression-based default
  if (field.defaultExpression) {
    try {
      return evaluateExpression(field.defaultExpression)
    } catch (error) {
      console.warn(`Failed to evaluate expression "${field.defaultExpression}":`, error)
    }
  }

  // Priority 3: Static default
  if (field.default !== undefined) {
    return field.default
  }

  // Priority 4: Intelligent fallback for select/radio fields
  if (field.type === 'select' || field.type === 'radio') {
    // Get the appropriate option set
    let options = field.options

    if (field.optionSets && platform && field.optionSets[platform]) {
      options = field.optionSets[platform]
    }

    if (options && options.length > 0) {
      // Preferred values (in order of preference)
      const preferredValues = ['SECURITE_SOCIALE', 'CADRES', 'SALARIE', 'AUTRE']

      for (const preferred of preferredValues) {
        const found = options.find((opt) => opt.value === preferred)
        if (found) {
          return found.value
        }
      }

      // Fallback to first option
      return options[0].value
    }
  }

  return undefined
}

/**
 * Check if a value is considered "empty" for the purposes of default filling
 */
function isEmpty(value: any): boolean {
  return value === undefined || value === null || value === ''
}

/**
 * Set a nested property value using dot notation
 * Handles paths like "subscriber.firstName" and "children[0].birthDate"
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split('.')
  let current = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]

    // Handle array notation like children[0]
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/)
    if (arrayMatch) {
      const arrayName = arrayMatch[1]
      const index = parseInt(arrayMatch[2], 10)

      if (!current[arrayName]) {
        current[arrayName] = []
      }
      if (!current[arrayName][index]) {
        current[arrayName][index] = {}
      }
      current = current[arrayName][index]
    } else {
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {}
      }
      current = current[part]
    }
  }

  const lastPart = parts[parts.length - 1]
  current[lastPart] = value
}

/**
 * Get a nested property value using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.')
  let current = obj

  for (const part of parts) {
    // Handle array notation
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/)
    if (arrayMatch) {
      const arrayName = arrayMatch[1]
      const index = parseInt(arrayMatch[2], 10)
      current = current?.[arrayName]?.[index]
    } else {
      current = current?.[part]
    }

    if (current === undefined) {
      return undefined
    }
  }

  return current
}

/**
 * Apply default values from domain schema to lead data
 *
 * This is the main entry point for the simplified defaults system.
 * It reads defaults from base.domain.json and applies them to the lead data.
 *
 * @param leadData - Current lead data (will be modified in place)
 * @param schema - Domain schema from base.domain.json
 * @param options - Options for applying defaults
 * @returns List of field paths that were filled with defaults
 */
export function applyDefaults(
  leadData: Record<string, any>,
  schema: DomainSchema,
  options: ApplyDefaultsOptions = {}
): string[] {
  const { overwrite = false, platform } = options
  const filledFields: string[] = []

  // Process each domain section
  for (const [sectionName, fields] of Object.entries(schema.domains)) {
    for (const [fieldName, fieldOrNested] of Object.entries(fields)) {
      // Handle nested children fields (children.[])
      const isChildrenSection = sectionName === 'children' || sectionName.endsWith('.children')
      if (fieldName === '[]' && isChildrenSection) {
        // For children fields, we need to check if children exist first
        const childrenArrayPath = sectionName === 'children' ? 'children' : `${sectionName}`
        const childrenArray = getNestedValue(leadData, childrenArrayPath)
        if (Array.isArray(childrenArray)) {
          // Apply defaults to each child
          for (let i = 0; i < childrenArray.length; i++) {
            for (const [childFieldName, childField] of Object.entries(fieldOrNested as Record<string, FieldSchema>)) {
              const fieldPath = `${childrenArrayPath}[${i}].${childFieldName}`
              const currentValue = getNestedValue(leadData, fieldPath)

              if (isEmpty(currentValue) || overwrite) {
              const fieldSchema = childField as FieldSchema

                const defaultValue = getFieldDefaultValue(fieldSchema, platform)
                if (defaultValue !== undefined) {
                  setNestedValue(leadData, fieldPath, defaultValue)
                  filledFields.push(fieldPath)
                }
              }
            }
          }
        }
        continue
      }

      // Regular field processing
      const fieldSchema = fieldOrNested as FieldSchema

      // Build field path
      const fieldPath = `${sectionName}.${fieldName}`

      // Check if field already has a value
      const currentValue = getNestedValue(leadData, fieldPath)
      if (!isEmpty(currentValue) && !overwrite) {
        continue // Skip fields that already have values
      }

      // Get default value
      const defaultValue = getFieldDefaultValue(fieldSchema, platform)
      if (defaultValue !== undefined) {
        setNestedValue(leadData, fieldPath, defaultValue)
        filledFields.push(fieldPath)
      }
    }
  }

  return filledFields
}

/**
 * Get all available defaults without applying them
 *
 * Useful for previewing what defaults would be applied.
 *
 * @param schema - Domain schema from base.domain.json
 * @param platform - Optional platform for carrier-specific defaults
 * @returns Object with all default values
 */
export function getAllDefaults(
  schema: DomainSchema,
  platform?: string
): Record<string, any> {
  const defaults: Record<string, any> = {}

  for (const [sectionName, fields] of Object.entries(schema.domains)) {
    for (const [fieldName, fieldOrNested] of Object.entries(fields)) {
      // Handle nested children fields
      const isChildrenSection = sectionName === 'children' || sectionName.endsWith('.children')
      if (fieldName === '[]' && isChildrenSection) {
        // For children, return defaults for a hypothetical child[0]
        for (const [childFieldName, childField] of Object.entries(fieldOrNested as Record<string, FieldSchema>)) {
          const fieldSchema = childField as FieldSchema

          const defaultValue = getFieldDefaultValue(fieldSchema, platform)
          if (defaultValue !== undefined) {
            const prefix = sectionName === 'children' ? '' : `${sectionName.replace(/\.children$/, '')}.`
            const key = `${prefix}${sectionName === 'children' ? 'children' : 'children'}[0].${childFieldName}`
            defaults[key] = defaultValue
          }
        }
        continue
      }

      // Regular field
      const fieldSchema = fieldOrNested as FieldSchema

      const defaultValue = getFieldDefaultValue(fieldSchema, platform)
      if (defaultValue !== undefined) {
        defaults[`${sectionName}.${fieldName}`] = defaultValue
      }
    }
  }

  return defaults
}
