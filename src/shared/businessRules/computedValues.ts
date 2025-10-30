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

  // Helper to get nested value
  const get = (path: string): any => {
    const parts = path.split('.')
    let current = leadData
    for (const part of parts) {
      if (current === undefined || current === null) return undefined
      current = current[part]
    }
    return current
  }

  // Helper to check if field is empty
  const isEmpty = (value: any): boolean => {
    return value === undefined || value === null || value === ''
  }

  // Helper to set computed value (only if empty or overwrite)
  const setComputed = (path: string, value: any): void => {
    const currentValue = get(path)
    if (isEmpty(currentValue) || overwriteExisting) {
      computed[path] = value
    }
  }

  // === SUBSCRIBER FIELDS ===

  // Department from postal code
  const subscriberPostalCode = get('subscriber.postalCode')
  if (subscriberPostalCode) {
    const department = inferDepartment(subscriberPostalCode)
    if (department) {
      setComputed('subscriber.departmentCode', department)
    }
  }

  // Status from regime
  const subscriberRegime = get('subscriber.regime')
  if (subscriberRegime && isEmpty(get('subscriber.status'))) {
    const inferredStatus = inferStatusFromRegime(subscriberRegime)
    if (inferredStatus) {
      setComputed('subscriber.status', inferredStatus)
    }
  }

  // Status from profession
  const subscriberProfession = get('subscriber.profession')
  if (subscriberProfession && isEmpty(get('subscriber.status'))) {
    const inferredStatus = inferStatusFromProfession(subscriberProfession)
    if (inferredStatus) {
      setComputed('subscriber.status', inferredStatus)
    }
  }

  // === PROJECT FIELDS ===

  // Madelin based on status and age
  const subscriberStatus = get('subscriber.status')
  const subscriberBirthDate = get('subscriber.birthDate')
  const madelinValue = computeMadelin(subscriberStatus, subscriberBirthDate)

  // Always compute madelin (it's a computed field, not a default)
  // But only set if field is empty or we're overwriting
  if (isEmpty(get('project.madelin')) || overwriteExisting) {
    computed['project.madelin'] = madelinValue
  }

  // === SPOUSE FIELDS ===

  // Department from postal code
  const spousePostalCode = get('spouse.postalCode')
  if (spousePostalCode) {
    const department = inferDepartment(spousePostalCode)
    if (department) {
      setComputed('spouse.departmentCode', department)
    }
  }

  // Status from regime
  const spouseRegime = get('spouse.regime')
  if (spouseRegime && isEmpty(get('spouse.status'))) {
    const inferredStatus = inferStatusFromRegime(spouseRegime)
    if (inferredStatus) {
      setComputed('spouse.status', inferredStatus)
    }
  }

  // === CHILDREN FIELDS ===

  const children = get('children')
  if (Array.isArray(children)) {
    children.forEach((child, index) => {
      const childPostalCode = child.postalCode
      if (childPostalCode) {
        const department = inferDepartment(childPostalCode)
        if (department && (isEmpty(child.departmentCode) || overwriteExisting)) {
          computed[`children[${index}].departmentCode`] = department
        }
      }
    })
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

  // Handle array notation
  const arrayMatch = fieldPath.match(/^children\[(\d+)\]\.(.+)$/)
  if (arrayMatch) {
    const index = arrayMatch[1]
    const childField = arrayMatch[2]
    const pattern = `children.*.${childField}`
    const deps = dependencies[pattern] || []
    return deps.map((dep) => dep.replace('*', `[${index}]`))
  }

  return dependencies[fieldPath] || []
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

  // Handle array notation
  const arrayMatch = changedFieldPath.match(/^children\[(\d+)\]\.(.+)$/)
  if (arrayMatch) {
    const index = arrayMatch[1]
    const childField = arrayMatch[2]
    if (childField === 'postalCode') {
      return [`children[${index}].departmentCode`]
    }
  }

  return affects[changedFieldPath] || []
}
