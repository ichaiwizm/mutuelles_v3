/**
 * Default value service for forms (v2 - Zod-based)
 *
 * Simplified version using form metadata from v2 architecture.
 */

import { FormSchema, FormFieldDefinition, getFieldDefault } from './formSchemaGenerator'
import { computeDerivedFields } from '@shared/businessRules/computedValues'

/**
 * Convert flat object to nested object
 * { "subscriber.firstName": "John" } → { subscriber: { firstName: "John" } }
 */
function flatToNested(flat: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.')
    let current = result

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]

      // Handle array notation like children[0]
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
  }

  return result
}

/**
 * Convert nested object to flat object with dot notation
 * { subscriber: { firstName: "John" } } → { "subscriber.firstName": "John" }
 */
function nestedToFlat(obj: Record<string, any>, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {}

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Nested object
      Object.assign(result, nestedToFlat(value, newKey))
    } else if (Array.isArray(value)) {
      // Array (like children)
      value.forEach((item, index) => {
        if (item && typeof item === 'object') {
          Object.assign(result, nestedToFlat(item, `${key}[${index}]`))
        } else {
          result[`${key}[${index}]`] = item
        }
      })
    } else {
      result[newKey] = value
    }
  }

  return result
}

/**
 * Get all default values from form schema
 *
 * @param schema - Form schema
 * @param currentValues - Current form values (not used, kept for API compatibility)
 * @param platform - Optional platform (not used in v2, kept for compatibility)
 * @returns Flat object with default values
 */
export function getAllDefaultsForForm(
  schema: FormSchema,
  _currentValues?: Record<string, any>,
  _platform?: string
): Record<string, any> {
  const defaults: Record<string, any> = {}

  // Extract defaults from all fields
  const allFields = [
    ...schema.common,
    ...schema.platformSpecific.alptis,
    ...schema.platformSpecific.swisslifeone,
  ]

  for (const field of allFields) {
    const defaultValue = getFieldDefault(field)
    if (defaultValue !== undefined) {
      defaults[field.domainKey] = defaultValue
    }
  }

  return defaults
}

/**
 * Apply defaults to form values
 *
 * @param currentValues - Current form values (flat)
 * @param defaults - Default values to apply (flat)
 * @param options - Options
 * @returns Updated form values
 */
export function applyDefaultsToForm(
  currentValues: Record<string, any>,
  defaults: Record<string, any>,
  options: { overwrite?: boolean } = {}
): Record<string, any> {
  const { overwrite = false } = options
  const result = { ...currentValues }

  for (const [key, value] of Object.entries(defaults)) {
    const currentValue = result[key]
    const isEmpty = currentValue === undefined || currentValue === null || currentValue === ''

    if (isEmpty || overwrite) {
      result[key] = value
    }
  }

  return result
}

/**
 * Get all defaults with business rules applied
 *
 * This combines static defaults with computed values (like madelin, department).
 *
 * @param schema - Form schema
 * @param currentValues - Current form values (flat)
 * @param platform - Optional platform (not used in v2, kept for compatibility)
 * @returns Combined defaults and computed values
 */
export function getAllDefaultsWithBusinessRules(
  schema: FormSchema,
  currentValues: Record<string, any>,
  _platform?: string
): Record<string, any> {
  // Convert to nested structure for computeDerivedFields
  const nested = flatToNested(currentValues)

  // Get static defaults
  const defaults = getAllDefaultsForForm(schema)

  // Apply defaults to nested structure (for computing derived values)
  const withDefaults = { ...nested }
  for (const [key, value] of Object.entries(defaults)) {
    const parts = key.split('.')
    let current = withDefaults
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!current[part]) current[part] = {}
      current = current[part]
    }
    const lastPart = parts[parts.length - 1]
    if (current[lastPart] === undefined || current[lastPart] === null || current[lastPart] === '') {
      current[lastPart] = value
    }
  }

  // Compute derived fields
  const computed = computeDerivedFields(withDefaults, { overwriteExisting: false })

  // Merge defaults and computed
  return { ...defaults, ...computed }
}
