/**
 * ContentCleaner - Nettoie et extrait le contenu principal (générique)
 *
 * Responsabilité unique :
 * - Nettoyer le contenu (HTML, entities, whitespace)
 * - Extraire le bloc principal (supprimer signatures, disclaimers)
 * - Retourner un contenu propre prêt pour l'analyse
 */

import type { CleanedContent } from '../types'

export class ContentCleaner {
  /**
   * Nettoie un contenu texte/HTML et extrait le bloc principal
   */
  static clean(content: string, isHtml: boolean = false): CleanedContent {
    const original = content
    let text = content

    // Détection automatique si HTML
    if (!isHtml && this.looksLikeHtml(content)) {
      isHtml = true
    }

    // Phase 1: Nettoyage basique
    if (isHtml) {
      text = this.stripHtml(text)
    }
    text = this.decodeEntities(text)
    text = this.normalizeWhitespace(text)

    // Phase 2: Extraction du bloc principal
    text = this.extractMainBlock(text)

    // Phase 3: Nettoyage final
    text = this.normalizeWhitespace(text)

    // Métadonnées
    const metadata = {
      wasHtml: isHtml,
      linesRemoved: original.split('\n').length - text.split('\n').length,
      charsRemoved: original.length - text.length
    }

    return { text, original, metadata }
  }

  /**
   * Détecte si le contenu ressemble à du HTML
   */
  private static looksLikeHtml(content: string): boolean {
    return /<[a-z][\s\S]*>/i.test(content)
  }

  /**
   * Supprime les balises HTML en préservant la structure
   */
  private static stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/td>/gi, '\t')
      .replace(/<[^>]+>/g, ' ')
  }

  /**
   * Décode les entités HTML
   */
  private static decodeEntities(text: string): string {
    return text
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&apos;/gi, "'")
      .replace(/&eacute;/gi, 'é')
      .replace(/&egrave;/gi, 'è')
      .replace(/&agrave;/gi, 'à')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
  }

  /**
   * Normalise les espaces et sauts de ligne
   */
  private static normalizeWhitespace(text: string): string {
    return text
      .replace(/[\r]+/g, '')
      .replace(/ {2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  /**
   * Extrait le bloc principal en supprimant signatures et disclaimers
   */
  private static extractMainBlock(text: string): string {
    const lower = text.toLowerCase()

    // Marqueurs de début (premier champ de formulaire)
    const startMarkers = [
      /\b(civilit[ée]|nom|pr[ée]nom|telephone|t[ée]l|email|adresse)/i
    ]

    let start = 0
    for (const marker of startMarkers) {
      const match = lower.search(marker)
      if (match >= 0) {
        start = match
        break
      }
    }

    // Marqueurs de fin (signatures, disclaimers)
    const endMarkers = [
      'cordialement',
      'bien à vous',
      'confidentialité',
      'se désabonner',
      'unsubscribe',
      'cet email',
      'cette alerte',
      'pôle commercial',
      'pole commercial',
      'décompte de lead'
    ]

    let end = text.length
    for (const marker of endMarkers) {
      const idx = lower.indexOf(marker, start)
      if (idx > start) {
        end = Math.min(end, idx)
      }
    }

    return text.slice(start, end).trim()
  }
}
