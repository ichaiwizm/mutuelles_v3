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
 * Extrait toutes les données du formulaire pour les stocker brutes
 * Le backend fera la transformation selon la plateforme cible
 */
function extractAllFormData(formData: FormData): Record<string, any> {
  const allData: Record<string, any> = {}

  Object.keys(formData).forEach(key => {
    // Ignorer les champs complètement vides
    if (formData[key] === undefined || formData[key] === null) return

    // Stocker tout le reste tel quel
    allData[key] = formData[key]
  })

  return allData
}

/**
 * Reverse mapping functions for converting display values back to domain keys
 */
function reverseMapRegime(displayValue: string): string {
  const reverseMap: { [key: string]: string } = {
    'Alsace / Moselle': 'ALSACE_MOSELLE',
    'Amexa': 'AMEXA',
    'Régime des salariés agricoles': 'REGIME_SALARIES_AGRICOLES',
    'Sécurité sociale': 'SECURITE_SOCIALE',
    'Sécurité sociale des indépendants': 'SECURITE_SOCIALE_INDEPENDANTS',
    'Régime Local (CPAM Alsace Moselle)': 'SECURITE_SOCIALE_ALSACE_MOSELLE',
    'Régime Général pour TNS (CPAM)': 'TNS',
    'Autres régimes spéciaux': 'AUTRES_REGIME_SPECIAUX'
  }
  return reverseMap[displayValue] || displayValue
}

function reverseMapCategory(displayValue: string): string {
  const reverseMap: { [key: string]: string } = {
    'Agriculteurs exploitants': 'AGRICULTEURS_EXPLOITANTS',
    'Artisans': 'ARTISANS',
    'Cadres': 'CADRES',
    'Cadres et employés de la fonction publique': 'CADRES_EMPLOYES_FONCTION_PUBLIQUE',
    "Chefs d'entreprise": 'CHEFS_D_ENTREPRISE',
    'Commerçants et assimilés': 'COMMERCANTS_ET_ASSIMILES',
    'Employés, agents de maîtrise': 'EMPLOYES',
    'Ouvriers': 'OUVRIERS',
    'Personnes sans activité professionnelle': 'PERSONNES_SANS_ACTIVITE_PROFESSIONNELLE',
    'Professions libérales et assimilés': 'PROFESSIONS_LIBERALES_ET_ASSIMILES',
    'Retraités': 'RETRAITES'
  }
  return reverseMap[displayValue] || displayValue
}

/**
 * Transform a Lead back into FormData format for editing
 * Priority: Use platformData if available (contains original form data)
 * Fallback: Reconstruct from normalized data structure
 */
export function transformFromCleanLead(lead: any): Record<string, any> {
  // Priority 1: If platformData exists and has content, use it directly
  if (lead.data?.platformData && Object.keys(lead.data.platformData).length > 0) {
    return { ...lead.data.platformData }
  }

  // Priority 2: Reconstruct from normalized structure
  const formData: Record<string, any> = {}

  // Reconstruct contact
  if (lead.data?.contact) {
    const { civilite, nom, prenom, telephone, email, adresse, codePostal, ville } = lead.data.contact
    if (civilite) formData['subscriber.civility'] = civilite
    if (nom) formData['subscriber.lastName'] = nom
    if (prenom) formData['subscriber.firstName'] = prenom
    if (telephone) formData['subscriber.telephone'] = telephone
    if (email) formData['subscriber.email'] = email
    if (adresse) formData['subscriber.address'] = adresse
    if (codePostal) formData['subscriber.postalCode'] = codePostal
    if (ville) formData['subscriber.city'] = ville
  }

  // Reconstruct souscripteur
  if (lead.data?.souscripteur) {
    const { dateNaissance, profession, regimeSocial, nombreEnfants } = lead.data.souscripteur

    if (dateNaissance) formData['subscriber.birthDate'] = dateNaissance

    if (regimeSocial) {
      formData['subscriber.regime'] = reverseMapRegime(regimeSocial)
    }

    if (profession) {
      // Try to reverse map as category first
      const categoryValue = reverseMapCategory(profession)
      if (categoryValue !== profession) {
        formData['subscriber.category'] = categoryValue
      } else {
        // If not a category, assume it's a status or profession
        formData['subscriber.profession'] = profession
      }
    }

    if (nombreEnfants !== undefined) formData['subscriber.childrenCount'] = nombreEnfants
  }

  // Reconstruct conjoint
  if (lead.data?.conjoint) {
    formData['conjoint'] = true

    const { civilite, prenom, nom, dateNaissance, profession, regimeSocial } = lead.data.conjoint
    if (civilite) formData['spouse.civility'] = civilite
    if (prenom) formData['spouse.firstName'] = prenom
    if (nom) formData['spouse.lastName'] = nom
    if (dateNaissance) formData['spouse.birthDate'] = dateNaissance

    if (regimeSocial) {
      formData['spouse.regime'] = reverseMapRegime(regimeSocial)
    }

    if (profession) {
      const categoryValue = reverseMapCategory(profession)
      if (categoryValue !== profession) {
        formData['spouse.category'] = categoryValue
      } else {
        formData['spouse.profession'] = profession
      }
    }
  }

  // Reconstruct enfants
  if (lead.data?.enfants && lead.data.enfants.length > 0) {
    formData['enfants'] = true
    formData['children.count'] = lead.data.enfants.length

    lead.data.enfants.forEach((enfant: any, i: number) => {
      if (enfant.dateNaissance) {
        formData[`children[${i}].birthDate`] = enfant.dateNaissance
      }
      if (enfant.sexe) {
        formData[`children[${i}].gender`] = enfant.sexe
      }
    })
  }

  // Reconstruct besoins
  if (lead.data?.besoins) {
    const { dateEffet, assureActuellement, gammes, madelin, niveaux } = lead.data.besoins

    if (dateEffet) formData['project.dateEffet'] = dateEffet
    if (assureActuellement !== undefined) formData['project.currentlyInsured'] = assureActuellement
    if (gammes) formData['project.ranges'] = gammes
    if (madelin !== undefined) formData['project.madelin'] = madelin

    if (niveaux) {
      if (niveaux.soinsMedicaux !== undefined) formData['project.medicalCareLevel'] = niveaux.soinsMedicaux
      if (niveaux.hospitalisation !== undefined) formData['project.hospitalizationLevel'] = niveaux.hospitalisation
      if (niveaux.optique !== undefined) formData['project.opticsLevel'] = niveaux.optique
      if (niveaux.dentaire !== undefined) formData['project.dentalLevel'] = niveaux.dentaire
    }
  }

  return formData
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

  // ========= NOUVEAU: Stocker TOUTES les données du formulaire brutes =========
  const platformData = extractAllFormData(formData)

  return {
    contact,
    souscripteur,
    conjoint: formData['conjoint'] ? conjoint : undefined,
    enfants,
    besoins,
    platformData  // Toutes les données brutes du formulaire
  }
}
