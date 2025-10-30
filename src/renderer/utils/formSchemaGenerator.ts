import baseDomainJson from '../../../data/domain/base.domain.json'

export interface FormFieldDefinition {
  domainKey: string
  type: 'text' | 'date' | 'select' | 'radio' | 'number' | 'toggle' | 'checkbox'
  label: string
  required: boolean
  options?: Array<{ value: string; label: string }>
  validation?: {
    pattern?: string
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
  }
  showIf?: {
    field?: string
    equals?: any
    oneOf?: any[]
    notOneOf?: any[]
    and?: Array<{
      field: string
      equals?: any
      oneOf?: any[]
      notOneOf?: any[]
    }>
  }
  repeat?: {
    countField: string
  }
  carrierOptions?: {
    [carrier: string]: Array<{ value: string; label: string }>
  }
  placeholder?: string
  disabled?: boolean
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url'
  autoGenerate?: boolean
  template?: string
  platform?: 'alptis' | 'swisslifeone'
  default?: any
  defaultExpression?: string
  defaultsByCarrier?: {
    [carrier: string]: any
  }
}

export interface FormSchema {
  common: FormFieldDefinition[]
  platformSpecific: {
    alptis: FormFieldDefinition[]
    swisslifeone: FormFieldDefinition[]
  }
}

interface DomainConfig {
  type: string
  label: string
  required?: boolean
  carriers?: string[]
  options?: Array<{ value: string; label: string }>
  optionSets?: {
    [carrier: string]: Array<{ value: string; label: string }>
  }
  validations?: {
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
  }
  pattern?: string
  placeholder?: string
  format?: string
  showIf?: {
    field?: string
    equals?: any
    oneOf?: any[]
    notOneOf?: any[]
    and?: Array<{
      field: string
      equals?: any
      oneOf?: any[]
      notOneOf?: any[]
    }>
  }
  repeat?: {
    countField: string
  }
  disabled?: boolean
  default?: any
  defaultExpression?: string
  defaultsByCarrier?: {
    [carrier: string]: any
  }
}

interface BaseDomain {
  domains: {
    [category: string]: {
      [field: string]: DomainConfig
    }
  }
}

interface CarrierConfig {
  carrier: string
  sections: Array<{
    fields: Array<string | {
      domainKey: string
      label?: string
      optionSet?: string
    }>
  }>
}

async function loadConfigurations() {
  const baseDomain = baseDomainJson as BaseDomain

  // Charger les UI forms depuis la DB (platforms_catalog.ui_form_json)
  // On ne lit plus les fichiers admin/carriers/*.ui.json
  const uiForms: Array<{ slug: string; ui: any | null }> = await (window as any).api.catalog.getUiForms()

  const alptis = uiForms.find(f => f.slug === 'alptis')?.ui
  const swisslife = uiForms.find(f => f.slug === 'swisslifeone')?.ui

  if (!alptis || !swisslife) {
    throw new Error('UI form manquant en DB (platforms_catalog.ui_form_json). Importez-les via scripts/platforms/import_ui_form.mjs')
  }

  const alptisConfig = alptis as CarrierConfig
  const swisslifeConfig = swisslife as CarrierConfig

  return { baseDomain, alptisConfig, swisslifeConfig }
}

function extractFieldsFromCarrier(config: CarrierConfig): Set<string> {
  const fields = new Set<string>()

  config.sections.forEach(section => {
    section.fields.forEach(field => {
      if (typeof field === 'string') {
        fields.add(field)
      } else {
        fields.add(field.domainKey)
      }
    })
  })

  return fields
}

function withCarrierPrefix(domainKey: string, carrier: 'alptis' | 'swisslifeone'): string {
  // Prefix full domainKey with carrier slug (e.g., alptis.subscriber.regime, alptis.children[].regime)
  return `${carrier}.${domainKey}`
}

function isGlobalToggleOrCommonKey(domainKey: string): boolean {
  // Keys that must stay unprefixed in showIf across carriers
  return (
    domainKey === 'conjoint' ||
    domainKey === 'enfants' ||
    domainKey === 'children.count' ||
    domainKey === 'project.dateEffet' ||
    domainKey === 'project.name' ||
    domainKey === 'subscriber.firstName' ||
    domainKey === 'subscriber.lastName' ||
    domainKey === 'subscriber.birthDate'
  )
}

