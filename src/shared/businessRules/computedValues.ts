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
function inferDepartment(postalCode: string | number): string | null {
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
function computeMadelin(
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
function inferStatusFromRegime(regime: string | undefined): string | null {
  if (regime === 'TNS') return 'TNS'
  if (regime === 'SECURITE_SOCIALE' || regime === 'REGIME_SALARIES_AGRICOLES') return 'SALARIE'
  return null
}

/**
 * Infer status from profession text
 */
function inferStatusFromProfession(profession: string | undefined): string | null {
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
 * Infer regime from status when regime is missing
 */
function inferRegimeFromStatus(status: string | undefined): string | null {
  if (!status) return null
  if (status === 'SALARIE') return 'SECURITE_SOCIALE'
  if (status === 'TNS' || status === 'EXPLOITANT_AGRICOLE') return 'TNS'
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
    if (subscriberRegime) {
      const inferredStatus = inferStatusFromRegime(subscriberRegime)
      if (inferredStatus) setComputedWithPrefix(prefix, 'subscriber.status', inferredStatus)
    }
    // Also infer regime from status if regime missing
    const subStatusForRegime = getWithPrefix(prefix, 'subscriber.status')
    if (!subscriberRegime && subStatusForRegime) {
      const inferredRegime = inferRegimeFromStatus(subStatusForRegime)
      if (inferredRegime) setComputedWithPrefix(prefix, 'subscriber.regime', inferredRegime)
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
    if (spouseRegime) {
      const inferredStatus = inferStatusFromRegime(spouseRegime)
      if (inferredStatus) setComputedWithPrefix(prefix, 'spouse.status', inferredStatus)
    }
    // Also infer spouse regime from status if missing
    const spouseStatus = getWithPrefix(prefix, 'spouse.status')
    if (!spouseRegime && spouseStatus) {
      const inferredRegime = inferRegimeFromStatus(spouseStatus)
      if (inferredRegime) setComputedWithPrefix(prefix, 'spouse.regime', inferredRegime)
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

        // Inherit regime from subscriber if child doesn't have one
        const childRegime = child?.regime
        if (isEmpty(childRegime)) {
          const inheritedRegime = subscriberRegime || inferRegimeFromStatus(subscriberStatus)
          if (inheritedRegime) {
            const key = prefix ? `${prefix}.children[${index}].regime` : `children[${index}].regime`
            computed[key] = inheritedRegime
          }
        }
      })
    }
  }

  return computed
}
