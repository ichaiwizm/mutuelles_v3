/**
 * Parser Registry
 *
 * Manages all available email parsers and selects the best one for each email.
 * Parsers are tried in priority order (higher priority first).
 */

import type { EmailMessage } from '../../shared/types/email'
import type { EmailParsingResult } from '../../shared/types/emailParsing'
import type { IEmailParser } from './types'

// Import all parsers
import { AssurProspectParser } from './parsers/AssurProspectParser'
import { AssurleadParser } from './parsers/AssurleadParser'
import { GenericStructuredParser } from './parsers/GenericStructuredParser'

export class ParserRegistry {
  private parsers: IEmailParser[] = []
  private stats: {
    totalParsed: number
    parserUsage: Record<string, number>
    successRate: Record<string, { success: number; total: number }>
  } = {
    totalParsed: 0,
    parserUsage: {},
    successRate: {}
  }

  constructor() {
    this.registerDefaultParsers()
  }

  /**
   * Register all default parsers
   */
  private registerDefaultParsers(): void {
    this.register(new AssurProspectParser())
    this.register(new AssurleadParser())
    this.register(new GenericStructuredParser())

    this.log(
      'Registered parsers',
      this.parsers.map((p) => `${p.name} (priority: ${p.priority})`)
    )
  }

  /**
   * Register a new parser
   */
  register(parser: IEmailParser): void {
    this.parsers.push(parser)

    // Sort by priority (higher first)
    this.parsers.sort((a, b) => b.priority - a.priority)

    // Initialize stats
    if (!this.stats.parserUsage[parser.name]) {
      this.stats.parserUsage[parser.name] = 0
      this.stats.successRate[parser.name] = { success: 0, total: 0 }
    }
  }

  /**
   * Select the best parser for an email
   */
  selectParser(email: EmailMessage): IEmailParser | null {
    for (const parser of this.parsers) {
      if (parser.canParse(email)) {
        this.log(`Selected parser: ${parser.name} for email ${email.id}`)
        return parser
      }
    }

    this.log(`No parser found for email ${email.id}`)
    return null
  }

  /**
   * Parse an email using the best available parser
   */
  parse(email: EmailMessage): EmailParsingResult {
    this.stats.totalParsed++

    const parser = this.selectParser(email)

    // Track usage
    if (parser) {
      this.stats.parserUsage[parser.name] = (this.stats.parserUsage[parser.name] || 0) + 1
      this.stats.successRate[parser.name].total++
    }

    // Parse using selected parser or try fallbacks
    let result: EmailParsingResult
    if (parser) {
      result = parser.parse(email)
    } else {
      // Fallback 1: if the subject/content suggests Assurlead, try AssurleadParser explicitly
      const lc = `${email.subject}\n${email.content}`.toLowerCase()
      const looksAssurlead = lc.includes('assurlead') || lc.includes('assurland') || lc.includes('opdata@assurland.com')
      if (looksAssurlead) {
        const al = new AssurleadParser()
        result = al.parse(email)
        if (!this.stats.parserUsage[al.name]) {
          this.stats.parserUsage[al.name] = 0
          this.stats.successRate[al.name] = { success: 0, total: 0 }
        }
        this.stats.parserUsage[al.name] += 1
        this.stats.successRate[al.name].total += 1
      } else {
        // Fallback 2: force Generic parser as a last resort
        const generic = new GenericStructuredParser()
        result = generic.parse(email)
        if (!this.stats.parserUsage[generic.name]) {
          this.stats.parserUsage[generic.name] = 0
          this.stats.successRate[generic.name] = { success: 0, total: 0 }
        }
        this.stats.parserUsage[generic.name] += 1
        this.stats.successRate[generic.name].total += 1
      }
    }

    // Track success
    if (result.success) {
      const used = result.parsedData?.metadata?.parserUsed || parser?.name
      if (used && this.stats.successRate[used]) {
        this.stats.successRate[used].success++
      }
    }

    return result
  }

  /**
   * Parse multiple emails in batch
   */
  parseBatch(emails: EmailMessage[]): EmailParsingResult[] {
    return emails.map((email) => this.parse(email))
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const successRates: Record<string, number> = {}

    for (const [parserName, stats] of Object.entries(this.stats.successRate)) {
      if (stats.total > 0) {
        successRates[parserName] = (stats.success / stats.total) * 100
      }
    }

    return {
      totalParsed: this.stats.totalParsed,
      parserUsage: this.stats.parserUsage,
      successRates,
      registeredParsers: this.parsers.map((p) => ({
        name: p.name,
        priority: p.priority
      }))
    }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalParsed: 0,
      parserUsage: {},
      successRate: {}
    }

    // Re-initialize for each parser
    this.parsers.forEach((parser) => {
      this.stats.parserUsage[parser.name] = 0
      this.stats.successRate[parser.name] = { success: 0, total: 0 }
    })
  }

  /**
   * Get list of registered parsers
   */
  getParsers(): IEmailParser[] {
    return [...this.parsers]
  }

  /**
   * Find parser by name
   */
  getParser(name: string): IEmailParser | undefined {
    return this.parsers.find((p) => p.name === name)
  }

  /**
   * Remove a parser
   */
  unregister(name: string): boolean {
    const index = this.parsers.findIndex((p) => p.name === name)
    if (index !== -1) {
      this.parsers.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Log helper
   */
  private log(message: string, data?: any): void {
    console.log(`[ParserRegistry] ${message}`, data || '')
  }
}

// Export singleton instance
export const parserRegistry = new ParserRegistry()
