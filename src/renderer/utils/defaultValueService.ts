import { FormSchema, FormFieldDefinition } from './formSchemaGenerator'
import { evaluateExpression as evaluateSharedExpression, applyAllBusinessRules } from '@shared/defaults'
import type { DefaultContext } from '@shared/defaults'

/**
 * Default value expressions that can be evaluated at runtime
 *
 * @deprecated Use evaluateSharedExpression from shared/defaults instead
 */
type DefaultExpression = 'firstOfNextMonth' | 'today' | 'currentMonth'

/**
 * Evaluates a default expression to its actual value
 *
 * @deprecated Use evaluateSharedExpression from shared/defaults instead
 * Kept for backward compatibility
 */
function evaluateDefaultExpression(expression: DefaultExpression): string {
  // Delegate to shared module
  return evaluateSharedExpression(expression)
}

/**
 * Computes the default value for a single field based on its definition
 * and fallback logic for select/radio fields
 */
export function computeDefaultValue(field: FormFieldDefinition, currentValues?: Record<string, any>): any {
  // 1. Check for explicit default value from schema (HIGHEST PRIORITY)
  if (field.default !== undefined) {
    return field.default
  }

  // 2. Check for default expression
  if (field.defaultExpression) {
    return evaluateDefaultExpression(field.defaultExpression)
  }

  // 3. Disabled fields always use first option
  if (field.disabled && field.options && field.options.length > 0) {
    return field.options[0].value
  }

  // 4. Select fields with intelligent fallback logic (ONLY if no explicit default)
  if (field.type === 'select' && field.options && field.options.length > 0) {
    // Preference order: SECURITE_SOCIALE > CADRES > SALARIE > AUTRE > first option
    const securiteSociale = field.options.find(opt => opt.value === 'SECURITE_SOCIALE')
    if (securiteSociale) return 'SECURITE_SOCIALE'

    const cadres = field.options.find(opt => opt.value === 'CADRES')
    if (cadres) return 'CADRES'

    const salarie = field.options.find(opt => opt.value === 'SALARIE')
    if (salarie) return 'SALARIE'

    const autre = field.options.find(opt => opt.value === 'AUTRE')
    if (autre) return 'AUTRE'

    // Default to first option
    return field.options[0].value
  }

  // 5. Radio fields default to first option (ONLY if no explicit default)
  if (field.type === 'radio' && field.options && field.options.length > 0) {
    return field.options[0].value
  }

  return undefined
}

/**
 * Generates all default values for a complete form schema
 *
 * For carrier-specific fields that appear in multiple platforms with different defaults,
 * all defaults are collected and the most compatible value is chosen. This is done by
 * applying defaults in order: SwissLife → Alptis → Common, so that more universal
 * defaults override platform-specific ones in case of conflicts.
 */
export function getAllDefaults(schema: FormSchema, currentValues?: Record<string, any>): Record<string, any> {
  const defaults: Record<string, any> = {}

  // Collect all fields in reverse priority order: SwissLife → Alptis → Common
  // This ensures that when a field appears in multiple platforms with different defaults,
  // the more universal default (usually from Alptis or Common) wins
  // For example: subscriber.regime defaults to "SECURITE_SOCIALE" (valid in both platforms)
  // rather than "TNS" (only valid in SwissLife)
  const allFields = [
    ...schema.platformSpecific.swisslifeone,
    ...schema.platformSpecific.alptis,
    ...schema.common
  ]

  // Process ALL fields without strict deduplication to ensure carrier-specific defaults
  // from all platforms are considered. The order ensures the most compatible value is used.
  allFields.forEach(field => {
    const defaultValue = computeDefaultValue(field, defaults)
    if (defaultValue !== undefined) {
      // Handle repeatable children fields with [] notation
      if (field.domainKey.startsWith('children[].')) {
        // Determine number of children
        const childrenCount = currentValues?.['children.count'] || 0

        // Generate indexed keys for each child
        for (let i = 0; i < childrenCount; i++) {
          const indexedKey = field.domainKey.replace('children[].', `children[${i}].`)
          defaults[indexedKey] = defaultValue
        }
      } else {
        defaults[field.domainKey] = defaultValue
      }
    }
  })

  return defaults
}

/**
 * Options for applying defaults to a form
 */
export interface ApplyDefaultsOptions {
  /** Only apply defaults to these specific fields */
  includeFields?: string[]
  /** Skip defaults for these fields */
  excludeFields?: string[]
  /** If true, overwrite existing values. If false, only fill empty fields */
  overwrite?: boolean
}

/**
 * Applies default values to current form values
 * By default, only fills empty fields (doesn't overwrite existing values)
 */
