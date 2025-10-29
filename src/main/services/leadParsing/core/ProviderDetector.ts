/**
 * ProviderDetector - Détecte le provider (source) du lead
 *
 * Responsabilité unique :
 * - Analyser le contenu (mots-clés + structure)
 * - Déterminer le provider le plus probable
 * - Retourner un score de confiance et les raisons
 *
 * Ne fait PAS de parsing - juste de la détection
 */

import type { CleanedContent, ProviderDetection, ProviderType, StructureAnalysis } from '../types'

export class ProviderDetector {
  /**
   * Détecte le provider à partir du contenu nettoyé
   */
  static detect(content: CleanedContent): ProviderDetection {
    const text = content.text.toLowerCase()
    const keywordsFound: string[] = []
    const reasons: string[] = []
    let confidence = 0
    let provider: ProviderType = 'unknown'

    // Analyse de structure
    const structure = this.analyzeStructure(content.text)

    // Détection AssurProspect (priorité haute)
    const assurProspectScore = this.detectAssurProspect(text, keywordsFound, reasons)
    if (assurProspectScore > confidence) {
      confidence = assurProspectScore
      provider = 'assurprospect'
    }

    // Détection Assurlead (priorité haute)
    const assurleadScore = this.detectAssurlead(text, structure, keywordsFound, reasons)
    if (assurleadScore > confidence) {
      confidence = assurleadScore
      provider = 'assurlead'
    }

    // Fallback: Generic si structure suffisante
    if (confidence < 50 && structure.fieldCount >= 5) {
      confidence = 40 + structure.fieldCount * 2
      provider = 'generic'
      reasons.push(`Structure générique détectée (${structure.fieldCount} champs)`)
    }

    return {
      provider,
      confidence,
      reasons,
      structureAnalysis: structure,
      keywordsFound
    }
  }

  /**
   * Détecte AssurProspect (mots-clés spécifiques)
   */
  private static detectAssurProspect(text: string, keywords: string[], reasons: string[]): number {
    let score = 0

    if (text.includes('assurprospect')) {
      score += 40
      keywords.push('assurprospect')
      reasons.push('Mot-clé "AssurProspect" trouvé')
    }

    if (text.includes('transmission d\'une fiche') || text.includes("transmission d'une fiche")) {
      score += 30
      keywords.push('transmission fiche')
      reasons.push('Pattern "Transmission d\'une fiche" trouvé')
    }

    if (text.includes('voici les éléments') || text.includes('voici les elements')) {
      score += 20
      keywords.push('voici éléments')
      reasons.push('Pattern "Voici les éléments" trouvé')
    }

    return Math.min(score, 100)
  }

  /**
   * Détecte Assurlead (mots-clés + structure tabulaire)
   */
  private static detectAssurlead(text: string, structure: StructureAnalysis, keywords: string[], reasons: string[]): number {
    let score = 0

    // Mots-clés domaine
    if (text.includes('assurlead') || text.includes('assurland')) {
      score += 40
      keywords.push('assurlead/assurland')
      reasons.push('Mot-clé "Assurlead/Assurland" trouvé')
    }

    // Structure tabulaire (forte indication Assurlead)
    if (structure.hasTabularFormat) {
      score += 30
      reasons.push('Structure tabulaire détectée (format Assurlead)')
    }

    // Champs spécifiques Assurlead
    if (text.includes('user_id') || text.includes('userid')) {
      score += 15
      keywords.push('user_id')
      reasons.push('Champ "user_id" trouvé')
    }

    if (text.includes('besoin assurance')) {
      score += 10
      keywords.push('besoin assurance')
    }

    if (text.includes('formule choisie')) {
      score += 5
      keywords.push('formule choisie')
    }

    return Math.min(score, 100)
  }

  /**
   * Analyse la structure du contenu
   */
  private static analyzeStructure(text: string): StructureAnalysis {
    const lower = text.toLowerCase()

    // Détection format tabulaire (champ\tvaleur)
    const hasTabularFormat = /\w+\t[^\t\n]+/g.test(text)

    // Détection sections (Conjoint, Enfant, etc.)
    const hasSections = /(?:conjoint|enfant|projet)/i.test(text)

    // Comptage champs communs
    const fieldPatterns = [
      /civilit[ée]/i, /\bnom\b/i, /pr[ée]nom/i, /telephone/i, /email/i,
      /adresse/i, /code postal/i, /ville/i, /profession/i, /r[ée]gime/i,
      /date.*naissance/i, /date.*effet/i
    ]
    const fieldCount = fieldPatterns.filter(p => p.test(text)).length

    // Détection info contact
    const hasContactInfo = /email|telephone|tel|mobile/i.test(lower) && /nom|prenom/i.test(lower)

    // Détection info projet
    const hasProjectInfo = /date.*effet|assurance|mutuelle|devis/i.test(lower)

    // Détection info famille
    const hasFamilyInfo = /conjoint|enfant|[ée]pou/i.test(lower)

    return {
      hasTabularFormat,
      hasSections,
      fieldCount,
      hasContactInfo,
      hasProjectInfo,
      hasFamilyInfo
    }
  }
}
