import baseDomainJson from '../../../admin/domain/base.domain.json'
import alptisConfigJson from '../../../admin/carriers/alptis.ui.json'
import swisslifeConfigJson from '../../../admin/carriers/swisslifeone.ui.json'

export interface FormFieldDefinition {
  domainKey: string
  type: 'text' | 'date' | 'select' | 'radio' | 'number'
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
    field: string
    equals: any
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
    field: string
    equals: any
  }
  repeat?: {
    countField: string
  }
  disabled?: boolean
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
  const alptisConfig = alptisConfigJson as CarrierConfig
  const swisslifeConfig = swisslifeConfigJson as CarrierConfig

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

function buildFieldDefinition(
  domainKey: string,
  baseDomain: BaseDomain,
  carrier?: 'alptis' | 'swisslifeone'
): FormFieldDefinition | null {
  const parts = domainKey.replace('[]', '').split('.')
  const category = parts[0]
  const fieldName = parts[1]

  const domainField = baseDomain.domains[category]?.[fieldName]
  if (!domainField) return null

  const field: FormFieldDefinition = {
    domainKey,
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
    field.showIf = domainField.showIf
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
        const alptisField = buildFieldDefinition(domainKey, baseDomain, 'alptis')
        const swisslifeField = buildFieldDefinition(domainKey, baseDomain, 'swisslifeone')
        if (alptisField) alptisSpecific.push(alptisField)
        if (swisslifeField) swisslifeSpecific.push(swisslifeField)
      } else {
        const field = buildFieldDefinition(domainKey, baseDomain)
        if (field) {
          common.push(field)
        }
      }
    } else if (inAlptis) {
      const field = buildFieldDefinition(domainKey, baseDomain, 'alptis')
      if (field) {
        alptisSpecific.push(field)
      }
    } else if (inSwisslife) {
      const field = buildFieldDefinition(domainKey, baseDomain, 'swisslifeone')
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
  const { baseDomain, alptisConfig, swisslifeConfig } = await loadConfigurations()
  return classifyFields(baseDomain, alptisConfig, swisslifeConfig)
}
