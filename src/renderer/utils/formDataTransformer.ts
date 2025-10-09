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

export function transformToCleanLead(formData: FormData): CreateLeadData {
  const contact: ContactInfo = {}
  const souscripteur: SouscripteurInfo = {}
  const conjoint: ConjointInfo | undefined = formData['spouse.present'] ? {} : undefined
  const enfants: EnfantInfo[] = []
  const besoins: BesoinsInfo = {}

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
    contact.codePostal = formData['subscriber.postalCode']
  }

  if (formData['subscriber.birthDate']) {
    souscripteur.dateNaissance = parseDateToDDMMYYYY(formData['subscriber.birthDate'])
  }

  if (formData['subscriber.regime']) {
    souscripteur.regimeSocial = mapRegime(formData['subscriber.regime'])
  }

  if (formData['subscriber.category']) {
    souscripteur.profession = mapCategory(formData['subscriber.category'])
  }

  if (formData['subscriber.status']) {
    souscripteur.profession = formData['subscriber.status']
  }

  if (formData['subscriber.profession']) {
    souscripteur.profession = formData['subscriber.profession']
  }

  if (conjoint && formData['spouse.present']) {
    if (formData['spouse.birthDate']) {
      conjoint.dateNaissance = parseDateToDDMMYYYY(formData['spouse.birthDate'])
    }

    if (formData['spouse.regime']) {
      conjoint.regimeSocial = mapRegime(formData['spouse.regime'])
    }

    if (formData['spouse.category']) {
      conjoint.profession = mapCategory(formData['spouse.category'])
    }

    if (formData['spouse.status']) {
      conjoint.profession = formData['spouse.status']
    }

    if (formData['spouse.profession']) {
      conjoint.profession = formData['spouse.profession']
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

  return {
    contact,
    souscripteur,
    conjoint: formData['spouse.present'] ? conjoint : undefined,
    enfants,
    besoins
  }
}
