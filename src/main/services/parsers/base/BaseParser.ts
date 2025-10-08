import type { ContactInfo, SouscripteurInfo, ConjointInfo, EnfantInfo, BesoinsInfo } from '@shared/types/leads'

export interface ParsedData {
  contact: Partial<ContactInfo>
  souscripteur: Partial<SouscripteurInfo>
  conjoint?: Partial<ConjointInfo> | null
  enfants: EnfantInfo[]
  besoins: Partial<BesoinsInfo>
}

export abstract class BaseParser {
  /**
   * Détermine si ce parser peut traiter le contenu
   */
  static canParse(content: string): boolean {
    throw new Error('canParse() must be implemented by subclass')
  }

  /**
   * Parse le contenu et extrait les données structurées
   */
  static parse(content: string): ParsedData {
    throw new Error('parse() must be implemented by subclass')
  }

  /**
   * Normalise le contenu en nettoyant les espaces et retours à la ligne
   */
  static normalizeContent(content: string): string {
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/[ \t]+/g, ' ')  // Espaces/tabs multiples
      .replace(/\n[ \t]+/g, '\n')  // Espaces en début de ligne
      .replace(/[ \t]+\n/g, '\n')  // Espaces en fin de ligne
      .replace(/\n{3,}/g, '\n\n')  // Limiter retours à la ligne multiples
      .trim()
  }

  /**
   * Normalise la civilité
   */
  static normalizeCivilite(civilite: string): string {
    const mapping: Record<string, string> = {
      'M.': 'M.',
      'M': 'M.',
      'Monsieur': 'M.',
      'Mr': 'M.',
      'Mme': 'Mme',
      'Madame': 'Mme',
      'Mlle': 'Mlle',
      'Mademoiselle': 'Mlle'
    }
    return mapping[civilite] || civilite
  }

  /**
   * Capitalise les mots (première lettre en majuscule)
   */
  static capitalizeWords(str: string): string {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  /**
   * Normalise un numéro de téléphone
   */
  static normalizeTelephone(tel: string): string {
    if (!tel) return ''

    // Nettoyer les caractères non numériques sauf le +
    let cleaned = tel.replace(/[^\d+]/g, '')

    // Gérer les formats internationaux français
    if (cleaned.startsWith('+33')) {
      cleaned = '0' + cleaned.slice(3)
    }

    // Formater avec points si 10 chiffres commençant par 0
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1.$2.$3.$4.$5')
    }

    // Si format valide mais pas français (garde tel quel)
    if (cleaned.length >= 10) {
      return cleaned
    }

    // Sinon retourner le numéro original
    return tel
  }

  /**
   * Normalise une date DD/MM/YYYY vers YYYY-MM-DD
   */
  static normalizeDate(dateStr: string): string {
    const parts = dateStr.split(/[\/\-]/)
    if (parts.length === 3) {
      let day = parts[0]
      let month = parts[1]
      let year = parts[2]

      if (year.length === 2) {
        year = parseInt(year) > 50 ? '19' + year : '20' + year
      }

      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    return dateStr
  }

  /**
   * Normalise le régime social
   */
  static normalizeRegime(regime: string): string {
    const mapping: Record<string, string> = {
      'TNS': 'TNS',
      'TNS : régime des indépendants': 'TNS',
      'Salarié': 'Salarié',
      'Salarié (ou retraité)': 'Salarié',
      'Retraité': 'Retraité',
      'Libéral': 'Libéral',
      'Profession libérale': 'Libéral',
      'Fonctionnaire': 'Fonctionnaire',
      'Indépendant': 'Indépendant'
    }
    return mapping[regime] || regime
  }

  /**
   * Calcule un score de qualité du lead (0-10)
   */
  static calculateScore(data: ParsedData): number {
    let score = 0

    // Contact (0-4 points)
    if (data.contact.nom && data.contact.prenom) score += 1
    if (data.contact.email) score += 1
    if (data.contact.telephone) score += 1
    if (data.contact.adresse && data.contact.codePostal && data.contact.ville) score += 1

    // Souscripteur (0-3 points)
    if (data.souscripteur.dateNaissance) score += 1
    if (data.souscripteur.profession) score += 1
    if (data.souscripteur.regimeSocial) score += 1

    // Besoins (0-2 points)
    if (data.besoins.dateEffet) score += 1
    if (data.besoins.niveaux && Object.keys(data.besoins.niveaux).length > 0) score += 1

    // Bonus (0-1 point)
    if (data.conjoint) score += 0.5
    if (data.enfants && data.enfants.length > 0) score += 0.5

    return Math.min(Math.round(score), 10)
  }
}
