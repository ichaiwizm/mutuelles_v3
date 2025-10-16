import { FormSchema, FormFieldDefinition, shouldShowField } from './formSchemaGenerator'

/**
 * Test data pools for random generation
 */
const FIRST_NAMES_MALE = ['Baptiste', 'Nicolas', 'Xavier', 'Thomas', 'Alexandre', 'Julien', 'Maxime', 'Lucas', 'Hugo', 'Louis']
const FIRST_NAMES_FEMALE = ['Marie', 'Sophie', 'Julie', 'Emma', 'Clara', 'Léa', 'Chloé', 'Laura', 'Sarah', 'Camille']
const LAST_NAMES = ['Deschamps', 'Dupont', 'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Petit', 'Richard', 'Durand']

const DEPARTMENTS = [
  { code: 75, postalCodes: [75001, 75008, 75015, 75016, 75020] },
  { code: 44, postalCodes: [44000, 44100, 44200, 44300] },
  { code: 69, postalCodes: [69001, 69003, 69006, 69009] },
  { code: 13, postalCodes: [13001, 13008, 13013, 13015] },
  { code: 33, postalCodes: [33000, 33100, 33200, 33300] },
  { code: 59, postalCodes: [59000, 59100, 59200, 59300] },
  { code: 31, postalCodes: [31000, 31100, 31200, 31300] },
  { code: 35, postalCodes: [35000, 35200, 35400, 35700] },
  { code: 67, postalCodes: [67000, 67100, 67200, 67300] },
  { code: 38, postalCodes: [38000, 38100, 38200, 38400] }
]

/**
 * Regime-Status compatibility matrix for SwissLife
 * Ensures that generated test data respects the business rules enforced by SwissLife's form
 */
const REGIME_STATUS_COMPATIBILITY: Record<string, string[]> = {
  'AMEXA': ['SALARIE_AGRICOLE', 'EXPLOITANT_AGRICOLE', 'RETRAITE_ANCIEN_EXPLOITANT'],
  'SECURITE_SOCIALE': ['SALARIE', 'TRAVAILLEUR_TRANSFRONTALIER', 'ETUDIANT', 'RETRAITE', 'RETRAITE_ANCIEN_SALARIE', 'FONCTIONNAIRE'],
  'TNS': ['TNS', 'SALARIE', 'TRAVAILLEUR_TRANSFRONTALIER'],
  'SECURITE_SOCIALE_ALSACE_MOSELLE': ['SALARIE', 'TRAVAILLEUR_TRANSFRONTALIER', 'ETUDIANT', 'RETRAITE', 'RETRAITE_ANCIEN_SALARIE', 'FONCTIONNAIRE'],
  'AUTRES_REGIME_SPECIAUX': ['FONCTIONNAIRE', 'TRAVAILLEUR_TRANSFRONTALIER', 'SALARIE', 'RETRAITE']
}

