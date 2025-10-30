/**
 * ParsingDebugger - Génère des rapports de debug détaillés
 *
 * Responsabilité unique :
 * - Créer un rapport Markdown complet du processus de parsing
 * - Inclure contenu, détection, tentatives, résultats
 * - Format facile à copier/coller pour debug
 */

import type { DebugReport, OrchestrationResult, ParserResult, ProviderDetection } from '../types'

export class ParsingDebugger {
  /**
   * Crée un rapport de debug complet
   */
  static createReport(result: OrchestrationResult): DebugReport {
    const { finalResult, providerDetection, allAttempts, cleanedContent } = result

    return {
      timestamp: new Date().toISOString(),
      sourceId: finalResult.parsedData?.metadata.sourceId || 'unknown',

      cleaning: {
        originalLength: cleanedContent.original.length,
        cleanedLength: cleanedContent.text.length,
        removedChars: cleanedContent.metadata.charsRemoved,
        wasHtml: cleanedContent.metadata.wasHtml
      },

      providerDetection,

      parsingAttempts: allAttempts.map(attempt => ({
        parserName: attempt.parserName,
        success: attempt.success,
        fieldsExtracted: attempt.fieldsExtracted,
        score: attempt.score,
        executionTime: attempt.executionTime,
        errors: attempt.errors
      })),

      finalChoice: {
        parserUsed: finalResult.parserName,
        reason: this.getChoiceReason(finalResult, allAttempts),
        fieldsExtracted: this.getExtractedFields(finalResult),
        missingFields: this.getMissingFields(finalResult)
      },

      content: {
        original: cleanedContent.original,
        cleaned: cleanedContent.text
      }
    }
  }

  /**
   * Convertit un rapport en Markdown lisible
   */
  static toMarkdown(report: DebugReport): string {
    const lines: string[] = []

    lines.push('# 🔍 Rapport de Parsing de Lead')
    lines.push(`**Date**: ${new Date(report.timestamp).toLocaleString('fr-FR')}`)
    lines.push(`**Source ID**: ${report.sourceId}`)
    lines.push('')

    // Phase 1: Nettoyage
    lines.push('## 📄 Phase 1: Nettoyage du Contenu')
    lines.push(`- **Taille originale**: ${report.cleaning.originalLength} caractères`)
    lines.push(`- **Taille nettoyée**: ${report.cleaning.cleanedLength} caractères`)
    lines.push(`- **Supprimés**: ${report.cleaning.removedChars} caractères`)
    lines.push(`- **Format**: ${report.cleaning.wasHtml ? 'HTML' : 'Texte'}`)
    lines.push('')

    // Phase 2: Détection provider
    lines.push('## 🎯 Phase 2: Détection du Provider')
    lines.push(`- **Provider détecté**: ${report.providerDetection.provider.toUpperCase()}`)
    lines.push(`- **Confiance**: ${report.providerDetection.confidence}%`)
    lines.push(`- **Raisons**:`)
    report.providerDetection.reasons.forEach(r => lines.push(`  - ${r}`))
    lines.push(`- **Mots-clés trouvés**: ${report.providerDetection.keywordsFound.join(', ') || 'aucun'}`)
    lines.push('')
    lines.push('**Analyse de structure**:')
    const s = report.providerDetection.structureAnalysis
    lines.push(`- Format tabulaire: ${s.hasTabularFormat ? '✅' : '❌'}`)
    lines.push(`- Sections détectées: ${s.hasSections ? '✅' : '❌'}`)
    lines.push(`- Champs trouvés: ${s.fieldCount}`)
    lines.push(`- Info contact: ${s.hasContactInfo ? '✅' : '❌'}`)
    lines.push(`- Info projet: ${s.hasProjectInfo ? '✅' : '❌'}`)
    lines.push(`- Info famille: ${s.hasFamilyInfo ? '✅' : '❌'}`)
    lines.push('')

    // Phase 3: Tentatives de parsing
    lines.push('## ⚙️ Phase 3: Tentatives de Parsing')
    report.parsingAttempts.forEach((attempt, i) => {
      lines.push(`### Tentative ${i + 1}: ${attempt.parserName}`)
      lines.push(`- **Succès**: ${attempt.success ? '✅' : '❌'}`)
      lines.push(`- **Champs extraits**: ${attempt.fieldsExtracted}`)
      lines.push(`- **Score qualité**: ${attempt.score}/100`)
      lines.push(`- **Temps**: ${attempt.executionTime}ms`)
      if (attempt.errors.length > 0) {
        lines.push(`- **Erreurs**: ${attempt.errors.join(', ')}`)
      }
      lines.push('')
    })

    // Phase 4: Choix final
    lines.push('## ✅ Phase 4: Résultat Final')
    lines.push(`- **Parser utilisé**: ${report.finalChoice.parserUsed}`)
    lines.push(`- **Raison du choix**: ${report.finalChoice.reason}`)
    lines.push('')
    lines.push('**Champs extraits**:')
    report.finalChoice.fieldsExtracted.forEach(f => lines.push(`  - ✅ ${f}`))
    if (report.finalChoice.missingFields.length > 0) {
      lines.push('')
      lines.push('**Champs manquants**:')
      report.finalChoice.missingFields.forEach(f => lines.push(`  - ❌ ${f}`))
    }
    lines.push('')

    // Contenu
    lines.push('## 📋 Contenu Nettoyé')
    lines.push('```')
    lines.push(report.content.cleaned.substring(0, 2000)) // Limite 2000 chars
    if (report.content.cleaned.length > 2000) {
      lines.push('...(tronqué)')
    }
    lines.push('```')

    return lines.join('\n')
  }

  private static getChoiceReason(final: ParserResult, all: ParserResult[]): string {
    if (all.length === 1) return 'Seul parser disponible'

    const best = all.reduce((a, b) => a.score > b.score ? a : b)
    if (best.parserName === final.parserName) {
      return `Meilleur score (${final.score}/100, ${final.fieldsExtracted} champs)`
    }

    return 'Parser par défaut'
  }

  private static getExtractedFields(result: ParserResult): string[] {
    const fields: string[] = []
    const data = result.parsedData

    if (!data) return []

    // Subscriber fields
    if (data.subscriber) {
      fields.push(...Object.keys(data.subscriber).filter(k =>
        (data.subscriber as any)[k]?.value
      ))
    }

    // Spouse fields (with spouse_ prefix for clarity)
    if (data.spouse && Object.keys(data.spouse).length > 0) {
      Object.keys(data.spouse).forEach(k => {
        if ((data.spouse as any)[k]?.value) {
          fields.push(`spouse_${k}`)
        }
      })
    }

    // Children count
    if (data.children && data.children.length > 0) {
      data.children.forEach((child, i) => {
        Object.keys(child).forEach(k => {
          if ((child as any)[k]?.value) {
            fields.push(`child${i+1}_${k}`)
          }
        })
      })
    }

    // Project fields
    if (data.project) {
      Object.keys(data.project).forEach(k => {
        if ((data.project as any)[k]?.value) {
          fields.push(`project_${k}`)
        }
      })
    }

    return fields
  }

  private static getMissingFields(result: ParserResult): string[] {
    const required = ['lastName', 'firstName', 'telephone', 'email']
    const extracted = this.getExtractedFields(result)
    return required.filter(f => !extracted.includes(f))
  }
}
