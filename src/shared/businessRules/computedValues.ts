/**
 * Computed values for lead data
 *
 * This module contains pure business logic for computing derived field values
 * based on other field values. These are NOT defaults - they are values that
 * should be reactively computed whenever dependencies change.
 *
 * Key distinction:
 * - Defaults: Static initial values (e.g., regime = "SECURITE_SOCIALE")
 * - Computed: Derived values (e.g., madelin = true if status=TNS and age<70)
 */

import { calculateAge } from '../defaults/expressions'

/**
 * Result of computing derived fields
 */
export interface ComputedFieldsResult {
  /** Fields that were computed */
  [fieldPath: string]: any
}

/**
 * Infer department code from French postal code
 *
 * French postal codes: DDDXX where DDD = department
 * Special cases:
 * - Corsica: 2A (20000-20199), 2B (20200-20999)
 * - Overseas: 97X (971-978)
 */
export function inferDepartment(postalCode: string | number): string | null {
  if (!postalCode) return null

  const cleanCode = String(postalCode).trim().replace(/\s/g, '')
  if (!/^\d{5}$/.test(cleanCode)) return null

  const firstTwo = cleanCode.substring(0, 2)
  const firstThree = cleanCode.substring(0, 3)

  // Overseas departments
  if (firstThree.startsWith('97')) {
    return firstThree
  }

  // Corsica
  if (firstTwo === '20') {
    const code = parseInt(cleanCode, 10)
    return code >= 20000 && code <= 20199 ? '2A' : '2B'
  }

  // Standard departments (01-95)
  return firstTwo
}

/**
 * Determine if Madelin deduction should be enabled
 *
 * Madelin is available for TNS or EXPLOITANT_AGRICOLE under 70 years old
 */
export function computeMadelin(
  status: string | undefined,
  birthDate: string | undefined
): boolean {
  // Must be TNS or EXPLOITANT_AGRICOLE
  const eligibleStatus = status === 'TNS' || status === 'EXPLOITANT_AGRICOLE'
  if (!eligibleStatus) return false

  // Must be under 70 years old
  if (birthDate) {
    const age = calculateAge(birthDate)
    if (age !== null && age >= 70) return false
  }

  return true
}

/**
 * Infer status from regime
 */
export function inferStatusFromRegime(regime: string | undefined): string | null {
  if (regime === 'TNS') return 'TNS'
  return null
}

/**
 * Infer status from profession text
 */
export function inferStatusFromProfession(profession: string | undefined): string | null {
  if (!profession) return null

  const lower = profession.toLowerCase()

  if (lower.includes('agricole') || lower.includes('agriculteur')) {
    return 'EXPLOITANT_AGRICOLE'
  }

  if (lower.includes('indépendant') || lower.includes('tns') || lower.includes('libéral')) {
    return 'TNS'
  }

  return null
}

/**
 * Compute all derived fields for a lead
 *
 * This function computes values that depend on other fields.
 * It should be called whenever dependency fields change.
 *
 * @param leadData - Current lead data
 * @param options - Options for computation
 * @returns Object with computed field values
 */
