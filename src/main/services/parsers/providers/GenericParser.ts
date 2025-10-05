import { BaseParser, type ParsedData } from '../base/BaseParser'

/**
 * Parser générique qui essaie d'extraire des informations
 * même sans marqueurs spécifiques de provider
 */
export class GenericParser extends BaseParser {
  /**
   * Le parser générique accepte tout contenu
   * (doit être le dernier dans la liste des parsers)
   */
  static canParse(content: string): boolean {
    // Cherche au moins un pattern de base (nom, prénom, email, ou téléphone)
    const hasBasicInfo =
      /(?:Nom|Prénom|Email|Téléphone|Tel)\s*:/i.test(content) ||
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(content) ||
      /(?:0[1-9]|[+]33)[0-9\s\.-]{8,}/i.test(content)

    return hasBasicInfo
  }

  /**
   * Parse le contenu de manière générique
   */
  static parse(content: string): ParsedData {
    const normalizedContent = this.normalizeContent(content)

    // Extraire les sections si elles existent
    const sections = this.extractSections(normalizedContent)

    // Extraire les données
    const contact = this.extractContact(sections.contact || normalizedContent)
    const souscripteur = this.extractSouscripteur(sections.souscripteur || normalizedContent)
    const conjoint = this.extractConjoint(sections.conjoint || '')
    const enfants = this.extractEnfants(sections.enfants || '')
    const besoins = this.extractBesoins(sections.besoin || normalizedContent)

    return {
      contact,
      souscripteur,
      conjoint,
      enfants,
      besoins
    }
  }

