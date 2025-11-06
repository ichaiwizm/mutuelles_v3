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
 * Age-Status compatibility rules
 * Ensures that statuses requiring specific age ranges are validated
 */
const AGE_STATUS_RULES: Record<string, { minAge?: number; maxAge?: number }> = {
  'RETRAITE': { minAge: 60 },
  'RETRAITE_ANCIEN_SALARIE': { minAge: 60 },
  'RETRAITE_ANCIEN_EXPLOITANT': { minAge: 60 },
  'ETUDIANT': { maxAge: 30 }
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
  const today = new Date()
  const birthDate = new Date(today)

  // Base year from age
  birthDate.setFullYear(today.getFullYear() - age)
  birthDate.setMonth(randomInt(0, 11))
  birthDate.setDate(randomInt(1, 28)) // Safe day for all months

  // Never allow future dates
  if (birthDate > today) {
    if (age === 0) {
      // Clamp to today (or earlier in current month)
      birthDate.setFullYear(today.getFullYear())
      birthDate.setMonth(today.getMonth())
      birthDate.setDate(Math.min(birthDate.getDate(), today.getDate()))
    } else {
      // Older than 0: step back one year if it slipped to the future
      birthDate.setFullYear(birthDate.getFullYear() - 1)
    }
  }

  return formatDate(birthDate)
}