export function applyDefaultsToForm(
  currentValues: Record<string, any>,
  defaults: Record<string, any>,
  options: ApplyDefaultsOptions = {}
): Record<string, any> {
  const {
    includeFields,
    excludeFields,
    overwrite = false
  } = options

  const result = { ...currentValues }

  Object.entries(defaults).forEach(([key, value]) => {
    // Check if field should be included
    if (includeFields && !includeFields.includes(key)) {
      return
    }

    // Check if field should be excluded
    if (excludeFields && excludeFields.includes(key)) {
      return
    }

    // Apply default if overwrite is enabled OR field is empty
    if (overwrite || result[key] === undefined || result[key] === '' || result[key] === null) {
      result[key] = value
    }
  })

  return result
}

/**
 * Gets default values for spouse fields specifically
 * Uses the same priority order as getAllDefaults to ensure consistency
 */
export function getSpouseDefaults(schema: FormSchema): Record<string, any> {
  const defaults: Record<string, any> = {}

  // Use reverse priority order: SwissLife → Alptis → Common
  // This ensures carrier-specific defaults are compatible across platforms
  const allFields = [
    ...schema.platformSpecific.swisslifeone,
    ...schema.platformSpecific.alptis,
    ...schema.common
  ]

  const spouseFields = allFields.filter(f => f.domainKey.startsWith('spouse.'))

  spouseFields.forEach(field => {
    const defaultValue = computeDefaultValue(field)
    if (defaultValue !== undefined) {
      defaults[field.domainKey] = defaultValue
    }
  })

  // Add spouse present flag
  defaults['conjoint'] = true

  return defaults
}

/**
 * Gets default values for a child at a specific index
 * Uses the same priority order as getAllDefaults to ensure consistency
 */
export function getChildDefaults(schema: FormSchema, childIndex: number): Record<string, any> {
  const defaults: Record<string, any> = {}

  // Use reverse priority order: SwissLife → Alptis → Common
  // This ensures carrier-specific defaults are compatible across platforms
  const allFields = [
    ...schema.platformSpecific.swisslifeone,
    ...schema.platformSpecific.alptis,
    ...schema.common
  ]

  const childFields = allFields.filter(f => f.domainKey.startsWith('children[].'))

  childFields.forEach(field => {
    const defaultValue = computeDefaultValue(field)
    if (defaultValue !== undefined) {
      // Replace [] notation with actual index
      const key = field.domainKey.replace('children[].', `children[${childIndex}].`)
      defaults[key] = defaultValue
    }
  })

  return defaults
}

/**
 * Gets all defaults with business rules applied
 *
 * This function combines schema defaults with intelligent business rules
 * from the shared defaults module. Use this instead of getAllDefaults
 * when you want smart defaults (e.g., madelin based on status and age).
 *
 * @param schema - Form schema
 * @param currentValues - Current form values (used for conditional rules)
 * @param platform - Platform name (e.g., 'swisslifeone', 'alptis')
 * @returns Complete defaults with business rules applied
 */
export function getAllDefaultsWithBusinessRules(
  schema: FormSchema,
  currentValues?: Record<string, any>,
  platform?: string
): Record<string, any> {
  // Step 1: Get schema-based defaults
  const schemaDefaults = getAllDefaults(schema, currentValues)

  // Step 2: Merge with current values to create complete picture
  const mergedValues = { ...schemaDefaults, ...currentValues }

  // Step 3: Convert flat form values to nested structure for business rules
  const nestedValues = flatToNested(mergedValues)

  // Step 4: Apply business rules from shared module
  const context: DefaultContext = {
    source: 'manual',
    platform,
    currentValues: nestedValues
  }

  const businessDefaults = applyAllBusinessRules(nestedValues, context)

  // Step 5: Convert business rule defaults back to flat form format
  const flatBusinessDefaults: Record<string, any> = {}
  for (const [key, defaultValue] of Object.entries(businessDefaults)) {
    if (defaultValue && defaultValue.value !== undefined) {
      flatBusinessDefaults[key] = defaultValue.value
    }
  }

  // Step 6: Merge schema defaults with business rule defaults (business rules win)
  return { ...schemaDefaults, ...flatBusinessDefaults }
}

/**
 * Convert flat form values (e.g., "subscriber.firstName") to nested structure
 */
function flatToNested(flat: Record<string, any>): Record<string, any> {
  const nested: Record<string, any> = {}

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.')

    // Handle array notation like children[0].birthDate
    if (key.includes('[')) {
      const arrayMatch = key.match(/^(\w+)\[(\d+)\]\.(.+)$/)
      if (arrayMatch) {
        const [, arrayName, index, fieldName] = arrayMatch
        const idx = parseInt(index, 10)

        if (!nested[arrayName]) {
          nested[arrayName] = []
        }
        if (!nested[arrayName][idx]) {
          nested[arrayName][idx] = {}
        }
        nested[arrayName][idx][fieldName] = value
        continue
      }
    }

    // Handle regular nested notation
    if (parts.length === 2) {
      const [section, field] = parts
      if (!nested[section]) {
        nested[section] = {}
      }
      nested[section][field] = value
    } else if (parts.length === 1) {
      nested[parts[0]] = value
    }
  }

  return nested
}
