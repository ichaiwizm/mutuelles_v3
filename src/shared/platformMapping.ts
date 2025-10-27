import type { CreateLeadData } from './types/leads'

export interface SwissLifeOneData {
  projet: {
    nom: string
    couverture_individuelle: boolean
    indemnites_journalieres: boolean
    resiliation_contrat: boolean
    reprise_concurrence: boolean
    loi_madelin: boolean
  }
}

export interface PlatformData {
  swisslifeone?: SwissLifeOneData
  alptis?: any
}

export class PlatformMappingService {
  /**
   * Mappe un lead standard vers les données SwissLifeOne
   */
  static mapToSwissLifeOne(lead: CreateLeadData): SwissLifeOneData {
    const prenom = lead.contact?.prenom?.trim() || ''
    const nom = lead.contact?.nom?.trim() || ''
    const nomProjet = [prenom, nom].filter(Boolean).join(' ') || 'Projet sans nom'

    const age = this.calculateAge(lead.souscripteur?.dateNaissance)
    const loiMadelin = age !== null && age < 70

    return {
      projet: {
        nom: nomProjet,
        couverture_individuelle: true,
        indemnites_journalieres: false,
        resiliation_contrat: false,
        reprise_concurrence: false,
        loi_madelin: loiMadelin
      }
    }
  }

  /**
   * Calcule l'âge à partir d'une date de naissance
   * Supporte les formats DD/MM/YYYY et YYYY-MM-DD
   * @param dateNaissance - Date de naissance au format DD/MM/YYYY ou YYYY-MM-DD
   * @returns L'âge en années ou null si la date est invalide
   */
  static calculateAge(dateNaissance?: string): number | null {
    if (!dateNaissance || dateNaissance.trim() === '') {
      return null
    }

    try {
      let birthDate: Date | null = null

      const ddmmyyyyMatch = dateNaissance.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
      if (ddmmyyyyMatch) {
        const [, day, month, year] = ddmmyyyyMatch
        birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }

      const yyyymmddMatch = dateNaissance.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (yyyymmddMatch) {
        const [, year, month, day] = yyyymmddMatch
        birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }

      if (!birthDate || isNaN(birthDate.getTime())) {
        return null
      }

      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }

      if (age < 0 || age > 150) {
        return null
      }

      return age
    } catch (error) {
      return null
    }
  }

  /**
   * Mappe un lead vers toutes les plateformes configurées
   */
  static mapToPlatforms(lead: CreateLeadData): PlatformData {
    return {
      swisslifeone: this.mapToSwissLifeOne(lead)
    }
  }
}
