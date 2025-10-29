/**
 * Utility class for extracting fields from email content using regex patterns
 */

import type {
  FieldExtractionResult,
  EmailContentSections,
  ConfidenceLevel
} from './types'
import { TextCleaner } from './TextCleaner'

export class FieldExtractor {
  /**
   * Prepare email content for parsing
   */
  static prepareContent(emailContent: string, emailHtml?: string): EmailContentSections {
    let text = emailContent || ''
    const html = emailHtml
    const subject = '' // Will be set by parser

    // ✅ CLEAN TEXT BEFORE PARSING
    text = TextCleaner.cleanEmailContent(text, false)
    if (html) {
      // If we have HTML, use cleaned HTML as fallback
      const cleanedHtml = TextCleaner.cleanEmailContent(html, true)
      if (!text && cleanedHtml) {
        text = cleanedHtml
      }
    }

    // Split into lines
    const lines = text.split('\n')

    // Clean lines (trim and remove empty)
    const cleanLines = lines.map((l) => l.trim()).filter((l) => l.length > 0)

    return {
      text,
      html,
      subject,
      from: '',
      lines,
      cleanLines
    }
  }

  /**
   * Extract field using multiple patterns (tries each until one matches)
   */
  static extractField(
    content: string,
    patterns: RegExp[],
    confidence: ConfidenceLevel = 'high',
    transform?: (value: string) => any
  ): FieldExtractionResult {
    for (const pattern of patterns) {
      const match = content.match(pattern)
      if (match && match[1]) {
        let rawValue = match[1].trim()

        // ✅ VALIDATE: Reject if too long (likely captured multiple fields)
        const validated = TextCleaner.validateField(rawValue, 100)
        if (!validated) continue

        rawValue = validated

        // Apply transformation if provided
        const value = transform ? transform(rawValue) : rawValue

        // ✅ VALIDATE: Reject if transform returned empty (validation failed)
        if (!value || (typeof value === 'string' && value.length === 0)) continue

        return {
          value,
          confidence,
          source: 'parsed',
          originalText: match[0]
        }
      }
    }

    return {
      value: null,
      confidence: 'low',
      source: 'parsed'
    }
  }

  /**
   * Extract civility (MONSIEUR, MADAME, etc.)
   */
  static extractCivility(content: string): FieldExtractionResult<string> {
    const patterns = [
      /\*?Civilit[ée]\*?\s*:?\s*\*?\s*(M\.?|Monsieur|Mr|MONSIEUR)/i,
      /\*?Civilit[ée]\*?\s*:?\s*\*?\s*(Mme|Madame|MADAME)/i,
      /Genre\s*:?\s*(Homme|Masculin)/i,
      /Genre\s*:?\s*(Femme|F[ée]minin)/i,
      /(M\.|Monsieur|Mr)\s+[A-Z]/i, // "M. DUPONT"
      /(Mme|Madame)\s+[A-Z]/i
    ]

    for (const pattern of patterns) {
      const match = content.match(pattern)
      if (match && match[1]) {
        const rawValue = match[1].toUpperCase()
        let normalized = 'MONSIEUR'

        // Map strictly to avoid misclassifying "M." as MADAME
        if (rawValue.startsWith('MME') || rawValue.includes('MADAME')) {
          normalized = 'MADAME'
        } else {
          normalized = 'MONSIEUR'
        }

        return {
          value: normalized,
          confidence: 'high',
          source: 'parsed',
          originalText: match[0]
        }
      }
    }

    return { value: null, confidence: 'low', source: 'parsed' }
  }

