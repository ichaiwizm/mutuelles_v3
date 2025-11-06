/**
 * Form schema generator from Zod schemas
 *
 * Replaces the legacy JSON-based form generator.
 * Generates form schemas from Zod + TypeScript metadata.
 */

import { z } from 'zod'
import { formMetadata, type FieldMetadata } from './form-metadata'
import {
  subscriberSchema,
  spouseSchema,
  childSchema,
  projectSchema,
} from '../../../core/domain/lead.schema'

export interface FormFieldDefinition {
  domainKey: string
  type: 'text' | 'date' | 'select' | 'radio' | 'number' | 'toggle' | 'checkbox' | 'email' | 'tel'
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
  }
  placeholder?: string
  disabled?: boolean
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url'
  autoGenerate?: boolean
  template?: string
  default?: any
}

export interface FormSchema {
  common: FormFieldDefinition[]
  platformSpecific: {
    alptis: FormFieldDefinition[]
    swisslifeone: FormFieldDefinition[]
  }
}

/**
 * Extract required field names from Zod schema
 */
function getRequiredFields(schema: z.ZodObject<any>): Set<string> {
  const required = new Set<string>()
  const shape = schema.shape

  for (const [key, value] of Object.entries(shape)) {
    if (value instanceof z.ZodType) {
      // Check if field is optional
      if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodNullable)) {
        required.add(key)
      }
    }
  }

  return required
}

/**
 * Extract validation from Zod schema
 */
function extractValidation(zodField: z.ZodType): FormFieldDefinition['validation'] {
  const validation: FormFieldDefinition['validation'] = {}

  // Extract from ZodString
  if (zodField instanceof z.ZodString) {
    const checks = (zodField as any)._def.checks || []

    for (const check of checks) {
      if (check.kind === 'min') validation.minLength = check.value
      if (check.kind === 'max') validation.maxLength = check.value
      if (check.kind === 'regex') validation.pattern = check.regex.source
    }
  }

  // Extract from ZodNumber
  if (zodField instanceof z.ZodNumber) {
    const checks = (zodField as any)._def.checks || []

    for (const check of checks) {
      if (check.kind === 'min') validation.min = check.value
      if (check.kind === 'max') validation.max = check.value
    }
  }

  return Object.keys(validation).length > 0 ? validation : undefined
}

/**
 * Build a form field definition from Zod schema + metadata
 */
function buildFieldDefinition(
  section: string,
  fieldName: string,
  zodSchema: z.ZodObject<any>,
  metadata: FieldMetadata,
  requiredFields: Set<string>
): FormFieldDefinition {
  const domainKey = `${section}.${fieldName}`
  const zodField = zodSchema.shape[fieldName]

  // Build base field
  const field: FormFieldDefinition = {
    domainKey,
    type: metadata.type,
    label: metadata.label,
    required: requiredFields.has(fieldName),
  }

  // Add metadata
  if (metadata.options) field.options = metadata.options
  if (metadata.placeholder) field.placeholder = metadata.placeholder
  if (metadata.disabled) field.disabled = metadata.disabled
  if (metadata.inputMode) field.inputMode = metadata.inputMode
  if (metadata.autoGenerate) field.autoGenerate = metadata.autoGenerate
  if (metadata.template) field.template = metadata.template
  if (metadata.defaultValue) field.default = metadata.defaultValue
  if (metadata.showIf) field.showIf = metadata.showIf

  // Extract validation from Zod
  if (zodField) {
    const validation = extractValidation(zodField)
    if (validation) field.validation = validation
  }

  // UI uses JJ/MM/AAAA; ignore Zod ISO regex patterns for date fields
  if (field.type === 'date' && field.validation?.pattern) {
    delete field.validation.pattern
  }

  return field
}

/**
 * Generate form schema from Zod schemas + metadata
 *
 * This replaces the legacy generateFormSchema() from formSchemaGenerator.ts
 */
export function generateFormSchema(): FormSchema {
  const common: FormFieldDefinition[] = []
  const alptisSpecific: FormFieldDefinition[] = []
  const swisslifeSpecific: FormFieldDefinition[] = []

  // Get required fields for each section
  const subscriberRequired = getRequiredFields(subscriberSchema)
  const spouseRequired = getRequiredFields(spouseSchema)
  const childRequired = getRequiredFields(childSchema)
  const projectRequired = getRequiredFields(projectSchema)

  // Generate subscriber fields
  for (const [fieldName, metadata] of Object.entries(formMetadata.subscriber)) {
    const field = buildFieldDefinition(
      'subscriber',
      fieldName,
      subscriberSchema,
      metadata,
      subscriberRequired
    )
    common.push(field)
  }

  // Generate spouse fields
  for (const [fieldName, metadata] of Object.entries(formMetadata.spouse)) {
    const field = buildFieldDefinition(
      'spouse',
      fieldName,
      spouseSchema,
      metadata,
      spouseRequired
    )
    common.push(field)
  }

  // Generate children fields
  for (const [fieldName, metadata] of Object.entries(formMetadata.children)) {
    const field = buildFieldDefinition(
      'children',
      fieldName,
      childSchema,
      metadata,
      childRequired
    )
    field.domainKey = `children[].${fieldName}` // Array notation
    common.push(field)
  }

  // Generate project fields
  for (const [fieldName, metadata] of Object.entries(formMetadata.project)) {
    const field = buildFieldDefinition(
      'project',
      fieldName,
      projectSchema,
      metadata,
      projectRequired
    )
    common.push(field)
  }

  return {
    common,
    platformSpecific: {
      alptis: alptisSpecific,
      swisslifeone: swisslifeSpecific,
    },
  }
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

  const fieldValue = values[field.showIf.field!]

  // Support for 'equals' condition
  if (field.showIf.equals !== undefined) {
    return fieldValue === field.showIf.equals
  }

  // Support for 'oneOf' condition
  if (field.showIf.oneOf !== undefined) {
    if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
      return false
    }
    return field.showIf.oneOf.includes(fieldValue)
  }

  return true
}

/**
 * Evaluate default expressions like "firstOfNextMonth"
 */
export function evaluateDefaultExpression(expression: string): any {
  if (expression === 'firstOfNextMonth') {
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const dd = '01'
    const mm = String(nextMonth.getMonth() + 1).padStart(2, '0')
    const yyyy = String(nextMonth.getFullYear())
    return `${dd}/${mm}/${yyyy}` // JJ/MM/AAAA
  }

  return undefined
}

/**
 * Get default value for a field
 */
export function getFieldDefault(field: FormFieldDefinition): any {
  if (field.default === 'firstOfNextMonth') {
    return evaluateDefaultExpression(field.default)
  }
  return field.default
}