export function computeDerivedFields(
  leadData: Record<string, any>,
  options: { overwriteExisting?: boolean } = {}
): ComputedFieldsResult {
  const { overwriteExisting = false } = options
  const computed: ComputedFieldsResult = {}

  const prefixes = ['', 'alptis', 'swisslifeone']

  const getWithPrefix = (prefix: string, path: string): any => {
    const fullPath = prefix ? `${prefix}.${path}` : path
    const parts = fullPath.split('.')
    let current = leadData
    for (const part of parts) {
      if (current === undefined || current === null) return undefined
      current = current[part]
    }
    return current
  }

  const isEmpty = (value: any): boolean => value === undefined || value === null || value === ''

  const setComputedWithPrefix = (prefix: string, path: string, value: any): void => {
    const fullPath = prefix ? `${prefix}.${path}` : path
    const currentValue = getWithPrefix('', fullPath)
    if (isEmpty(currentValue) || overwriteExisting) {
      computed[fullPath] = value
    }
  }

  for (const prefix of prefixes) {
    // === SUBSCRIBER FIELDS ===
    const subscriberPostalCode = getWithPrefix(prefix, 'subscriber.postalCode')
    if (subscriberPostalCode) {
      const department = inferDepartment(subscriberPostalCode)
      if (department) {
        setComputedWithPrefix(prefix, 'subscriber.departmentCode', department)
      }
    }

    const subscriberRegime = getWithPrefix(prefix, 'subscriber.regime')
    if (subscriberRegime && isEmpty(getWithPrefix(prefix, 'subscriber.status'))) {
      const inferredStatus = inferStatusFromRegime(subscriberRegime)
      if (inferredStatus) {
        setComputedWithPrefix(prefix, 'subscriber.status', inferredStatus)
      }
    }

    const subscriberProfession = getWithPrefix(prefix, 'subscriber.profession')
    if (subscriberProfession && isEmpty(getWithPrefix(prefix, 'subscriber.status'))) {
      const inferredStatus = inferStatusFromProfession(subscriberProfession)
      if (inferredStatus) {
        setComputedWithPrefix(prefix, 'subscriber.status', inferredStatus)
      }
    }

    // === PROJECT FIELDS ===
    const subscriberStatus = getWithPrefix(prefix, 'subscriber.status')
    const subscriberBirthDate = getWithPrefix(prefix, 'subscriber.birthDate')
    const madelinValue = computeMadelin(subscriberStatus, subscriberBirthDate)
    if (isEmpty(getWithPrefix(prefix, 'project.madelin')) || overwriteExisting) {
      const key = prefix ? `${prefix}.project.madelin` : 'project.madelin'
      computed[key] = madelinValue
    }

    // === SPOUSE FIELDS ===
    const spousePostalCode = getWithPrefix(prefix, 'spouse.postalCode')
    if (spousePostalCode) {
      const department = inferDepartment(spousePostalCode)
      if (department) {
        setComputedWithPrefix(prefix, 'spouse.departmentCode', department)
      }
    }

    const spouseRegime = getWithPrefix(prefix, 'spouse.regime')
    if (spouseRegime && isEmpty(getWithPrefix(prefix, 'spouse.status'))) {
      const inferredStatus = inferStatusFromRegime(spouseRegime)
      if (inferredStatus) {
        setComputedWithPrefix(prefix, 'spouse.status', inferredStatus)
      }
    }

    // === CHILDREN FIELDS ===
    const children = getWithPrefix(prefix, 'children')
    if (Array.isArray(children)) {
      children.forEach((child: any, index: number) => {
        const childPostalCode = child?.postalCode
        if (childPostalCode) {
          const department = inferDepartment(childPostalCode)
          const hasDept = child?.departmentCode
          if (department && (isEmpty(hasDept) || overwriteExisting)) {
            const key = prefix ? `${prefix}.children[${index}].departmentCode` : `children[${index}].departmentCode`
            computed[key] = department
          }
        }
      })
    }
  }

  return computed
}

/**
 * Get dependencies for a field (which fields affect its computed value)
 *
 * This is useful for implementing reactive updates in forms.
 *
 * @param fieldPath - Field path (e.g., "project.madelin")
 * @returns Array of field paths that this field depends on
 */
export function getFieldDependencies(fieldPath: string): string[] {
  const dependencies: Record<string, string[]> = {
    'subscriber.departmentCode': ['subscriber.postalCode'],
    'subscriber.status': ['subscriber.regime', 'subscriber.profession'],
    'project.madelin': ['subscriber.status', 'subscriber.birthDate'],
    'spouse.departmentCode': ['spouse.postalCode'],
    'spouse.status': ['spouse.regime'],
    // Children fields are indexed, so we use a pattern
    'children.*.departmentCode': ['children.*.postalCode'],
  }

  const carriers = ['alptis', 'swisslifeone']
  const carrier = carriers.find(c => fieldPath.startsWith(c + '.'))
  const strip = (s: string) => (carrier ? s.slice(carrier.length + 1) : s)
  const bare = strip(fieldPath)

  const arrayMatch = bare.match(/^children\[(\d+)\]\.(.+)$/)
  if (arrayMatch) {
    const index = arrayMatch[1]
    const childField = arrayMatch[2]
    const pattern = `children.*.${childField}`
    const deps = dependencies[pattern] || []
    return deps.map(dep => (carrier ? `${carrier}.${dep.replace('*', `[${index}]`)}` : dep.replace('*', `[${index}]`)))
  }

  const deps = dependencies[bare] || []
  return deps.map(d => (carrier ? `${carrier}.${d}` : d))
}

/**
 * Check if a field value change should trigger recomputation
 *
 * @param changedFieldPath - Path of the field that changed
 * @returns Array of field paths that should be recomputed
 */
export function getAffectedFields(changedFieldPath: string): string[] {
  const affects: Record<string, string[]> = {
    'subscriber.postalCode': ['subscriber.departmentCode'],
    'subscriber.regime': ['subscriber.status', 'project.madelin'],
    'subscriber.profession': ['subscriber.status', 'project.madelin'],
    'subscriber.status': ['project.madelin'],
    'subscriber.birthDate': ['project.madelin'],
    'spouse.postalCode': ['spouse.departmentCode'],
    'spouse.regime': ['spouse.status'],
  }

  const carriers = ['alptis', 'swisslifeone']
  const carrier = carriers.find(c => changedFieldPath.startsWith(c + '.'))
  const strip = (s: string) => (carrier ? s.slice(carrier.length + 1) : s)
  const bare = strip(changedFieldPath)

  const arrayMatch = bare.match(/^children\[(\d+)\]\.(.+)$/)
  if (arrayMatch) {
    const index = arrayMatch[1]
    const childField = arrayMatch[2]
    if (childField === 'postalCode') {
      const p = `children[${index}].departmentCode`
      return [carrier ? `${carrier}.${p}` : p]
    }
  }

  const res = affects[bare] || []
  return res.map(p => (carrier ? `${carrier}.${p}` : p))
}
