import { CreateLeadData, ContactInfo, SouscripteurInfo, ConjointInfo, EnfantInfo, BesoinsInfo } from '@shared/types/leads'

interface FormData {
  [domainKey: string]: any
}

function parseDateToDDMMYYYY(value: any): string | undefined {
  if (!value) return undefined

  if (typeof value === 'string') {
    if (value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return value
    }

    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = value.split('-')
      return `${day}/${month}/${year}`
    }
  }

  return value
}

function mapCategory(category: string): string {
  const categoryMap: { [key: string]: string } = {
    'AGRICULTEURS_EXPLOITANTS': 'Agriculteurs exploitants',
    'ARTISANS': 'Artisans',
    'CADRES': 'Cadres',
    'CADRES_EMPLOYES_FONCTION_PUBLIQUE': 'Cadres et employés de la fonction publique',
    'CHEFS_D_ENTREPRISE': "Chefs d'entreprise",
    'COMMERCANTS_ET_ASSIMILES': 'Commerçants et assimilés',
    'EMPLOYES': 'Employés, agents de maîtrise',
    'OUVRIERS': 'Ouvriers',
    'PERSONNES_SANS_ACTIVITE_PROFESSIONNELLE': 'Personnes sans activité professionnelle',
    'PROFESSIONS_LIBERALES_ET_ASSIMILES': 'Professions libérales et assimilés',
    'RETRAITES': 'Retraités'
  }

  return categoryMap[category] || category
}

function mapRegime(regime: string): string {
  const regimeMap: { [key: string]: string } = {
    'ALSACE_MOSELLE': 'Alsace / Moselle',
    'AMEXA': 'Amexa',
    'REGIME_SALARIES_AGRICOLES': 'Régime des salariés agricoles',
    'SECURITE_SOCIALE': 'Sécurité sociale',
    'SECURITE_SOCIALE_INDEPENDANTS': 'Sécurité sociale des indépendants',
    'SECURITE_SOCIALE_ALSACE_MOSELLE': 'Régime Local (CPAM Alsace Moselle)',
    'TNS': 'Régime Général pour TNS (CPAM)',
    'AUTRES_REGIME_SPECIAUX': 'Autres régimes spéciaux'
  }

  return regimeMap[regime] || regime
}

/**
 * Liste des champs génériques (domain keys)
 * Ces champs ne sont PAS platform-specific
 */
const GENERIC_FIELDS = [
  'subscriber.civility',
  'subscriber.lastName',
  'subscriber.firstName',
  'subscriber.postalCode',
  'subscriber.birthDate',
  'subscriber.regime',
  'subscriber.profession',
  'subscriber.status',
  'subscriber.category',
  'spouse.birthDate',
  'spouse.regime',
  'spouse.profession',
  'spouse.status',
  'spouse.category',
  'project.dateEffet',
  'project.name',
  'conjoint',
  'enfants',
  'children.count'
]

/**
 * Vérifie si un domainKey est un champ générique
 */
function isGenericField(domainKey: string): boolean {
  // Champs génériques explicites
  if (GENERIC_FIELDS.includes(domainKey)) return true

  // Champs children avec notation []
  if (domainKey.startsWith('children[') && domainKey.includes('].birthDate')) return true

  return false
}

/**
 * Extrait les données platform-specific du formulaire
 */
function extractPlatformData(formData: FormData): Record<string, Record<string, any>> {
  const platformData: Record<string, Record<string, any>> = {
    alptis: {},
    swisslifeone: {}
  }

  Object.keys(formData).forEach(key => {
    // Ignorer les champs génériques
    if (isGenericField(key)) return

    // Ignorer les champs vides
    if (formData[key] === undefined || formData[key] === null || formData[key] === '') return

    // Déterminer la plateforme basée sur les préfixes de domainKey
    // Note: Les champs platform-specific utilisent des domainKeys préfixés
    // Ex: "alptis.subscriber.category" ou directement le nom du champ comme "slsis_statut"

    if (key.startsWith('alptis.') || key.includes('alptis')) {
      platformData.alptis[key] = formData[key]
    } else if (key.startsWith('swisslifeone.') || key.startsWith('slsis_') || key.includes('swisslife')) {
      platformData.swisslifeone[key] = formData[key]
    } else {
      // Si pas de préfixe clair, essayer de deviner basé sur des patterns connus
      // Champs qui commencent par certains préfixes sont considérés platform-specific
      const platformSpecificPatterns = [
        /^slsis_/,           // SwissLife
        /^categorie_/,       // Souvent Alptis
        /^regime_/,          // Peut être platform-specific
        /^code_postal$/,     // Peut être platform-specific
        /^statut_/,          // Platform-specific
        /^profession_/       // Platform-specific
      ]

      const isSwissLife = platformSpecificPatterns[0].test(key)
      const maybeAlptis = platformSpecificPatterns.slice(1).some(pattern => pattern.test(key))

      if (isSwissLife) {
        platformData.swisslifeone[key] = formData[key]
      } else if (maybeAlptis) {
        platformData.alptis[key] = formData[key]
      }
    }
  })

  return platformData
}

