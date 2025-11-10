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
 * Infer professional category from profession text
 *
 * Maps profession descriptions to standardized categories
 */
function inferCategoryFromProfession(profession: string | undefined): string | null {
  if (!profession) return null

  // Normalize typographic apostrophes (U+2019 ') to ASCII apostrophe (')
  const lower = profession.toLowerCase().trim().replace(/['']/g, "'")

  // Professions libérales
  if (
    lower.includes('profession libérale') ||
    lower.includes('professionnel libéral') ||
    lower.includes('libéral')
  ) {
    return 'PROFESSIONS_LIBERALES_ET_ASSIMILES'
  }

  // Artisans
  if (lower.includes('artisan')) {
    return 'ARTISANS'
  }

  // Chefs d'entreprise
  if (
    lower.includes('chef d\'entreprise') ||
    lower.includes('dirigeant') ||
    lower.includes('gérant')
  ) {
    return 'CHEFS_ENTREPRISE'
  }

  // Commerçants
  if (lower.includes('commerçant') || lower.includes('commercant')) {
    return 'COMMERCANTS'
  }

  // Exploitants agricoles
  if (lower.includes('agricole') || lower.includes('agriculteur') || lower.includes('exploitant')) {
    return 'EXPLOITANTS_AGRICOLES'
  }

  // Salariés or unemployed → EXPLICITLY null (not undefined) to prevent incorrect defaults
  if (
    lower.includes('salarié') ||
    lower.includes('salarie') ||
    lower.includes('recherche d\'emploi') ||
    lower.includes('recherche emploi') ||  // Variant without apostrophe
    lower.includes('sans emploi') ||
    lower.includes('chômeur') ||
    lower.includes('chomeur')
  ) {
    return null
  }

  return null
}

/**
 * Infer work framework from regime
 *
 * Maps regime to work framework (INDEPENDANT or SALARIE)
 */
function inferWorkFrameworkFromRegime(regime: string | undefined): string | null {
  if (!regime) return null

  const upper = regime.toUpperCase()

  // Independent workers (TNS)
  if (upper === 'TNS' || upper === 'SECURITE_SOCIALE_INDEPENDANTS') {
    return 'INDEPENDANT'
  }

  // Salaried workers
  if (
    upper === 'REGIME_GENERAL' ||
    upper === 'SECURITE_SOCIALE' ||
    upper === 'SALARIE' ||
    upper.includes('SALARIE')
  ) {
    return 'SALARIE'
  }

  return null
}

/**
 * Compute simulation type based on family situation
 *
 * Returns "couple" if spouse exists, "celibataire" otherwise
 */
function computeSimulationType(hasSpouse: boolean): string {
  return hasSpouse ? 'couple' : 'celibataire'
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

    // Infer category from profession
    if (subscriberProfession) {
      const inferredCategory = inferCategoryFromProfession(subscriberProfession)
      if (inferredCategory) {
        setComputedWithPrefix(prefix, 'subscriber.category', inferredCategory)
      }
    }

    // Infer work framework from regime
    if (subscriberRegime) {
      const inferredWorkFramework = inferWorkFrameworkFromRegime(subscriberRegime)
      if (inferredWorkFramework) {
        setComputedWithPrefix(prefix, 'subscriber.workFramework', inferredWorkFramework)
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

    // Compute simulation type based on spouse presence
    const spouseBirthDate = getWithPrefix(prefix, 'spouse.birthDate')
    const spouseFirstName = getWithPrefix(prefix, 'spouse.firstName')
    const hasSpouse = !isEmpty(spouseBirthDate) || !isEmpty(spouseFirstName)
    const simulationTypeValue = computeSimulationType(hasSpouse)
    if (isEmpty(getWithPrefix(prefix, 'project.simulationType')) || overwriteExisting) {
      const key = prefix ? `${prefix}.project.simulationType` : 'project.simulationType'
      computed[key] = simulationTypeValue
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

    // Infer spouse category from profession
    const spouseProfession = getWithPrefix(prefix, 'spouse.profession')
    if (spouseProfession) {
      const inferredSpouseCategory = inferCategoryFromProfession(spouseProfession)
      if (inferredSpouseCategory) {
        setComputedWithPrefix(prefix, 'spouse.category', inferredSpouseCategory)
      }
    }

    // Infer spouse work framework from regime
    if (spouseRegime) {
      const inferredSpouseWorkFramework = inferWorkFrameworkFromRegime(spouseRegime)
      if (inferredSpouseWorkFramework) {
        setComputedWithPrefix(prefix, 'spouse.workFramework', inferredSpouseWorkFramework)
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

        // Inherit regime from subscriber if child doesn't have one
        const childRegime = child?.regime
        if (isEmpty(childRegime)) {
          const inheritedRegime = subscriberRegime || inferRegimeFromStatus(subscriberStatus)
          if (inheritedRegime) {
            const key = prefix ? `${prefix}.children[${index}].regime` : `children[${index}].regime`
            computed[key] = inheritedRegime
          }
        }

        // Infer ayantDroit based on child regime vs subscriber/spouse regime
        const ayantDroit = child?.ayantDroit
        if (isEmpty(ayantDroit)) {
          // Get final child regime (either already set or newly computed)
          const regimeKey = prefix ? `${prefix}.children[${index}].regime` : `children[${index}].regime`
          const finalChildRegime = computed[regimeKey] || childRegime

          // Default to subscriber
          let inferredAyantDroit = 'CLIENT'

          // If spouse exists and child has same regime as spouse → spouse
          if (spouseRegime && finalChildRegime === spouseRegime && !isEmpty(spouseBirthDate)) {
            inferredAyantDroit = 'CONJOINT'
          }
          // Otherwise if child has same regime as subscriber → subscriber (already default)

          const ayantDroitKey = prefix ? `${prefix}.children[${index}].ayantDroit` : `children[${index}].ayantDroit`
          computed[ayantDroitKey] = inferredAyantDroit
        }
      })
    }
  }

  return computed
}