/**
 * Utility functions
 */
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomBoolean(trueProbability: number = 0.5): boolean {
  return Math.random() < trueProbability
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function generateBirthDate(minAge: number, maxAge: number): string {
  const age = randomInt(minAge, maxAge)
  const birthDate = new Date()
  birthDate.setFullYear(birthDate.getFullYear() - age)
  birthDate.setMonth(randomInt(0, 11))
  birthDate.setDate(randomInt(1, 28)) // Safe day for all months
  return formatDate(birthDate)
}

function generateFirstOfNextMonth(): string {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  date.setDate(1)
  return formatDate(date)
}

/**
 * Generate random test data for the entire form
 */
export function generateRandomTestData(schema: FormSchema): Record<string, any> {
  const testData: Record<string, any> = {}

  // Helper: find the platform-specific variant of a field
  const findFieldInPlatform = (
    domainKey: string,
    platform: 'alptis' | 'swisslifeone'
  ): FormFieldDefinition | undefined => {
    return schema.platformSpecific[platform].find(f => f.domainKey === domainKey)
  }

  // Helper: pick a random option value from a field definition
  const pickOptionValue = (field?: FormFieldDefinition): string | undefined => {
    if (!field || !field.options || field.options.length === 0) return undefined
    return randomChoice(field.options).value
  }

  // STEP 1: Basic identity
  const civility = randomChoice(['MONSIEUR', 'MADAME'])
  const firstName = civility === 'MONSIEUR'
    ? randomChoice(FIRST_NAMES_MALE)
    : randomChoice(FIRST_NAMES_FEMALE)
  const lastName = randomChoice(LAST_NAMES)

  testData['subscriber.civility'] = civility
  testData['subscriber.firstName'] = firstName
  testData['subscriber.lastName'] = lastName

  // STEP 2: Subscriber birth date
  testData['subscriber.birthDate'] = generateBirthDate(25, 65)

  // STEP 3: Determine which fields are available (carrier-specific)
  const allFields = [
    ...schema.common,
    ...schema.platformSpecific.alptis,
    ...schema.platformSpecific.swisslifeone
  ]

  const hasAlptisFields = schema.platformSpecific.alptis.length > 0
  const hasSwissLifeFields = schema.platformSpecific.swisslifeone.length > 0

  // Helper to find field definition
  const findField = (domainKey: string): FormFieldDefinition | undefined => {
    return allFields.find(f => f.domainKey === domainKey)
  }

  // STEP 4: Carrier-specific fields for subscriber
  if (hasAlptisFields) {
    // Category
    const categoryField = findField('subscriber.category')
    if (categoryField?.options) {
      const category = randomChoice(categoryField.options).value
      testData['subscriber.category'] = category

      // Conditional: workFramework (only for certain categories)
      const workFrameworkField = findField('subscriber.workFramework')
      if (workFrameworkField) {
        const categoriesRequiringWorkFramework = [
          'CHEFS_D_ENTREPRISE',
          'PROFESSIONS_LIBERALES_ET_ASSIMILES',
          'ARTISANS',
          'COMMERCANTS_ET_ASSIMILES',
          'AGRICULTEURS_EXPLOITANTS'
        ]
        if (categoriesRequiringWorkFramework.includes(category) && workFrameworkField.options) {
          testData['subscriber.workFramework'] = randomBoolean(0.6) ? 'SALARIE' : 'INDEPENDANT'
        }
      }
    }

    // Regime (Alptis) — handled later with SwissLife to avoid overrides

    // Postal code
    const dept = randomChoice(DEPARTMENTS)
    testData['subscriber.postalCode'] = randomChoice(dept.postalCodes)
  }

  // STEP 4a: Unified selection for subscriber.regime (must be done BEFORE status for SwissLife)
  let subscriberRegime: string | undefined
  {
    const regimeFieldAlptis = findFieldInPlatform('subscriber.regime', 'alptis')
    const regimeFieldSwiss = findFieldInPlatform('subscriber.regime', 'swisslifeone')
    const alptisVals = regimeFieldAlptis?.options?.map(o => o.value)
    const swissVals = regimeFieldSwiss?.options?.map(o => o.value)
    let chosen: string | undefined
    if (alptisVals && swissVals) {
      const common = alptisVals.filter(v => swissVals.includes(v))
      if (common.length) chosen = randomChoice(common)
    }
    if (!chosen) chosen = pickOptionValue(regimeFieldSwiss)
    if (!chosen) chosen = pickOptionValue(regimeFieldAlptis)
    if (!chosen) chosen = pickOptionValue(findField('subscriber.regime'))
    if (chosen) {
      testData['subscriber.regime'] = chosen
      subscriberRegime = chosen
    }
  }

  if (hasSwissLifeFields) {
    // Status - MUST be compatible with the selected regime
    const statusField = findField('subscriber.status')
    let status: string | undefined

    if (statusField?.options && subscriberRegime) {
      // Filter status options to only those compatible with the selected regime
      const compatibleStatuses = REGIME_STATUS_COMPATIBILITY[subscriberRegime] || []
      const availableStatuses = statusField.options
        .map(o => o.value)
        .filter(s => compatibleStatuses.includes(s))

      if (availableStatuses.length > 0) {
        status = randomChoice(availableStatuses)
        testData['subscriber.status'] = status
      } else {
        // Fallback: if no compatible status found, pick any status and log warning
        console.warn(`No compatible status found for regime ${subscriberRegime}, using random status`)
        status = randomChoice(statusField.options).value
        testData['subscriber.status'] = status
      }
    } else if (statusField?.options) {
      // No regime selected, use any status
      status = randomChoice(statusField.options).value
      testData['subscriber.status'] = status
    }

    // Conditional: madelin (only for TNS or EXPLOITANT_AGRICOLE)
    if (status) {
      const madelinField = findField('project.madelin')
      if (madelinField && (status === 'TNS' || status === 'EXPLOITANT_AGRICOLE')) {
        testData['project.madelin'] = randomBoolean(0.7)
      }
    }

    // Profession - skip for agricultural workers
    const professionField = findField('subscriber.profession')
    if (professionField?.options) {
      // Agricultural workers don't have medical professions
      const agriculturalStatuses = ['SALARIE_AGRICOLE', 'EXPLOITANT_AGRICOLE', 'RETRAITE_ANCIEN_EXPLOITANT']
      if (status && agriculturalStatuses.includes(status)) {
        // Skip profession for agricultural workers (field will be hidden in UI)
      } else {
        testData['subscriber.profession'] = randomChoice(professionField.options).value
      }
    }

    // Department code
    const dept = randomChoice(DEPARTMENTS)
    testData['subscriber.departmentCode'] = dept.code

    // Project name (auto-generated)
    testData['project.name'] = `Simulation ${lastName} ${firstName}`

    // Project plan (fixed)
    testData['project.plan'] = 'SwissLife Santé'

    // Project toggles
    testData['project.couverture'] = true
    testData['project.ij'] = false
    testData['project.resiliation'] = randomBoolean(0.2)
    testData['project.reprise'] = randomBoolean(0.15)
  }

  // STEP 5: Project date
  testData['project.dateEffet'] = generateFirstOfNextMonth()

  // STEP 6: Spouse (60% chance)
  const hasSpouse = randomBoolean(0.6)
  testData['conjoint'] = hasSpouse

  if (hasSpouse) {
    // Spouse birth date (±5 years from subscriber)
    const subscriberAge = 45 // approximate middle age
    testData['spouse.birthDate'] = generateBirthDate(subscriberAge - 5, subscriberAge + 5)

    if (hasAlptisFields) {
      // Spouse category
      const spouseCategoryField = findField('spouse.category')
      if (spouseCategoryField?.options) {
        const spouseCategory = randomChoice(spouseCategoryField.options).value
        testData['spouse.category'] = spouseCategory

        // Conditional: spouse workFramework
        const spouseWorkFrameworkField = findField('spouse.workFramework')
        if (spouseWorkFrameworkField) {
          const categoriesRequiringWorkFramework = [
            'CHEFS_D_ENTREPRISE',
            'PROFESSIONS_LIBERALES_ET_ASSIMILES',
            'ARTISANS',
            'COMMERCANTS_ET_ASSIMILES',
            'AGRICULTEURS_EXPLOITANTS'
          ]
          if (categoriesRequiringWorkFramework.includes(spouseCategory) && spouseWorkFrameworkField.options) {
            testData['spouse.workFramework'] = randomBoolean(0.6) ? 'SALARIE' : 'INDEPENDANT'
          }
        }
      }

      // Spouse regime (Alptis) — handled later with SwissLife to avoid overrides
    }

    // Unified selection for spouse.regime (must be done BEFORE status for SwissLife)
    let spouseRegime: string | undefined
    {
      const spouseRegimeFieldAlptis = findFieldInPlatform('spouse.regime', 'alptis')
      const spouseRegimeFieldSwiss = findFieldInPlatform('spouse.regime', 'swisslifeone')
      const alptisVals = spouseRegimeFieldAlptis?.options?.map(o => o.value)
      const swissVals = spouseRegimeFieldSwiss?.options?.map(o => o.value)
      let chosen: string | undefined
      if (alptisVals && swissVals) {
        const common = alptisVals.filter(v => swissVals.includes(v))
        if (common.length) chosen = randomChoice(common)
      }
      if (!chosen) chosen = pickOptionValue(spouseRegimeFieldSwiss)
      if (!chosen) chosen = pickOptionValue(spouseRegimeFieldAlptis)
      if (!chosen) chosen = pickOptionValue(findField('spouse.regime'))
      if (chosen) {
        testData['spouse.regime'] = chosen
        spouseRegime = chosen
      }
    }

    if (hasSwissLifeFields) {
      // Spouse status - MUST be compatible with the selected regime
      const spouseStatusField = findField('spouse.status')

      if (spouseStatusField?.options && spouseRegime) {
        // Filter status options to only those compatible with the selected regime
        const compatibleStatuses = REGIME_STATUS_COMPATIBILITY[spouseRegime] || []
        const availableStatuses = spouseStatusField.options
          .map(o => o.value)
          .filter(s => compatibleStatuses.includes(s))

        if (availableStatuses.length > 0) {
          testData['spouse.status'] = randomChoice(availableStatuses)
        } else {
          // Fallback: if no compatible status found, pick any status and log warning
          console.warn(`No compatible status found for spouse regime ${spouseRegime}, using random status`)
          testData['spouse.status'] = randomChoice(spouseStatusField.options).value
        }
      } else if (spouseStatusField?.options) {
        // No regime selected, use any status
        testData['spouse.status'] = randomChoice(spouseStatusField.options).value
      }

      // Spouse profession - skip for agricultural workers
      const spouseProfessionField = findField('spouse.profession')
      if (spouseProfessionField?.options) {
        // Agricultural workers don't have medical professions
        const agriculturalStatuses = ['SALARIE_AGRICOLE', 'EXPLOITANT_AGRICOLE', 'RETRAITE_ANCIEN_EXPLOITANT']
        const spouseStatus = testData['spouse.status']
        if (spouseStatus && agriculturalStatuses.includes(spouseStatus)) {
          // Skip profession for agricultural workers (field will be hidden in UI)
        } else {
          testData['spouse.profession'] = randomChoice(spouseProfessionField.options).value
        }
      }
    }
  }

  // STEP 7: Children (probabilities: 30%/30%/25%/15% for 0/1/2/3)
  const rand = Math.random()
  let nbChildren = 0
  if (rand < 0.30) {
    nbChildren = 0
  } else if (rand < 0.60) {
    nbChildren = 1
  } else if (rand < 0.85) {
    nbChildren = 2
  } else {
    nbChildren = 3
  }

  testData['enfants'] = nbChildren > 0
  testData['children.count'] = nbChildren

  if (nbChildren > 0) {
    for (let i = 0; i < nbChildren; i++) {
      // Birth date for each child
      testData[`children[${i}].birthDate`] = generateBirthDate(0, 25)

      if (hasAlptisFields) {
        // Children regime (Alptis) — choose from Alptis-specific variant
        const childRegimeFieldAlptis = findFieldInPlatform('children[].regime', 'alptis')
        const chosenChildRegimeAlptis = pickOptionValue(childRegimeFieldAlptis) || pickOptionValue(findField('children[].regime'))
        if (chosenChildRegimeAlptis) {
          testData[`children[${i}].regime`] = chosenChildRegimeAlptis
        }
      }

      if (hasSwissLifeFields) {
        // Children ayantDroit (SwissLife)
        // 80% assuré principal (1), 20% conjoint (2) if spouse present
        const childAyantDroitField = findField('children[].ayantDroit')
        if (childAyantDroitField?.options) {
          if (hasSpouse && randomBoolean(0.2)) {
            testData[`children[${i}].ayantDroit`] = '2'
          } else {
            testData[`children[${i}].ayantDroit`] = '1'
          }
        }
      }
    }
  }

  return testData
}