export function transformToCleanLead(formData: FormData): CreateLeadData {
  const contact: ContactInfo = {}
  const souscripteur: SouscripteurInfo = {}
  const conjoint: ConjointInfo | undefined = formData['conjoint'] ? {} : undefined
  const enfants: EnfantInfo[] = []
  const besoins: BesoinsInfo = {}

  // ========= Extraction des champs génériques (comme avant) =========

  if (formData['subscriber.civility']) {
    contact.civilite = formData['subscriber.civility']
  }

  if (formData['subscriber.lastName']) {
    contact.nom = formData['subscriber.lastName']
  }

  if (formData['subscriber.firstName']) {
    contact.prenom = formData['subscriber.firstName']
  }

  if (formData['subscriber.postalCode']) {
    contact.codePostal = String(formData['subscriber.postalCode'])
  }

  if (formData['subscriber.birthDate']) {
    souscripteur.dateNaissance = parseDateToDDMMYYYY(formData['subscriber.birthDate'])
  }

  if (formData['subscriber.regime']) {
    souscripteur.regimeSocial = mapRegime(formData['subscriber.regime'])
  }

  // Profession mapping with priority logic (highest to lowest):
  // 1. profession (SwissLife specific field - most specific)
  // 2. status (SwissLife "Statut" field)
  // 3. category (Alptis "Catégorie socioprofessionnelle" - needs mapping)
  // Note: Only one should be set per platform, but we use priority in case multiple are present
  if (formData['subscriber.profession']) {
    souscripteur.profession = formData['subscriber.profession']
  } else if (formData['subscriber.status']) {
    souscripteur.profession = formData['subscriber.status']
  } else if (formData['subscriber.category']) {
    souscripteur.profession = mapCategory(formData['subscriber.category'])
  }

  if (conjoint && formData['conjoint']) {
    if (formData['spouse.birthDate']) {
      conjoint.dateNaissance = parseDateToDDMMYYYY(formData['spouse.birthDate'])
    }

    if (formData['spouse.regime']) {
      conjoint.regimeSocial = mapRegime(formData['spouse.regime'])
    }

    // Profession mapping with priority logic (highest to lowest):
    // 1. profession (SwissLife specific field - most specific)
    // 2. status (SwissLife "Statut" field)
    // 3. category (Alptis "Catégorie socioprofessionnelle" - needs mapping)
    // Note: Only one should be set per platform, but we use priority in case multiple are present
    if (formData['spouse.profession']) {
      conjoint.profession = formData['spouse.profession']
    } else if (formData['spouse.status']) {
      conjoint.profession = formData['spouse.status']
    } else if (formData['spouse.category']) {
      conjoint.profession = mapCategory(formData['spouse.category'])
    }
  }

  const childrenCount = formData['children.count'] || 0
  for (let i = 0; i < childrenCount; i++) {
    const birthDateKey = `children[${i}].birthDate`
    if (formData[birthDateKey]) {
      enfants.push({
        dateNaissance: parseDateToDDMMYYYY(formData[birthDateKey])
      })
    }
  }

  if (formData['project.dateEffet']) {
    besoins.dateEffet = parseDateToDDMMYYYY(formData['project.dateEffet'])
  }

  // ========= NOUVEAU: Extraction des données platform-specific =========
  const platformData = extractPlatformData(formData)

  return {
    contact,
    souscripteur,
    conjoint: formData['conjoint'] ? conjoint : undefined,
    enfants,
    besoins,
    platformData  // Ajout des données platform-specific
  }
}