function calculateAgeFromBirthDate(birthDateStr: string): number {
  // Parse date in DD/MM/YYYY format
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
    const prefixed = `${platform}.${domainKey}`
    return (
      schema.platformSpecific[platform].find(f => f.domainKey === prefixed) ||
      schema.platformSpecific[platform].find(f => f.domainKey === domainKey)
    )
  }

  // Helper: pick a random option value from a field definition
  const pickOptionValue = (field?: FormFieldDefinition): string | undefined => {
    if (!field || !field.options || field.options.length === 0) return undefined
    return randomChoice(field.options).value
  }

  const civility = randomChoice(['MONSIEUR', 'MADAME'])
  const firstName = civility === 'MONSIEUR'
    ? randomChoice(FIRST_NAMES_MALE)
    : randomChoice(FIRST_NAMES_FEMALE)
  const lastName = randomChoice(LAST_NAMES)

  testData['subscriber.civility'] = civility
  testData['subscriber.firstName'] = firstName
  testData['subscriber.lastName'] = lastName

  testData['subscriber.birthDate'] = generateBirthDate(25, 65)

  // Generate email and phone
  const emailDomain = randomChoice(['gmail.com', 'outlook.com', 'yahoo.fr', 'free.fr', 'orange.fr'])
  testData['subscriber.email'] = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${emailDomain}`
  testData['subscriber.phoneE164'] = `+336${randomInt(10, 99)}${randomInt(10, 99)}${randomInt(10, 99)}${randomInt(10, 99)}`

  const allFields = [
    ...schema.common,
    ...schema.platformSpecific.alptis,
    ...schema.platformSpecific.swisslifeone
  ]

  const hasAlptisFields = schema.platformSpecific.alptis.length > 0
  const hasSwissLifeFields = schema.platformSpecific.swisslifeone.length > 0

  const findField = (domainKey: string): FormFieldDefinition | undefined => {
    return allFields.find(f => f.domainKey === domainKey)
  }

  // Category & work framework (indépendant des plateformes)
  const categoryField = findField('subscriber.category')
  if (categoryField?.options) {
    const category = randomChoice(categoryField.options).value
    testData['subscriber.category'] = category

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

  // Toujours fournir un code postal valable
  {
    const dept = randomChoice(DEPARTMENTS)
    testData['subscriber.postalCode'] = randomChoice(dept.postalCodes)
  }

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
    const statusField = findField('subscriber.status')
    let status: string | undefined

    if (statusField?.options && subscriberRegime) {
      const subscriberAge = calculateAgeFromBirthDate(testData['subscriber.birthDate'])

      const compatibleStatuses = REGIME_STATUS_COMPATIBILITY[subscriberRegime] || []
      const availableStatuses = statusField.options
        .map(o => o.value)
        .filter(s => {
          const isRegimeCompatible = compatibleStatuses.includes(s)

          const ageRule = AGE_STATUS_RULES[s]
          const isAgeCompatible = !ageRule ||
            ((!ageRule.minAge || subscriberAge >= ageRule.minAge) &&
             (!ageRule.maxAge || subscriberAge <= ageRule.maxAge))

          return isRegimeCompatible && isAgeCompatible
        })

      if (availableStatuses.length > 0) {
        status = randomChoice(availableStatuses)
        testData['subscriber.status'] = status
      } else {
        throw new Error(
          `Impossible de générer des données de test valides:\n` +
          `- Régime: "${subscriberRegime}"\n` +
          `- Âge: ${subscriberAge} ans\n` +
          `- Statuts compatibles avec le régime: ${compatibleStatuses.join(', ')}\n` +
          `- Aucun statut ne satisfait à la fois le régime ET l'âge.\n` +
          `Vérifiez REGIME_STATUS_COMPATIBILITY et AGE_STATUS_RULES dans testDataGenerator.ts`
        )
      }
    } else if (statusField?.options) {
      const subscriberAge = calculateAgeFromBirthDate(testData['subscriber.birthDate'])
      const ageCompatibleStatuses = statusField.options
        .map(o => o.value)
        .filter(s => {
          const ageRule = AGE_STATUS_RULES[s]
          return !ageRule ||
            ((!ageRule.minAge || subscriberAge >= ageRule.minAge) &&
             (!ageRule.maxAge || subscriberAge <= ageRule.maxAge))
        })

      if (ageCompatibleStatuses.length > 0) {
        status = randomChoice(ageCompatibleStatuses)
        testData['subscriber.status'] = status
      }
    }

    const professionField = findField('subscriber.profession')
    if (professionField?.options) {
      const agriculturalStatuses = ['SALARIE_AGRICOLE', 'EXPLOITANT_AGRICOLE', 'RETRAITE_ANCIEN_EXPLOITANT']
      if (status && agriculturalStatuses.includes(status)) {
      } else {
        testData['subscriber.profession'] = randomChoice(professionField.options).value
      }
    }

    const dept = randomChoice(DEPARTMENTS)
    testData['subscriber.departmentCode'] = dept.code

    testData['project.name'] = `Simulation ${lastName} ${firstName}`

    testData['project.dateEffet'] = generateFirstOfNextMonth()
  } else {
    // Fallback logique quand SwissLife n'est pas présent: choisir un statut/profession compatibles
    const statusField = findField('subscriber.status')
    if (statusField?.options && !testData['subscriber.status']) {
      testData['subscriber.status'] = randomChoice(statusField.options).value
    }
    const professionField = findField('subscriber.profession')
    if (professionField?.options && !testData['subscriber.profession']) {
      testData['subscriber.profession'] = randomChoice(professionField.options).value
    }
  }

  // Ensure project fields are set even without SwissLife fields
  if (!testData['project.name']) {
    testData['project.name'] = `Simulation ${lastName} ${firstName}`
  }
  if (testData['project.dateEffet'] === undefined) {
    testData['project.dateEffet'] = generateFirstOfNextMonth()
  }

  const hasSpouse = randomBoolean(0.6)
  testData['conjoint'] = hasSpouse

  if (hasSpouse) {
    // Generate spouse basic info
    const spouseCivility = civility === 'MONSIEUR' ? 'MADAME' : 'MONSIEUR'
    const spouseFirstName = spouseCivility === 'MONSIEUR'
      ? randomChoice(FIRST_NAMES_MALE)
      : randomChoice(FIRST_NAMES_FEMALE)

    testData['spouse.civility'] = spouseCivility
    testData['spouse.firstName'] = spouseFirstName
    testData['spouse.lastName'] = lastName // Usually same last name

    const subscriberAge = 45
    testData['spouse.birthDate'] = generateBirthDate(subscriberAge - 5, subscriberAge + 5)

    // Catégorie & cadre de travail du conjoint (indépendant des plateformes)
    {
      const spouseCategoryField = findField('spouse.category')
      if (spouseCategoryField?.options) {
        const spouseCategory = randomChoice(spouseCategoryField.options).value
        testData['spouse.category'] = spouseCategory

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
    }

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
      const spouseStatusField = findField('spouse.status')

      if (spouseStatusField?.options && spouseRegime) {
        const spouseAge = calculateAgeFromBirthDate(testData['spouse.birthDate'])

        const compatibleStatuses = REGIME_STATUS_COMPATIBILITY[spouseRegime] || []
        const availableStatuses = spouseStatusField.options
          .map(o => o.value)
          .filter(s => {
            const isRegimeCompatible = compatibleStatuses.includes(s)

            const ageRule = AGE_STATUS_RULES[s]
            const isAgeCompatible = !ageRule ||
              ((!ageRule.minAge || spouseAge >= ageRule.minAge) &&
               (!ageRule.maxAge || spouseAge <= ageRule.maxAge))

            return isRegimeCompatible && isAgeCompatible
          })

        if (availableStatuses.length > 0) {
          testData['spouse.status'] = randomChoice(availableStatuses)
        } else {
          throw new Error(
            `Impossible de générer des données de test valides pour le conjoint:\n` +
            `- Régime: "${spouseRegime}"\n` +
            `- Âge: ${spouseAge} ans\n` +
            `- Statuts compatibles avec le régime: ${compatibleStatuses.join(', ')}\n` +
            `- Aucun statut ne satisfait à la fois le régime ET l'âge.\n` +
            `Vérifiez REGIME_STATUS_COMPATIBILITY et AGE_STATUS_RULES dans testDataGenerator.ts`
          )
        }
      } else if (spouseStatusField?.options) {
        const spouseAge = calculateAgeFromBirthDate(testData['spouse.birthDate'])
        const ageCompatibleStatuses = spouseStatusField.options
          .map(o => o.value)
          .filter(s => {
            const ageRule = AGE_STATUS_RULES[s]
            return !ageRule ||
              ((!ageRule.minAge || spouseAge >= ageRule.minAge) &&
               (!ageRule.maxAge || spouseAge <= ageRule.maxAge))
          })

        if (ageCompatibleStatuses.length > 0) {
          testData['spouse.status'] = randomChoice(ageCompatibleStatuses)
        }
      }

      const spouseProfessionField = findField('spouse.profession')
      if (spouseProfessionField?.options) {
        const agriculturalStatuses = ['SALARIE_AGRICOLE', 'EXPLOITANT_AGRICOLE', 'RETRAITE_ANCIEN_EXPLOITANT']
        const spouseStatus = testData['spouse.status']
        if (spouseStatus && agriculturalStatuses.includes(spouseStatus)) {
        } else{
          testData['spouse.profession'] = randomChoice(spouseProfessionField.options).value
        }
      }
    } else {
      // Fallback logique sans SwissLife: statut/profession du conjoint
      const spouseStatusField = findField('spouse.status')
      if (spouseStatusField?.options && !testData['spouse.status']) {
        testData['spouse.status'] = randomChoice(spouseStatusField.options).value
      }
      const spouseProfessionField = findField('spouse.profession')
      if (spouseProfessionField?.options && !testData['spouse.profession']) {
        testData['spouse.profession'] = randomChoice(spouseProfessionField.options).value
      }
    }
  }

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
      testData[`children[${i}].birthDate`] = generateBirthDate(0, 25)

      // Régime enfant (via commun)
      {
        const childRegimeField = findField('children[].regime')
        const chosenChildRegime = pickOptionValue(childRegimeField) || 'SECURITE_SOCIALE'
        testData[`children[${i}].regime`] = chosenChildRegime
      }

      // Ayant droit enfant (via commun)
      {
        const childAyantDroitField = findField('children[].ayantDroit')
        if (childAyantDroitField?.options) {
          testData[`children[${i}].ayantDroit`] = (hasSpouse && randomBoolean(0.2)) ? 'CONJOINT' : 'CLIENT'
        }
      }
    }
  }

  return testData
}