function rewriteShowIf(
  showIf: DomainConfig['showIf'] | undefined,
  carrier: 'alptis' | 'swisslifeone' | undefined,
  alptisFields: Set<string>,
  swisslifeFields: Set<string>,
  baseDomain: BaseDomain
): DomainConfig['showIf'] | undefined {
  if (!showIf || !carrier) return showIf

  const prefixFieldIfNeeded = (fieldKey: string | undefined): string | undefined => {
    if (!fieldKey) return fieldKey
    if (isGlobalToggleOrCommonKey(fieldKey)) return fieldKey

    // Determine if referenced field is carrier-specific
    const parts = fieldKey.replace('[]', '').split('.')
    const category = parts[0]
    const name = parts[1]
    const domainField = (baseDomain as any).domains?.[category]?.[name]
    const carrierSpecific = domainField?.carrierSpecific === true || !!domainField?.optionSets

    const inA = alptisFields.has(fieldKey)
    const inS = swisslifeFields.has(fieldKey)
    const onlyOneCarrier = (inA && !inS) || (!inA && inS)

    if (carrierSpecific || onlyOneCarrier) {
      return withCarrierPrefix(fieldKey, carrier)
    }

    return fieldKey
  }

  if ((showIf as any).and) {
    return {
      and: (showIf as any).and.map((cond: any) => ({
        ...cond,
        field: prefixFieldIfNeeded(cond.field)
      }))
    }
  }

  return {
    ...showIf,
    field: prefixFieldIfNeeded(showIf.field)
  }
}

function buildFieldDefinition(
  domainKey: string,
  baseDomain: BaseDomain,
  carrier?: 'alptis' | 'swisslifeone',
  opts?: {
    prefixDomainKey?: boolean
    alptisFields?: Set<string>
    swisslifeFields?: Set<string>
  }
): FormFieldDefinition | null {
  const parts = domainKey.replace('[]', '').split('.')
  const category = parts[0]
  const fieldName = parts[1]

  // Gérer les champs répétables avec notation []
  let domainField
  if (domainKey.includes('[]')) {
    domainField = baseDomain.domains[category]?.['[]']?.[fieldName]
  } else {
    domainField = baseDomain.domains[category]?.[fieldName]
  }

  if (!domainField) return null

  let effectiveDomainKey = domainKey
  if (carrier && opts?.prefixDomainKey) {
    effectiveDomainKey = withCarrierPrefix(domainKey, carrier)
  }

  const field: FormFieldDefinition = {
    domainKey: effectiveDomainKey,
    type: domainField.type as any,
    label: domainField.label,
    required: domainField.required || false
  }

  if (domainField.validations) {
    field.validation = {
      minLength: domainField.validations.minLength,
      maxLength: domainField.validations.maxLength,
      min: domainField.validations.min,
      max: domainField.validations.max
    }
  }

  if (domainField.pattern) {
    field.validation = field.validation || {}
    field.validation.pattern = domainField.pattern
  }

  if (domainField.placeholder) {
    field.placeholder = domainField.placeholder
  }

  if (domainField.disabled) {
    field.disabled = domainField.disabled
  }

  if (domainField.showIf) {
    field.showIf = rewriteShowIf(domainField.showIf, carrier, opts?.alptisFields || new Set(), opts?.swisslifeFields || new Set(), baseDomain)
  }

  if (domainField.repeat) {
    field.repeat = domainField.repeat
  }

  if ((domainField as any).inputMode) {
    field.inputMode = (domainField as any).inputMode
  }

  if ((domainField as any).autoGenerate) {
    field.autoGenerate = (domainField as any).autoGenerate
  }

  if ((domainField as any).template) {
    field.template = (domainField as any).template
  }

  // Extract default values
  if (domainField.default !== undefined) {
    field.default = domainField.default
  }

  if (domainField.defaultExpression) {
    field.defaultExpression = domainField.defaultExpression
  }

  if (domainField.defaultsByCarrier) {
    if (carrier) {
      // If we have a specific carrier, use its default
      field.default = domainField.defaultsByCarrier[carrier]
    } else {
      // Otherwise, store all carrier-specific defaults
      field.defaultsByCarrier = domainField.defaultsByCarrier
    }
  }

  if (domainField.optionSets && carrier) {
    field.options = domainField.optionSets[carrier]
  } else if (domainField.options) {
    field.options = domainField.options
  }

  if (domainField.optionSets && !carrier) {
    field.carrierOptions = domainField.optionSets
  }

  return field
}

