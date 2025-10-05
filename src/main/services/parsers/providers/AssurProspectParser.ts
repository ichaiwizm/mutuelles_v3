import { BaseParser, type ParsedData } from '../base/BaseParser'

export class AssurProspectParser extends BaseParser {
  /**
   * Identifie si le contenu provient d'AssurProspect
   */
  static canParse(content: string): boolean {
    return (
      content.includes('AssurProspect') &&
      content.includes('Transmission d\'une fiche') &&
      content.includes('Voici les éléments de la fiche')
    )
  }

  /**
   * Parse le contenu AssurProspect
   */
  static parse(content: string): ParsedData {
    const normalizedContent = this.normalizeContent(content)

    // Découper le contenu en sections
    const sections = this.extractSections(normalizedContent)

    // Extraire les données de chaque section
    const contact = this.extractContact(sections.contact || '')
    const souscripteur = this.extractSouscripteur(sections.souscripteur || '')
    const conjoint = this.extractConjoint(sections.conjoint || '')
    const enfants = this.extractEnfants(sections.enfants || '')
    const besoins = this.extractBesoins(sections.besoin || '')

    return {
      contact,
      souscripteur,
      conjoint,
      enfants,
      besoins
    }
  }

  /**
   * Extrait les différentes sections du contenu
   */
  private static extractSections(content: string): Record<string, string> {
    const sections: Record<string, string> = {}

    const sectionRegexes = {
      contact: /Contact\s*\n(.*?)(?=\n(?:Souscripteur|Conjoint|Enfants|Besoin|A noter))/s,
      souscripteur: /Souscripteur\s*\n(.*?)(?=\n(?:Conjoint|Enfants|Besoin|A noter))/s,
      conjoint: /Conjoint\s*\n(.*?)(?=\n(?:Enfants|Besoin|A noter))/s,
      enfants: /Enfants\s*\n(.*?)(?=\n(?:Besoin|A noter))/s,
      besoin: /Besoin\s*\n(.*?)(?=\n(?:A noter))/s
    }

    for (const [sectionName, regex] of Object.entries(sectionRegexes)) {
      const match = content.match(regex)
      if (match) {
        sections[sectionName] = match[1].trim()
      }
    }

    return sections
  }

  /**
   * Extrait les informations de contact
   */
  private static extractContact(text: string) {
    const contact: any = {}

    // Civilité
    const civiliteMatch = text.match(/Civilité\s*:\s*(M\.|Mme|Mlle)/)
    if (civiliteMatch) {
      contact.civilite = this.normalizeCivilite(civiliteMatch[1])
    }

    // Nom
    const nomMatch = text.match(/Nom\s*:\s*([^\n]+)/)
    if (nomMatch) {
      contact.nom = this.capitalizeWords(nomMatch[1].trim())
    }

    // Prénom
    const prenomMatch = text.match(/Prénom\s*:\s*([^\n]+)/)
    if (prenomMatch) {
      contact.prenom = this.capitalizeWords(prenomMatch[1].trim())
    }

    // Adresse
    const adresseMatch = text.match(/Adresse\s*:\s*([^\n]+)/)
    if (adresseMatch) {
      contact.adresse = adresseMatch[1].trim()
    }

    // Code postal
    const cpMatch = text.match(/Code postal\s*:\s*(\d{5})/)
    if (cpMatch) {
      contact.codePostal = cpMatch[1]
    }

    // Ville
    const villeMatch = text.match(/Ville\s*:\s*([^\n]+)/)
    if (villeMatch) {
      contact.ville = villeMatch[1].trim().toUpperCase()
    }

    // Téléphone
    const telMatch = text.match(/Téléphone\s*:\s*([\d\.\s]+)/)
    if (telMatch) {
      contact.telephone = this.normalizeTelephone(telMatch[1])
    }

    // Email
    const emailMatch = text.match(/Email\s*:\s*([^\n\s]+)/)
    if (emailMatch) {
      contact.email = emailMatch[1].toLowerCase().trim()
    }

    return contact
  }

