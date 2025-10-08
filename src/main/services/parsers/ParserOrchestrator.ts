import { AssurProspectParser } from './providers/AssurProspectParser'
import { GenericParser } from './providers/GenericParser'
import { BaseParser, type ParsedData } from './base/BaseParser'
import type { LeadProvider } from '@shared/types/leads'

export interface ParserResult {
  success: boolean
  provider: LeadProvider | null
  data: ParsedData | null
  score: number
  error?: string
}

export class ParserOrchestrator {
  // Liste des parsers disponibles (ordre d'essai)
  // IMPORTANT: GenericParser doit toujours être en dernier (fallback)
  private static parsers = [
    { parser: AssurProspectParser, provider: 'assurprospect' as LeadProvider },
    // Ajouter d'autres parsers spécifiques ici...
    { parser: GenericParser, provider: 'generic' as LeadProvider }  // Toujours en dernier
  ]

  /**
   * Identifie le provider et parse le contenu
   */
  static parseContent(content: string): ParserResult {
    const normalizedContent = BaseParser.normalizeContent(content)

    // Essayer chaque parser
    for (const { parser, provider } of this.parsers) {
      if (parser.canParse(normalizedContent)) {
        try {
          const data = parser.parse(normalizedContent)
          const score = parser.calculateScore(data)

          return {
            success: true,
            provider,
            data,
            score
          }
        } catch (error) {
          return {
            success: false,
            provider: null,
            data: null,
            score: 0,
            error: error instanceof Error ? error.message : 'Erreur de parsing'
          }
        }
      }
    }

    // Aucun parser trouvé
    return {
      success: false,
      provider: null,
      data: null,
      score: 0,
      error: 'Aucun parser ne correspond à ce contenu. Assurez-vous qu\'il s\'agit bien d\'un lead AssurProspect.'
    }
  }

  /**
   * Identifie uniquement le provider sans parser
   */
  static identifyProvider(content: string): LeadProvider | null {
    const normalizedContent = BaseParser.normalizeContent(content)

    for (const { parser, provider } of this.parsers) {
      if (parser.canParse(normalizedContent)) {
        return provider
      }
    }

    return null
  }
}