function classifyFields(
  baseDomain: BaseDomain,
  alptisConfig: CarrierConfig,
  swisslifeConfig: CarrierConfig
): FormSchema {
  const alptisFields = extractFieldsFromCarrier(alptisConfig)
  const swisslifeFields = extractFieldsFromCarrier(swisslifeConfig)

  const common: FormFieldDefinition[] = []
  const alptisSpecific: FormFieldDefinition[] = []
  const swisslifeSpecific: FormFieldDefinition[] = []

  const allFields = new Set([...alptisFields, ...swisslifeFields])

  allFields.forEach(domainKey => {
    const inAlptis = alptisFields.has(domainKey)
    const inSwisslife = swisslifeFields.has(domainKey)

    const parts = domainKey.replace('[]', '').split('.')
    const category = parts[0]
    const fieldName = parts[1]
    const domainField = baseDomain.domains[category]?.[fieldName]

    const isCarrierSpecific = domainField?.carrierSpecific === true || domainField?.optionSets

    if (inAlptis && inSwisslife) {
      if (isCarrierSpecific) {
        const alptisField = buildFieldDefinition(domainKey, baseDomain, 'alptis', { prefixDomainKey: true, alptisFields, swisslifeFields })
        const swisslifeField = buildFieldDefinition(domainKey, baseDomain, 'swisslifeone', { prefixDomainKey: true, alptisFields, swisslifeFields })
        if (alptisField) alptisSpecific.push(alptisField)
        if (swisslifeField) swisslifeSpecific.push(swisslifeField)
      } else {
        const field = buildFieldDefinition(domainKey, baseDomain)
        if (field) {
          common.push(field)
        }
      }
    } else if (inAlptis) {
      // Field only exists on Alptis UI → prefix domainKey
      const field = buildFieldDefinition(domainKey, baseDomain, 'alptis', { prefixDomainKey: true, alptisFields, swisslifeFields })
      if (field) {
        alptisSpecific.push(field)
      }
    } else if (inSwisslife) {
      // Field only exists on SwissLife UI → prefix domainKey
      const field = buildFieldDefinition(domainKey, baseDomain, 'swisslifeone', { prefixDomainKey: true, alptisFields, swisslifeFields })
      if (field) {
        swisslifeSpecific.push(field)
      }
    }
  })

  return {
    common,
    platformSpecific: {
      alptis: alptisSpecific,
      swisslifeone: swisslifeSpecific
    }
  }
}

export async function generateFormSchema(): Promise<FormSchema> {
  const { baseDomain, alptisConfig, swisslifeConfig} = await loadConfigurations()
  return classifyFields(baseDomain, alptisConfig, swisslifeConfig)
}

/**
 * Utility function to check if a field should be shown based on showIf conditions
 */
export function shouldShowField(
  field: FormFieldDefinition,
  values: Record<string, any>
): boolean {
  if (!field.showIf) {
    return true
  }

  // Support for 'and' condition (multiple conditions)
  if (field.showIf.and !== undefined) {
    return field.showIf.and.every(condition => {
      const fieldValue = values[condition.field]

      if (condition.equals !== undefined) {
        return fieldValue === condition.equals
      }

      if (condition.oneOf !== undefined) {
        if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
          return false
        }
        return condition.oneOf.includes(fieldValue)
      }

      if (condition.notOneOf !== undefined) {
        if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
          return true // Show by default if no value
        }
        return !condition.notOneOf.includes(fieldValue)
      }

      return true
    })
  }

  // Single condition logic
  const fieldValue = values[field.showIf.field!]

  // Support for 'equals' condition
  if (field.showIf.equals !== undefined) {
    return fieldValue === field.showIf.equals
  }

  // Support for 'oneOf' condition
  if (field.showIf.oneOf !== undefined) {
    // Field must have a value AND be in the oneOf array
    if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
      return false
    }
    return field.showIf.oneOf.includes(fieldValue)
  }

  // Support for 'notOneOf' condition
  if (field.showIf.notOneOf !== undefined) {
    // Show by default if no value, hide if value is in notOneOf array
    if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
      return true
    }
    return !field.showIf.notOneOf.includes(fieldValue)
  }

  return true
}