  /**
   * Extrait les informations du souscripteur
   */
  private static extractSouscripteur(text: string) {
    const souscripteur: any = {}

    // Date de naissance
    const dobMatch = text.match(/Date de naissance\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/)
    if (dobMatch) {
      souscripteur.dateNaissance = this.normalizeDate(dobMatch[1])
    }

    // Profession
    const profMatch = text.match(/Profession\s*:\s*([^\n]+)/)
    if (profMatch) {
      souscripteur.profession = profMatch[1].trim()
    }

    // Régime Social
    const regimeMatch = text.match(/Régime Social\s*:\s*([^\n]+)/)
    if (regimeMatch) {
      souscripteur.regimeSocial = this.normalizeRegime(regimeMatch[1].trim())
    }

    // Nombre d'enfants
    const enfantsMatch = text.match(/Nombre d'enfants\s*:\s*(\d+)/)
    if (enfantsMatch) {
      souscripteur.nombreEnfants = parseInt(enfantsMatch[1])
    }

    return souscripteur
  }

  /**
   * Extrait les informations du conjoint
   */
  private static extractConjoint(text: string) {
    if (!text || text.trim() === '') return null

    const conjoint: any = {}

    // Date de naissance
    const dobMatch = text.match(/Date de naissance\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/)
    if (dobMatch) {
      conjoint.dateNaissance = this.normalizeDate(dobMatch[1])
    }

    // Profession
    const profMatch = text.match(/Profession\s*:\s*([^\n]+)/)
    if (profMatch) {
      conjoint.profession = profMatch[1].trim()
    }

    // Régime Social
    const regimeMatch = text.match(/Régime Social\s*:\s*([^\n]+)/)
    if (regimeMatch) {
      conjoint.regimeSocial = this.normalizeRegime(regimeMatch[1].trim())
    }

    return Object.keys(conjoint).length > 0 ? conjoint : null
  }

  /**
   * Extrait les informations des enfants
   */
  private static extractEnfants(text: string) {
    const enfants: any[] = []

    // Pattern pour extraire les dates de naissance des enfants
    const pattern = /Date de naissance du (\d+)(?:er|ème|e)? enfant\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/g

    let match
    while ((match = pattern.exec(text)) !== null) {
      enfants.push({
        dateNaissance: this.normalizeDate(match[2])
      })
    }

    // Éliminer les doublons
    const uniqueEnfants: any[] = []
    const seenDates = new Set()
    for (const enfant of enfants) {
      if (!seenDates.has(enfant.dateNaissance)) {
        uniqueEnfants.push(enfant)
        seenDates.add(enfant.dateNaissance)
      }
    }

    return uniqueEnfants
  }

  /**
   * Extrait les besoins
   */
  private static extractBesoins(text: string) {
    const besoins: any = {}

    // Date d'effet
    const effetMatch = text.match(/Date d'effet\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/)
    if (effetMatch) {
      besoins.dateEffet = this.normalizeDate(effetMatch[1])
    }

    // Souscripteur actuellement assuré
    const assureMatch = text.match(/Souscripteur actuellement assuré\s*:\s*(Oui|Non)/)
    if (assureMatch) {
      besoins.assureActuellement = assureMatch[1] === 'Oui'
    }

    // Niveaux de garantie
    const niveaux: any = {}

    const soinsMatch = text.match(/Soins médicaux\s*:\s*(\d)/)
    if (soinsMatch) {
      niveaux.soinsMedicaux = parseInt(soinsMatch[1])
    }

    const hospiMatch = text.match(/Hospitalisation\s*:\s*(\d)/)
    if (hospiMatch) {
      niveaux.hospitalisation = parseInt(hospiMatch[1])
    }

    const optiqueMatch = text.match(/Optique\s*:\s*(\d)/)
    if (optiqueMatch) {
      niveaux.optique = parseInt(optiqueMatch[1])
    }

    const dentaireMatch = text.match(/Dentaire\s*:\s*(\d)/)
    if (dentaireMatch) {
      niveaux.dentaire = parseInt(dentaireMatch[1])
    }

    if (Object.keys(niveaux).length > 0) {
      besoins.niveaux = niveaux
    }

    return besoins
  }
}