  /**
   * Essaie d'extraire les sections du contenu
   */
  private static extractSections(content: string): Record<string, string> {
    const sections: Record<string, string> = {}

    // Patterns de sections possibles
    const sectionRegexes = {
      contact: /(?:Contact|Informations de contact)\s*\n+(.*?)(?=\n+(?:Souscripteur|Conjoint|Enfants|Besoin|$))/si,
      souscripteur: /(?:Souscripteur|Assuré)\s*\n+(.*?)(?=\n+(?:Conjoint|Enfants|Besoin|$))/si,
      conjoint: /Conjoint\s*\n+(.*?)(?=\n+(?:Enfants|Besoin|$))/si,
      enfants: /Enfants\s*\n+(.*?)(?=\n+(?:Besoin|$))/si,
      besoin: /(?:Besoin|Besoins)\s*\n+(.*?)$/si
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
   * Extrait les informations de contact de manière générique
   */
  private static extractContact(text: string) {
    const contact: any = {}

    // Civilité (patterns flexibles)
    const civiliteMatch = text.match(/(?:Civilité|Titre)\s*:\s*(M\.|Mme|Mlle|Monsieur|Madame|Mademoiselle)/i)
    if (civiliteMatch) {
      contact.civilite = this.normalizeCivilite(civiliteMatch[1])
    }

    // Nom (plusieurs patterns possibles)
    const nomMatch = text.match(/Nom\s*:\s*([^\n]+)/i) ||
                     text.match(/Nom de famille\s*:\s*([^\n]+)/i)
    if (nomMatch) {
      contact.nom = this.capitalizeWords(nomMatch[1].trim())
    }

    // Prénom
    const prenomMatch = text.match(/(?:Prénom|Prenom|First name)\s*:\s*([^\n]+)/i)
    if (prenomMatch) {
      contact.prenom = this.capitalizeWords(prenomMatch[1].trim())
    }

    // Email (pattern flexible)
    const emailMatch = text.match(/(?:Email|E-mail|Mail)\s*:\s*([^\n\s]+)/i) ||
                      text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
    if (emailMatch) {
      contact.email = emailMatch[1].toLowerCase().trim()
    }

    // Téléphone (patterns multiples)
    const telMatch = text.match(/(?:Téléphone|Telephone|Tel|Phone|Mobile|Portable)\s*:\s*([\d\.\s\-+]+)/i) ||
                    text.match(/((?:0[1-9]|[+]33)[0-9\s\.-]{8,})/i)
    if (telMatch) {
      contact.telephone = this.normalizeTelephone(telMatch[1])
    }

    // Adresse (plusieurs patterns)
    const adresseMatch = text.match(/(?:Adresse|Address|Rue)\s*:\s*([^\n]+)/i)
    if (adresseMatch) {
      contact.adresse = adresseMatch[1].trim()
    }

    // Code postal
    const cpMatch = text.match(/(?:Code postal|CP|Postal code)\s*:\s*(\d{5})/i) ||
                   text.match(/\b(\d{5})\b/)
    if (cpMatch) {
      contact.codePostal = cpMatch[1]
    }

    // Ville
    const villeMatch = text.match(/(?:Ville|City)\s*:\s*([^\n]+)/i)
    if (villeMatch) {
      contact.ville = villeMatch[1].trim().toUpperCase()
    }

    return contact
  }

  /**
   * Extrait les informations du souscripteur
   */
  private static extractSouscripteur(text: string) {
    const souscripteur: any = {
      nombreEnfants: 0 // Valeur par défaut
    }

    // Date de naissance
    const dobMatch = text.match(/(?:Date de naissance|Né(?:e)? le|Birth date|DDN)\s*:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
    if (dobMatch) {
      souscripteur.dateNaissance = this.normalizeDate(dobMatch[1])
    }

    // Profession
    const profMatch = text.match(/(?:Profession|Métier|Activité|Occupation)\s*:\s*([^\n]+)/i)
    if (profMatch) {
      souscripteur.profession = profMatch[1].trim()
    }

    // Régime Social
    const regimeMatch = text.match(/(?:Régime [Ss]ocial|Regime|Statut)\s*:\s*([^\n]+)/i)
    if (regimeMatch) {
      souscripteur.regimeSocial = this.normalizeRegime(regimeMatch[1].trim())
    }

    // Nombre d'enfants (écrase la valeur par défaut si trouvé)
    const enfantsMatch = text.match(/(?:Nombre d'enfants|Enfants)\s*:\s*(\d+)/i)
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
    const dobMatch = text.match(/Date de naissance\s*:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
    if (dobMatch) {
      conjoint.dateNaissance = this.normalizeDate(dobMatch[1])
    }

    // Profession
    const profMatch = text.match(/Profession\s*:\s*([^\n]+)/i)
    if (profMatch) {
      conjoint.profession = profMatch[1].trim()
    }

    // Régime Social
    const regimeMatch = text.match(/Régime [Ss]ocial\s*:\s*([^\n]+)/i)
    if (regimeMatch) {
      conjoint.regimeSocial = this.normalizeRegime(regimeMatch[1].trim())
    }

    return Object.keys(conjoint).length > 0 ? conjoint : null
  }

  /**
   * Extrait les informations des enfants
   */
  private static extractEnfants(text: string) {
    if (!text || text.trim() === '') return []

    const enfants: any[] = []

    // Cherche toutes les dates de naissance d'enfants
    const patterns = [
      /Date de naissance du (\d+)(?:er|ème|e)? enfant\s*:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /Enfant (\d+).*?(?:Date de naissance|Né(?:e)? le)\s*:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi
    ]

    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        enfants.push({
          dateNaissance: this.normalizeDate(match[2])
        })
      }
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
    const effetMatch = text.match(/(?:Date d'effet|Date souhaitée|Effet)\s*:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
    if (effetMatch) {
      besoins.dateEffet = this.normalizeDate(effetMatch[1])
    }

    // Souscripteur actuellement assuré
    const assureMatch = text.match(/(?:Souscripteur )?(?:actuellement )?assuré\s*:\s*(Oui|Non)/i) ||
                       text.match(/(?:Déjà |Actuellement )?assuré[e]?\s*:\s*(Oui|Non)/i)
    if (assureMatch) {
      besoins.assureActuellement = assureMatch[1].toLowerCase() === 'oui'
    }

    // Niveaux de garantie
    const niveaux: any = {}

    const soinsMatch = text.match(/(?:Soins médicaux|Soins)\s*:\s*(\d)/i)
    if (soinsMatch) {
      niveaux.soinsMedicaux = parseInt(soinsMatch[1])
    }

    const hospiMatch = text.match(/Hospitalisation\s*:\s*(\d)/i)
    if (hospiMatch) {
      niveaux.hospitalisation = parseInt(hospiMatch[1])
    }

    const optiqueMatch = text.match(/Optique\s*:\s*(\d)/i)
    if (optiqueMatch) {
      niveaux.optique = parseInt(optiqueMatch[1])
    }

    const dentaireMatch = text.match(/Dentaire\s*:\s*(\d)/i)
    if (dentaireMatch) {
      niveaux.dentaire = parseInt(dentaireMatch[1])
    }

    if (Object.keys(niveaux).length > 0) {
      besoins.niveaux = niveaux
    }

    return besoins
  }
}