  /**
   * Extract last name
   */
  static extractLastName(content: string): FieldExtractionResult<string> {
    // ✅ FIXED: Stop at field boundaries, max 25 chars
    const patterns = [
      /\*?Nom\*?\s*:?\s*\*?\s*([A-Z\u00C0-\u017F][A-Za-z\u00C0-\u017F\-']{1,39}?)(?=\s{2,}|\s*(?:Pr[ée]nom|Email|T[ée]l|Date|Code|Ville|Adresse)|[│\|]|\n|$)/i,
      /\*?Nom de famille\*?\s*:?\s*\*?\s*([A-Z\u00C0-\u017F][A-Za-z\u00C0-\u017F\-']{1,39}?)(?=\s{2,}|\s*(?:Pr[ée]nom|Email|T[ée]l)|[│\|]|\n|$)/i,
      /Lastname\s*:?\s*\*?\s*([A-Z\u00C0-\u017F][A-Za-z\u00C0-\u017F\-']{1,39}?)(?=\s{2,}|\s*(?:Firstname|Email|Tel)|[│\|]|\n|$)/i
    ]

    return this.extractField(content, patterns, 'high', (v) => v.toUpperCase())
  }

  /**
   * Extract first name
   */
  static extractFirstName(content: string): FieldExtractionResult<string> {
    // ✅ FIXED: Stop at field boundaries, max 25 chars
    const patterns = [
      /\*?Pr[ée]nom\*?\s*:?\s*\*?\s*([A-Z\u00C0-\u017F][A-Za-z\u00C0-\u017F\-']{1,39}?)(?=\s{2,}|\s*(?:Nom|Email|T[ée]l|Date|Code|Ville|Adresse)|[│\|]|\n|$)/i,
      /Firstname\s*:?\s*\*?\s*([A-Z\u00C0-\u017F][A-Za-z\u00C0-\u017F\-']{1,39}?)(?=\s{2,}|\s*(?:Lastname|Email|Tel|Date)|[│\|]|\n|$)/i
    ]

    return this.extractField(content, patterns, 'high', (v) =>
      v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()
    )
  }

  /**
   * Extract birth date (DD/MM/YYYY format)
   */
  static extractBirthDate(content: string): FieldExtractionResult<string> {
    const patterns = [
      /\*?Date de naissance\*?\s*:?\s*\*?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i,
      /N[ée]e? le\s*:?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i,
      /Date naissance\s*:?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i,
      /Birth ?date\s*:?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i,
      /\b(\d{2}[-\/]\d{2}[-\/]\d{4})\b/ // Generic date pattern
    ]

    return this.extractField(content, patterns, 'medium', (v) => v.replace(/-/g, '/'))
  }

  /**
   * Extract email address
   */
  static extractEmail(content: string): FieldExtractionResult<string> {
    const patterns = [
      // Label with optional formatting markers (single-line anchored)
      /^\s*\*?E-?mail\*?\s*:?\s*([\w\.\-]+@[\w\.\-]+\.[a-z]{2,})\s*$/im,
      /^\s*\*?Courriel\*?\s*:?\s*([\w\.\-]+@[\w\.\-]+\.[a-z]{2,})\s*$/im,
      // Generic email pattern on its own line
      /^\s*([\w\.\-]+@[\w\.\-]+\.[a-z]{2,})\s*$/im
    ]

    // Use TextCleaner to validate and normalize
    return this.extractField(content, patterns as unknown as RegExp[], 'high', (v) =>
      TextCleaner.cleanEmail(v)
    )
  }

  /**
   * Extract phone number (formats to 10 digits)
   */
  static extractPhone(content: string): FieldExtractionResult<string> {
    // ✅ FIXED: Strict French format first, then labeled patterns with boundaries
    const patterns = [
      // Strict French format: 0X XX XX XX XX (most reliable)
      /\b(0[1-9](?:[\s\.\-]?\d{2}){4})(?=\D|$)/i,
      // With label and boundary
      /T[ée]l[ée]phone\s*(?:portable)?\s*:?\s*(0[1-9](?:[\s\.\-]?\d{2}){4})(?=\D|$)/i,
      /Portable\s*:?\s*(0[1-9](?:[\s\.\-]?\d{2}){4})(?=\D|$)/i,
      /Mobile\s*:?\s*(0[1-9](?:[\s\.\-]?\d{2}){4})(?=\D|$)/i,
      /Tel\s*:?\s*(0[1-9](?:[\s\.\-]?\d{2}){4})(?=\D|$)/i
    ]

    // ✅ FIXED: Use TextCleaner for validation
    return this.extractField(content, patterns, 'high', TextCleaner.cleanPhone)
  }

  /**
   * Extract postal code (5 digits)
   */
  static extractPostalCode(content: string): FieldExtractionResult<string> {
    const patterns = [
      /\*?Code postal\*?\s*:?\s*\*?\s*(\d{5})/i,
      /\*?CP\*?\s*:?\s*\*?\s*(\d{5})/i,
      /Postal ?code\s*:?\s*\*?\s*(\d{5})/i,
      /\b(\d{5})\b/ // Generic 5-digit pattern
    ]

    return this.extractField(content, patterns, 'medium')
  }

  /**
   * Extract city
   */
  static extractCity(content: string): FieldExtractionResult<string> {
    const patterns = [
      /^\s*\*?Ville\*?\s*:?\s*([A-Za-z\u00C0-\u017F\s\-']{2,50})\s*$/im,
      /^\s*\d{5}\s+([A-Za-z\u00C0-\u017F\s\-']{2,50})\s*$/im // "75001 Paris"
    ]

    return this.extractField(content, patterns as unknown as RegExp[], 'medium', (v) =>
      v
        .split(' ')
        .filter(Boolean)
        .map((word) => {
          const upper = word.toUpperCase()
          // Preserve common all-caps shortcuts like ST, STE, SUR, LE, LA, LES
          if (['ST', 'STE', 'SUR', 'LE', 'LA', 'LES', 'DE', 'DES', 'DU', 'D'].includes(upper)) {
            return upper.charAt(0) + upper.slice(1).toLowerCase()
          }
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        })
        .join(' ')
    )
  }

  /**
   * Extract address
   */
  static extractAddress(content: string): FieldExtractionResult<string> {
    const patterns = [
      // Anchor to line start to avoid matching "RUE" inside values
      /^\s*\*?Adresse\*?\s*:?\s*([^\n]{5,100})\s*$/im,
      /^\s*\*?Address\*?\s*:?\s*([^\n]{5,100})\s*$/im,
      /^\s*\*?Rue\*?\s*:?\s*([^\n]{5,100})\s*$/im
    ]

    return this.extractField(content, patterns as unknown as RegExp[], 'medium', (v) => {
      const cleaned = TextCleaner.validateField(v, 120)
      return cleaned.replace(/^\*+\s*/, '')
    })
  }

  /**
   * Extract profession
   */
  static extractProfession(content: string): FieldExtractionResult<string> {
    const patterns = [
      /\*?Profession\*?\s*:?\s*\*?\s*([A-Z\u00C0-\u017F][a-z\u00C0-\u017F\s\-']{2,50})/i,
      /\*?M[ée]tier\*?\s*:?\s*\*?\s*([A-Z\u00C0-\u017F][a-z\u00C0-\u017F\s\-']{2,50})/i,
      /\*?Activit[ée]\*?\s*:?\s*\*?\s*([A-Z\u00C0-\u017F][a-z\u00C0-\u017F\s\-']{2,50})/i
    ]

    return this.extractField(content, patterns, 'medium')
  }

  /**
   * Extract regime (SECURITE_SOCIALE, TNS, ALSACE_MOSELLE, etc.)
   */
  static extractRegime(content: string): FieldExtractionResult<string> {
    const patterns = [
      /\*?R[ée]gime\*?\s*:?\s*\*?\s*(S[ée]curit[ée]\s+Sociale|SS|RSI|TNS|Alsace[- ]Moselle|CPCAM)/i,
      /\*?R[ée]gime obligatoire\*?\s*:?\s*\*?\s*([^\n]{5,50})/i
    ]

    const transform = (v: string) => {
      const normalized = v.toUpperCase()
      if (normalized.match(/S[ÉE]CURIT[ÉE]|^SS$/)) return 'SECURITE_SOCIALE'
      if (normalized.match(/TNS|RSI/)) return 'TNS'
      if (normalized.match(/ALSACE|MOSELLE/)) return 'ALSACE_MOSELLE'
      return v
    }

    return this.extractField(content, patterns, 'medium', transform)
  }

  /**
   * Extract category (CADRES, NON_CADRES, etc.)
   */
  static extractCategory(content: string): FieldExtractionResult<string> {
    const patterns = [
      /Cat[ée]gorie\s*:?\s*(Cadre|Non[- ]?Cadre|Employ[ée])/i,
      /Statut\s*:?\s*(Cadre|Non[- ]?Cadre)/i
    ]

    const transform = (v: string) => {
      const normalized = v.toUpperCase()
      if (normalized.includes('NON')) return 'NON_CADRES'
      if (normalized.includes('CADRE')) return 'CADRES'
      return v
    }

    return this.extractField(content, patterns, 'medium', transform)
  }

  /**
   * Extract status (SALARIE, TNS, etc.)
   */
  static extractStatus(content: string): FieldExtractionResult<string> {
    const patterns = [
      /Statut\s*:?\s*(Salari[ée]|TNS|Ind[ée]pendant|Fonctionnaire|Profession lib[ée]rale)/i,
      /Situation professionnelle\s*:?\s*([^\n]{5,50})/i
    ]

    const transform = (v: string) => {
      const normalized = v.toUpperCase()
      if (normalized.match(/SALARI/)) return 'SALARIE'
      if (normalized.match(/TNS|IND[ÉE]PENDANT/)) return 'TNS'
      if (normalized.match(/FONCTIONNAIRE/)) return 'FONCTIONNAIRE'
      if (normalized.match(/LIB[ÉE]RAL/)) return 'PROFESSION_LIBERALE'
      return v
    }

    return this.extractField(content, patterns, 'medium', transform)
  }

  /**
   * Extract date d'effet
   */
  static extractDateEffet(content: string): FieldExtractionResult<string> {
    const patterns = [
      /Date d['’]effet\s*:?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i,
      /Date de d[ée]but\s*:?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i,
      /Effet le\s*:?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i,
      /Effective date\s*:?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i
    ]

    return this.extractField(content, patterns as unknown as RegExp[], 'medium', (v) =>
      TextCleaner.cleanDate(v)
    )
  }

  /**
   * Extract all contact information at once
   */
  static extractContactInfo(content: string) {
    return {
      email: this.extractEmail(content),
      telephone: this.extractPhone(content),
      address: this.extractAddress(content),
      postalCode: this.extractPostalCode(content),
      city: this.extractCity(content)
    }
  }

  /**
   * Extract all subscriber identity at once
   */
  static extractIdentity(content: string) {
    return {
      civility: this.extractCivility(content),
      lastName: this.extractLastName(content),
      firstName: this.extractFirstName(content),
      birthDate: this.extractBirthDate(content)
    }
  }

  /**
   * Extract all professional information at once
   */
  static extractProfessionalInfo(content: string) {
    return {
      profession: this.extractProfession(content),
      regime: this.extractRegime(content),
      category: this.extractCategory(content),
      status: this.extractStatus(content)
    }
  }

  /**
   * Detect if content contains tabular data (for Assurlead format)
   */
  static detectTabularStructure(content: string): boolean {
    // Look for patterns like:
    // Field Name    | Value
    // ------------- | -----
    const hasTableMarkers = content.match(/[\|│]\s*[^\n]+\s*[\|│]/)
    const hasMultipleColumns = content.match(/[A-Za-z]+\s*[:│\|]\s*[^\n]+/)

    // Detect asterisk-delimited format: *Field Name* Value
    const hasAsteriskFormat = content.match(/\*[A-Za-zÀ-ÿ\s]+\*\s+[^\n*]+/i)

    const result = !!(hasTableMarkers || hasMultipleColumns || hasAsteriskFormat)
    console.log(
      `[FieldExtractor] detectTabularStructure: pipe=${!!hasTableMarkers}, multi=${!!hasMultipleColumns}, asterisk=${!!hasAsteriskFormat}, result=${result}`
    )

    return result
  }

  /**
   * Extract value from tabular format (key | value)
   */
  static extractFromTable(content: string, fieldName: string): FieldExtractionResult {
    // Multiline, anchored patterns to avoid capturing inline phrases
    const patterns = [
      // Key | Value  OR  Key │ Value
      new RegExp(`^\\s*${fieldName}\\s*[│\\|:]\\s*([^\\n│\\|]+)\\s*$`, 'im'),
      // Key: Value
      new RegExp(`^\\s*${fieldName}\\s*:\\s*([^\\n]+)\\s*$`, 'im'),
      // *Key* Value (tolerant) — allow asterisks/spaces around key without using literal '*' outside a character class
      new RegExp(`^\\s*[* ]*${fieldName}[* ]+([^\\n*]+)\\s*$`, 'im')
    ]

    for (const pattern of patterns) {
      const match = content.match(pattern)
      if (match && match[1]) {
        const raw = match[1].trim()
        const value = TextCleaner.validateField(raw, 120)
        if (value) {
          return {
            value,
            confidence: 'high',
            source: 'parsed',
            originalText: match[0]
          }
        }
      }
    }

    return { value: null, confidence: 'low', source: 'parsed' }
  }

  /**
   * Normalize department code from postal code
   */
  static departmentFromPostalCode(postalCode: string): number | null {
    if (!postalCode || postalCode.length !== 5) return null

    const first2 = parseInt(postalCode.substring(0, 2))
    const first3 = parseInt(postalCode.substring(0, 3))

    // Special cases
    if (first3 >= 971 && first3 <= 976) return first3 // DOM-TOM
    if (postalCode.startsWith('20')) {
      // Corsica
      return parseInt(postalCode.substring(0, 3))
    }

    return first2
  }
}
