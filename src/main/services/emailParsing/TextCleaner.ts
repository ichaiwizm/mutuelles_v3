/**
 * Utility for cleaning and normalizing text extracted from emails
 */

export class TextCleaner {
  /**
   * Decode HTML entities to clean text
   */
  static decodeHtmlEntities(text: string): string {
    if (!text) return ''

    return text
      // Common named entities
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&apos;/gi, "'")
      // Accented characters
      .replace(/&eacute;/gi, 'é')
      .replace(/&egrave;/gi, 'è')
      .replace(/&ecirc;/gi, 'ê')
      .replace(/&agrave;/gi, 'à')
      .replace(/&acirc;/gi, 'â')
      .replace(/&ucirc;/gi, 'û')
      .replace(/&ugrave;/gi, 'ù')
      .replace(/&icirc;/gi, 'î')
      .replace(/&ocirc;/gi, 'ô')
      .replace(/&ccedil;/gi, 'ç')
      // Numeric entities (decimal)
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
      // Numeric entities (hex)
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
  }

  /**
   * Normalize whitespace (multiple spaces, tabs, etc. to single space)
   */
  static normalizeWhitespace(text: string): string {
    if (!text) return ''

    return text
      .replace(/[\t\r]+/g, ' ') // Tabs and carriage returns to space
      .replace(/ {2,}/g, ' ') // Multiple spaces to single space
      .replace(/\n{3,}/g, '\n\n') // Multiple newlines to max 2
      .trim()
  }

  /**
   * Strip HTML tags while preserving structure
   */
  static stripHtmlTags(html: string): string {
    if (!html) return ''

    return html
      .replace(/<br\s*\/?>/gi, '\n') // BR to newline
      .replace(/<\/p>/gi, '\n\n') // Paragraph end to double newline
      .replace(/<\/div>/gi, '\n') // Div end to newline
      .replace(/<\/tr>/gi, '\n') // Table row to newline
      .replace(/<\/td>/gi, ' | ') // Table cell to pipe
      .replace(/<[^>]+>/g, ' ') // All other tags to space
  }

  /**
   * Complete cleaning pipeline for email content
   */
  static cleanEmailContent(content: string, isHtml: boolean = false): string {
    if (!content) return ''

    let cleaned = content

    // If HTML, strip tags first
    if (isHtml) {
      cleaned = this.stripHtmlTags(cleaned)
    }

    // Decode HTML entities
    cleaned = this.decodeHtmlEntities(cleaned)

    // Normalize whitespace
    cleaned = this.normalizeWhitespace(cleaned)

    return cleaned
  }

  /**
   * Validate extracted field value
   * Returns empty string if value is invalid, otherwise returns cleaned value
   */
  static validateField(value: string, maxLength: number = 100): string {
    if (!value) return ''

    // Trim first
    const trimmed = value.trim()

    // Reject if too long (likely captured multiple fields)
    if (trimmed.length > maxLength) return ''

    // Reject if still contains HTML entities (cleaning failed)
    if (/&[a-z]+;/i.test(trimmed)) return ''

    // Reject if contains HTML tags (cleaning failed)
    if (/<[^>]+>/i.test(trimmed)) return ''

    return trimmed
  }

  /**
   * Clean and validate phone number
   */
  static cleanPhone(phone: string): string {
    if (!phone) return ''

    // Strip all non-digits
    const digits = phone.replace(/\D/g, '')

    // French phone: exactly 10 digits starting with 0
    if (digits.length === 10 && digits.startsWith('0')) {
      return digits
    }

    return ''
  }

  /**
   * Clean and validate email
   */
  static cleanEmail(email: string): string {
    if (!email) return ''

    const trimmed = email.trim().toLowerCase()

    // Basic email validation
    const emailPattern = /^[\w\.\-]+@[\w\.\-]+\.[a-z]{2,}$/i
    if (emailPattern.test(trimmed)) {
      return trimmed
    }

    return ''
  }

  /**
   * Clean and validate postal code
   */
  static cleanPostalCode(postalCode: string): string {
    if (!postalCode) return ''

    // Extract 5 consecutive digits
    const match = postalCode.match(/\b(\d{5})\b/)
    return match ? match[1] : ''
  }

  /**
   * Clean and validate date (DD/MM/YYYY)
   */
  static cleanDate(date: string): string {
    if (!date) return ''

    // Normalize separator to /
    const normalized = date.replace(/-/g, '/')

    // Validate format
    const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/
    const match = normalized.match(datePattern)

    if (!match) return ''

    const [, day, month, year] = match
    const dayNum = parseInt(day, 10)
    const monthNum = parseInt(month, 10)

    // Basic validation
    if (dayNum < 1 || dayNum > 31) return ''
    if (monthNum < 1 || monthNum > 12) return ''

    return normalized
  }
}
