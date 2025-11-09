/**
 * ParserOrchestrator - Orchestre le processus complet de parsing
 *
 * Responsabilité unique :
 * - Coordonner : nettoyage → détection → parsing → debug
 * - Stratégie intelligente : parser recommandé puis fallback
 * - Sélection du meilleur résultat (le plus de champs)
 */

import type { ILeadParser, OrchestrationResult, ParserResult } from '../types'
import { ContentCleaner } from './ContentCleaner'
import { ProviderDetector } from './ProviderDetector'
import { ParsingDebugger } from './ParsingDebugger'
import { createLogger } from '../../logger'

const logger = createLogger('ParserOrchestrator')

export class ParserOrchestrator {
  private parsers: Map<string, ILeadParser> = new Map()

  /**
   * Enregistre un parser
   */
  registerParser(parser: ILeadParser): void {
    this.parsers.set(parser.name.toLowerCase(), parser)
    logger.debug(`[ParserOrchestrator] Registered parser: ${parser.name}`)
  }

  /**
   * Parse un contenu avec stratégie intelligente
   */
  parse(rawContent: string, sourceId: string, isHtml: boolean = false): OrchestrationResult {
    logger.debug(`[ParserOrchestrator] Starting orchestration for source: ${sourceId}`)
    logger.debug(`[ParserOrchestrator] Raw email content (${rawContent.length} chars):\n${rawContent}`)

    // Phase 1: Nettoyage basique (garde les mots-clés d'introduction pour détection)
    const basicCleaned = ContentCleaner.cleanBasic(rawContent, isHtml)
    logger.debug(`[ParserOrchestrator] Basic cleaned content: ${basicCleaned.text.length} chars`)

    // Phase 2: Détection du provider (sur contenu complet avec mots-clés)
    const providerDetection = ProviderDetector.detect(basicCleaned)
    logger.debug(`[ParserOrchestrator] Detected provider: ${providerDetection.provider} (${providerDetection.confidence}%)`)

    // Phase 3: Extraction du bloc principal (maintenant qu'on connaît le provider)
    const extractedText = ContentCleaner.extractMainBlock(basicCleaned.text)
    const cleanedContent = {
      text: extractedText,
      original: basicCleaned.original,
      metadata: {
        ...basicCleaned.metadata,
        linesRemoved: basicCleaned.original.split('\n').length - extractedText.split('\n').length,
        charsRemoved: basicCleaned.original.length - extractedText.length
      }
    }
    logger.debug(`[ParserOrchestrator] Extracted main block: ${cleanedContent.text.length} chars`)

    // Phase 4: Stratégie de parsing
    const allAttempts: ParserResult[] = []
    let finalResult: ParserResult | null = null

    // Stratégie 1: Essayer le parser recommandé si confiance > 70%
    if (providerDetection.confidence >= 70) {
      const recommendedParser = this.getParserByProvider(providerDetection.provider)
      if (recommendedParser) {
        logger.debug(`[ParserOrchestrator] Trying recommended parser: ${recommendedParser.name}`)
        const result = this.tryParser(recommendedParser, cleanedContent, sourceId)
        allAttempts.push(result)

        // Si bon score, on prend ce résultat
        if (result.success && result.score >= 60) {
          finalResult = result
          logger.debug(`[ParserOrchestrator] Recommended parser succeeded with score ${result.score}`)
        }
      }
    }

    // Stratégie 2: Si pas de résultat satisfaisant, essayer TOUS les parsers
    if (!finalResult) {
      logger.debug(`[ParserOrchestrator] Trying all parsers as fallback`)
      const otherParsers = Array.from(this.parsers.values())
        .filter(p => !finalResult || p.name !== finalResult.parserName)

      for (const parser of otherParsers) {
        const result = this.tryParser(parser, cleanedContent, sourceId)
        allAttempts.push(result)
      }

      // Sélectionner le meilleur (le plus de champs extraits)
      finalResult = this.selectBestResult(allAttempts)
    }

    // Si toujours pas de résultat, créer un résultat vide
    if (!finalResult) {
      finalResult = {
        success: false,
        parserName: 'none',
        fieldsExtracted: 0,
        score: 0,
        errors: ['Aucun parser n\'a pu extraire de données'],
        warnings: [],
        executionTime: 0
      }
    }

    // Créer le résultat d'orchestration
    const orchestrationResult: OrchestrationResult = {
      finalResult,
      providerDetection,
      allAttempts,
      bestParser: finalResult.parserName,
      cleanedContent,
      debugReport: {} as any // Sera rempli juste après
    }

    // Phase 4: Génération du rapport de debug
    orchestrationResult.debugReport = ParsingDebugger.createReport(orchestrationResult)

    logger.debug(`[ParserOrchestrator] Orchestration complete. Final parser: ${finalResult.parserName}, fields: ${finalResult.fieldsExtracted}`)

    return orchestrationResult
  }

  /**
   * Essaie un parser et mesure les performances
   */
  private tryParser(parser: ILeadParser, cleanedContent: any, sourceId: string): ParserResult {
    const startTime = Date.now()

    try {
      const result = parser.parse(cleanedContent, sourceId)
      result.executionTime = Date.now() - startTime
      return result
    } catch (error) {
      return {
        success: false,
        parserName: parser.name,
        fieldsExtracted: 0,
        score: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        executionTime: Date.now() - startTime
      }
    }
  }

  /**
   * Sélectionne le meilleur résultat (score + champs)
   */
  private selectBestResult(results: ParserResult[]): ParserResult | null {
    if (results.length === 0) return null

    return results.reduce((best, current) => {
      // Comparer d'abord le succès
      if (current.success && !best.success) return current
      if (!current.success && best.success) return best

      // Ensuite le score
      if (current.score > best.score) return current
      if (current.score < best.score) return best

      // En cas d'égalité, le plus de champs
      return current.fieldsExtracted > best.fieldsExtracted ? current : best
    })
  }

  /**
   * Récupère le parser recommandé pour un provider
   */
  private getParserByProvider(provider: string): ILeadParser | null {
    // Mapping provider → parser name
    const mapping: Record<string, string> = {
      'assurlead': 'assurlead',
      'assurprospect': 'assurprospect',
      'generic': 'generic'
    }

    const parserName = mapping[provider.toLowerCase()]
    return parserName ? this.parsers.get(parserName) || null : null
  }

  /**
   * Liste tous les parsers enregistrés
   */
  listParsers(): string[] {
    return Array.from(this.parsers.keys())
  }
}

// Export singleton
export const parserOrchestrator = new ParserOrchestrator()
