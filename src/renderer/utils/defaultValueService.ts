import { FormSchema, FormFieldDefinition } from './formSchemaGenerator'

/**
 * Default value expressions that can be evaluated at runtime
 */
type DefaultExpression = 'firstOfNextMonth' | 'today' | 'currentMonth'

/**
 * Evaluates a default expression to its actual value
 */
function evaluateDefaultExpression(expression: DefaultExpression): string {
  switch (expression) {
    case 'firstOfNextMonth': {
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      nextMonth.setDate(1)
      return `01/${String(nextMonth.getMonth() + 1).padStart(2, '0')}/${nextMonth.getFullYear()}`
    }

    case 'today': {
      const today = new Date()
      return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
    }

    case 'currentMonth': {
      const now = new Date()
      return `01/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
    }

    default:
      return ''
  }
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
 */
export function getAllDefaults(schema: FormSchema, currentValues?: Record<string, any>): Record<string, any> {
  const defaults: Record<string, any> = {}

  // Collect all fields from schema
  const allFields = [
    ...schema.common,
    ...schema.platformSpecific.alptis,
    ...schema.platformSpecific.swisslifeone
  ]

  // Use a Map to deduplicate by domainKey, keeping the first occurrence
  const seenKeys = new Set<string>()

  // Compute defaults for each field
  allFields.forEach(field => {
    // Skip if we've already processed this domainKey
    if (seenKeys.has(field.domainKey)) {
      return
    }

    seenKeys.add(field.domainKey)

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
 */
export function getSpouseDefaults(schema: FormSchema): Record<string, any> {
  const defaults: Record<string, any> = {}

  const allFields = [
    ...schema.common,
    ...schema.platformSpecific.alptis,
    ...schema.platformSpecific.swisslifeone
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
 */
export function getChildDefaults(schema: FormSchema, childIndex: number): Record<string, any> {
  const defaults: Record<string, any> = {}

  const allFields = [
    ...schema.common,
    ...schema.platformSpecific.alptis,
    ...schema.platformSpecific.swisslifeone
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
