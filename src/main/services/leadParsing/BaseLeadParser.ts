/**
 * BaseLeadParser - Classe de base pour les parsers de leads
 *
 * Fournit des helpers communs pour le parsing
 * NE FAIT PAS de détection (délégué à ProviderDetector)
 */

import type { ILeadParser, ParserResult, CleanedContent, ParsedLeadData, ParsedField } from './types'
import { FieldExtractor } from './utils/FieldExtractor'

export abstract class BaseLeadParser implements ILeadParser {
  abstract readonly name: string
  abstract readonly priority: number

  /**
   * Parse le contenu nettoyé - À implémenter par les sous-classes
   */
  abstract parse(content: CleanedContent, sourceId: string): ParserResult

  /**
   * Helper: Créer un résultat de parsing réussi
   */
  protected createSuccessResult(
    sourceId: string,
    parsedData: ParsedLeadData
  ): ParserResult {
    const fieldsExtracted = this.countExtractedFields(parsedData)
    const score = this.calculateScore(parsedData)

    return {
      success: true,
      parserName: this.name,
      parsedData,
      fieldsExtracted,
      score,
      errors: [],
      warnings: parsedData.metadata.warnings || [],
      executionTime: 0
    }
  }

  /**
   * Helper: Créer un résultat de parsing échoué
   */
  protected createFailureResult(error: string): ParserResult {
    return {
      success: false,
      parserName: this.name,
      fieldsExtracted: 0,
      score: 0,
      errors: [error],
      warnings: [],
      executionTime: 0
    }
  }

  /**
   * Helper: Convertir FieldExtractionResult en ParsedField
   */
  protected toParsedField<T>(extraction: {
    value: T | null
    confidence: any
    source: any
    originalText?: string
  }): ParsedField<T> | undefined {
    if (extraction.value === null) return undefined
    return {
      value: extraction.value,
      confidence: extraction.confidence,
      source: extraction.source,
      originalText: extraction.originalText
    }
  }

  /**
   * Helper: Compter les champs extraits
   */
  private countExtractedFields(data: ParsedLeadData): number {
    let count = 0

    if (data.subscriber) {
      count += Object.values(data.subscriber).filter(v => v?.value).length
    }
    if (data.spouse) {
      count += Object.values(data.spouse).filter(v => v?.value).length
    }
    if (data.children) {
      count += data.children.reduce((sum, child) =>
        sum + Object.values(child).filter(v => v?.value).length, 0
      )
    }
    if (data.project) {
      count += Object.values(data.project).filter(v => v?.value).length
    }

    return count
  }

  /**
   * Helper: Calculer un score de qualité (0-100)
   */
  private calculateScore(data: ParsedLeadData): number {
    const fields = this.countExtractedFields(data)

    // Champs critiques
    const hasCritical = !!(
      data.subscriber?.lastName?.value &&
      data.subscriber?.firstName?.value &&
      data.subscriber?.telephone?.value
    )

    let score = 0
    score += fields * 5 // 5 points par champ
    score += hasCritical ? 30 : 0 // Bonus si champs critiques

    return Math.min(score, 100)
  }

  /**
   * Helper: Log
   */
  protected log(message: string, data?: any): void {
    console.log(`[${this.name}] ${message}`, data || '')
  }
}
