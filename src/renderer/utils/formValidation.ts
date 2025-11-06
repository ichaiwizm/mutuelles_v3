import { FormSchema, FormFieldDefinition } from './formSchemaGenerator'

function calculateAge(birthDateStr: string): number {
  const [day, month, year] = birthDateStr.split('/').map(Number)
  const birthDate = new Date(year, month - 1, day)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

function validateField(
  field: FormFieldDefinition,
  value: any
): string | undefined {
  const stripCarrierPrefix = (k: string) => {
    return k.startsWith('alptis.') || k.startsWith('swisslifeone.') ? k.substring(k.indexOf('.') + 1) : k
  }
  // Check for empty values (including empty string for number fields)
  const isEmpty = value === undefined || value === null || value === ''

  if (field.required && isEmpty) {
    return `${field.label} est requis`
  }

  if (isEmpty) {
    return undefined
  }

  // Validation: Text fields - check for whitespace-only values
  if (field.type === 'text' && field.required) {
    if (value.trim() === '') {
      return `${field.label} ne peut pas contenir uniquement des espaces`
    }
  }

  // Validation: Number fields - check postal code has 5 digits
  if (field.type === 'number' && field.domainKey.includes('postalCode')) {
    const postalStr = String(value)
    if (postalStr.length !== 5) {
      return 'Le code postal doit contenir exactement 5 chiffres'
    }
  }

  // Validation: Number fields - check department has 2-3 digits
  if (field.type === 'number' && field.domainKey.includes('departmentCode')) {
    const deptStr = String(value)
    if (deptStr.length < 1 || deptStr.length > 3) {
      return 'Le département doit contenir 1 à 3 chiffres'
    }
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

    // Validation: Children birth date - max 26 years, min 0 years, no future dates
    if (field.domainKey.includes('children[') && field.domainKey.includes('birthDate')) {
      const age = calculateAge(value)
      if (age < 0) {
        return 'La date de naissance ne peut pas être dans le futur'
      }
      if (age > 26) {
        return `Âge maximum pour un enfant : 26 ans (actuellement ${age} ans)`
      }
    }

    // Validation: Adults birth date - min 18 years, max 120 years, no future dates
    {
      const bare = stripCarrierPrefix(field.domainKey)
      if (bare === 'subscriber.birthDate' || bare === 'spouse.birthDate') {
        const age = calculateAge(value)
        if (age < 0) {
          return 'La date de naissance ne peut pas être dans le futur'
        }
        if (age < 18) {
          return `Âge minimum requis : 18 ans (actuellement ${age} ans)`
        }
        if (age > 120) {
          return `Âge maximum : 120 ans (actuellement ${age} ans)`
        }
      }
    }

    // Validation: Date d'effet - must be today or future
    {
      const bare = stripCarrierPrefix(field.domainKey)
      if (bare === 'project.dateEffet') {
        const dateEffet = new Date(year, month - 1, day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (dateEffet < today) {
          return 'La date d\'effet doit être aujourd\'hui ou dans le futur'
        }
      }
    }
  }

  return undefined
}

function shouldValidateField(
  field: FormFieldDefinition,
  values: Record<string, any>
): boolean {
  // Skip spouse fields entirely when "conjoint" toggle is not active
  {
    const key = field.domainKey
    const isSpouseField = key.startsWith('spouse.') || key.includes('.spouse.')
    if (isSpouseField && values['conjoint'] !== true) {
      return false
    }
  }

  if (!field.showIf) {
    return true
  }

  // Conjonction de conditions
  if ((field.showIf as any).and !== undefined) {
    const all = (field.showIf as any).and as Array<{ field: string; equals?: any; oneOf?: any[]; notOneOf?: any[] }>
    return all.every(cond => {
      const v = values[cond.field]
      if (cond.equals !== undefined) return v === cond.equals
      if (cond.oneOf !== undefined) {
        if (v === undefined || v === null || v === '') return false
        return cond.oneOf.includes(v)
      }
      if (cond.notOneOf !== undefined) {
        if (v === undefined || v === null || v === '') return true
        return !cond.notOneOf.includes(v)
      }
      return true
    })
  }

  const fieldValue = values[field.showIf.field!]

  // equals
  if (field.showIf.equals !== undefined) {
    return fieldValue === field.showIf.equals
  }

  // oneOf
  if (field.showIf.oneOf !== undefined) {
    if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
      return false
    }
    return field.showIf.oneOf.includes(fieldValue)
  }

  // notOneOf
  if (field.showIf.notOneOf !== undefined) {
    if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
      return true
    }
    return !field.showIf.notOneOf.includes(fieldValue)
  }

  return true
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
  const childrenFields = allFields.filter(f => f.domainKey.includes('children[].'))

  for (let i = 0; i < childrenCount; i++) {
    childrenFields.forEach(field => {
      const childFieldKey = field.domainKey.replace('children[]', `children[${i}]`)
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
