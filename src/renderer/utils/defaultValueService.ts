/**
 * Default value service for forms
 *
 * This is a frontend wrapper around the unified defaults system.
 * It converts between FormSchema (frontend) and DomainSchema (backend)
 * and provides helper functions for form default filling.
 */

import { FormSchema, FormFieldDefinition } from './formSchemaGenerator'
import { applyDefaults, getAllDefaults as getAllDefaultsFromSchema, type DomainSchema } from '@shared/defaults/simpleDefaults'
import { computeDerivedFields } from '@shared/businessRules/computedValues'

/**
 * Convert FormSchema to DomainSchema format
 *
 * FormSchema has { common: [...], platformSpecific: {alptis: [...], swisslifeone: [...]}}
 * DomainSchema needs { domains: { subscriber: {...}, spouse: {...}, project: {...}, children: {...} }}
 */
function formSchemaToDomainSchema(formSchema: FormSchema): DomainSchema {
  const domains: Record<string, any> = {}

  const ensureSection = (key: string) => {
    if (!domains[key]) domains[key] = {}
    return domains[key]
  }

  // Process all fields from all sources
  const allFields = [
    ...formSchema.common,
    ...formSchema.platformSpecific.alptis,
    ...formSchema.platformSpecific.swisslifeone,
  ]

  // Deduplicate by domainKey and merge field definitions
  const fieldsByKey = new Map<string, FormFieldDefinition>()
  for (const field of allFields) {
    const existing = fieldsByKey.get(field.domainKey)
    if (!existing) {
      fieldsByKey.set(field.domainKey, field)
    } else {
      fieldsByKey.set(field.domainKey, {
        ...existing,
        ...field,
        options: field.options || existing.options,
      })
    }
  }

  // Convert to domain structure (supports prefixed sections like "alptis.subscriber")
  for (const [domainKey, field] of fieldsByKey.entries()) {
    const tokens = domainKey.split('.')
    const maybeCarrier = tokens[0]
    const carriers = new Set(['alptis', 'swisslifeone'])

    let sectionKey = ''
    let fieldName = ''

    if (carriers.has(maybeCarrier)) {
      // Prefixed key, e.g., alptis.subscriber.regime or alptis.children[].regime
      const rest = tokens.slice(1)
      if (rest[0] === 'children[]' || domainKey.includes('children[].')) {
        sectionKey = `${maybeCarrier}.children`
        fieldName = '[]'
        if (!domains[sectionKey]) {
          domains[sectionKey] = { '[]': {} }
        } else if (!domains[sectionKey]['[]']) {
          domains[sectionKey]['[]'] = {}
        }
        const childFieldName = rest[1] || domainKey.split('children[].')[1].replace('.', '')
        domains[sectionKey]['[]'][childFieldName] = {
          type: field.type,
          default: field.default,
          defaultExpression: field.defaultExpression,
          defaultsByCarrier: field.defaultsByCarrier,
          options: field.options,
          disabled: field.disabled,
        }
        continue
      }

      const section = rest[0]
      fieldName = rest[1]
      sectionKey = `${maybeCarrier}.${section}`
      const sect = ensureSection(sectionKey)
      sect[fieldName] = {
        type: field.type,
        default: field.default,
        defaultExpression: field.defaultExpression,
        defaultsByCarrier: field.defaultsByCarrier,
        options: field.options,
        disabled: field.disabled,
      }
    } else {
      // Unprefixed common keys
      if (tokens[0] === 'children[]' || domainKey.startsWith('children[].')) {
        sectionKey = 'children'
        fieldName = '[]'
        if (!domains[sectionKey]) {
          domains[sectionKey] = { '[]': {} }
        } else if (!domains[sectionKey]['[]']) {
          domains[sectionKey]['[]'] = {}
        }
        const childFieldName = tokens[1] || tokens[0].replace('children[].', '')
        domains[sectionKey]['[]'][childFieldName] = {
          type: field.type,
          default: field.default,
          defaultExpression: field.defaultExpression,
          defaultsByCarrier: field.defaultsByCarrier,
          options: field.options,
          disabled: field.disabled,
        }
      } else if (tokens.length >= 2) {
        const [section, name] = tokens
        sectionKey = section
        const sect = ensureSection(sectionKey)
        sect[name] = {
          type: field.type,
          default: field.default,
          defaultExpression: field.defaultExpression,
          defaultsByCarrier: field.defaultsByCarrier,
          options: field.options,
          disabled: field.disabled,
        }
      }
    }
  }

  return { domains }
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
 * Get all default values for a form
 *
 * @param schema - Form schema
 * @param currentValues - Current form values (flat object with dot notation)
 * @param platform - Optional platform for carrier-specific defaults
 * @returns Flat object with default values
 */
export function getAllDefaultsForForm(
  schema: FormSchema,
  currentValues: Record<string, any>,
  platform?: string
): Record<string, any> {
  // Convert FormSchema to DomainSchema
  const domainSchema = formSchemaToDomainSchema(schema)

  // Get all defaults
  const defaults = getAllDefaultsFromSchema(domainSchema, platform)

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
 * @param platform - Optional platform
 * @returns Combined defaults and computed values
 */
export function getAllDefaultsWithBusinessRules(
  schema: FormSchema,
  currentValues: Record<string, any>,
  platform?: string
): Record<string, any> {
  // Convert to nested structure for computeDerivedFields
  const nested = flatToNested(currentValues)

  // Get static defaults
  const domainSchema = formSchemaToDomainSchema(schema)
  const defaults = getAllDefaultsFromSchema(domainSchema)

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

/**
 * @deprecated Use getAllDefaultsForForm instead
 */
export function getAllDefaults(schema: FormSchema, currentValues?: Record<string, any>): Record<string, any> {
  return getAllDefaultsForForm(schema, currentValues || {})
}

/**
 * @deprecated Not needed in new system
 */
export function getSpouseDefaults(schema: FormSchema): Record<string, any> {
  return {}
}

/**
 * @deprecated Not needed in new system
 */
export function getChildDefaults(schema: FormSchema, childIndex: number): Record<string, any> {
  return {}
}

/**
 * @deprecated Use evaluateExpression from shared/defaults/expressions instead
 */
export function computeDefaultValue(field: FormFieldDefinition, currentValues?: Record<string, any>): any {
  return undefined
}
