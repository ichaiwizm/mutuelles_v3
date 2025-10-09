import { FormSchema, FormFieldDefinition } from './formSchemaGenerator'

function validateField(
  field: FormFieldDefinition,
  value: any
): string | undefined {
  if (field.required && (!value || value === '')) {
    return `${field.label} est requis`
  }

  if (!value || value === '') {
    return undefined
  }

  if (field.validation) {
    if (field.validation.pattern) {
      const regex = new RegExp(field.validation.pattern)
      if (!regex.test(value)) {
        return `${field.label} ne respecte pas le format attendu`
      }
    }

    if (field.validation.minLength && value.length < field.validation.minLength) {
      return `${field.label} doit contenir au moins ${field.validation.minLength} caractères`
    }

    if (field.validation.maxLength && value.length > field.validation.maxLength) {
      return `${field.label} ne doit pas dépasser ${field.validation.maxLength} caractères`
    }

    if (field.validation.min !== undefined && Number(value) < field.validation.min) {
      return `${field.label} doit être supérieur ou égal à ${field.validation.min}`
    }

    if (field.validation.max !== undefined && Number(value) > field.validation.max) {
      return `${field.label} doit être inférieur ou égal à ${field.validation.max}`
    }
  }

  if (field.type === 'date') {
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/
    if (!dateRegex.test(value)) {
      return `${field.label} doit être au format JJ/MM/AAAA`
    }

    const [day, month, year] = value.split('/').map(Number)
    const date = new Date(year, month - 1, day)

    if (
      date.getDate() !== day ||
      date.getMonth() !== month - 1 ||
      date.getFullYear() !== year
    ) {
      return `${field.label} n'est pas une date valide`
    }
  }

  return undefined
}

function shouldValidateField(
  field: FormFieldDefinition,
  values: Record<string, any>
): boolean {
  if (!field.showIf) {
    return true
  }

  return values[field.showIf.field] === field.showIf.equals
}

export function validateForm(
  schema: FormSchema,
  values: Record<string, any>
): Record<string, string> {
  const errors: Record<string, string> = {}

  const allFields = [
    ...schema.common,
    ...schema.platformSpecific.alptis,
    ...schema.platformSpecific.swisslifeone
  ]

  allFields.forEach(field => {
    if (!shouldValidateField(field, values)) {
      return
    }

    const error = validateField(field, values[field.domainKey])
    if (error) {
      errors[field.domainKey] = error
    }
  })

  const childrenCount = values['children.count'] || 0
  const childrenFields = allFields.filter(f => f.domainKey.startsWith('children[].'))

  for (let i = 0; i < childrenCount; i++) {
    childrenFields.forEach(field => {
      const childFieldKey = `children[${i}].${field.domainKey.replace('children[].', '')}`
      const childField = { ...field, domainKey: childFieldKey }

      if (!shouldValidateField(childField, values)) {
        return
      }

      const error = validateField(childField, values[childFieldKey])
      if (error) {
        errors[childFieldKey] = error
      }
    })
  }

  return errors
}
