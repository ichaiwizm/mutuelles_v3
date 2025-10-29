/**
 * Generic parser for structured emails
 *
 * This parser acts as a fallback for emails that don't match specific formats
 * but still contain structured lead information.
 *
 * Scoring system:
 * - Contact info (0-2.5 pts): name, email, phone, address
 * - Subscriber info (0-1.5 pts): birth date, profession, regime
 * - Needs info (0-1.5 pts): effect date, current insurance, coverage levels
 * - Threshold: 2 points minimum to accept
 */

import type { EmailMessage } from '../../../shared/types/email'
import type { EmailParsingResult, ParsedLeadData } from '../../../shared/types/emailParsing'
import { BaseEmailParser } from '../BaseEmailParser'
import { FieldExtractor } from '../FieldExtractor'

export class GenericStructuredParser extends BaseEmailParser {
  readonly name = 'GenericStructuredParser'
  readonly priority = 50 // Lower priority than specific parsers

  private readonly STRUCTURED_THRESHOLD = 2.0

  /**
   * Detect if email contains enough structured data
   */
  canParse(email: EmailMessage): boolean {
    const score = this.calculateStructureScore(email.content)
    return score >= this.STRUCTURED_THRESHOLD
  }

  /**
   * Calculate structure score for email content
   */
  private calculateStructureScore(content: string): number {
    let score = 0

    // Contact info (max 2.5 points)
    const contact = FieldExtractor.extractContactInfo(content)
    if (contact.email.value) score += 1.0
    if (contact.telephone.value) score += 0.75
    if (contact.postalCode.value) score += 0.5
    if (contact.address.value) score += 0.25

    // Identity info (max 1.5 points)
    const identity = FieldExtractor.extractIdentity(content)
    if (identity.lastName.value) score += 0.5
    if (identity.firstName.value) score += 0.5
    if (identity.birthDate.value) score += 0.5

    // Professional info (max 1.0 points)
    const professional = FieldExtractor.extractProfessionalInfo(content)
    if (professional.profession.value) score += 0.25
    if (professional.regime.value) score += 0.25
    if (professional.status.value) score += 0.25
    if (professional.category.value) score += 0.25

    // Project info (max 1.0 points)
    if (content.match(/date d'effet/i)) score += 0.5
    if (content.match(/assurance|couverture|mutuelle/i)) score += 0.25
    if (content.match(/devis|simulation/i)) score += 0.25

    return score
  }

  /**
   * Parse generic structured email
   */
  parse(email: EmailMessage): EmailParsingResult {
    try {
      this.log('Parsing generic structured email', email.id)

      const content = email.content
      const score = this.calculateStructureScore(content)

      this.log('Structure score', score)

      const parsedData: ParsedLeadData = {
        subscriber: {},
        metadata: {
          parserUsed: this.name,
          parsingDate: new Date().toISOString(),
          sourceEmailId: email.id,
          confidence: this.getConfidenceFromScore(score),
          parsedFieldsCount: 0,
          defaultedFieldsCount: 0,
          warnings: []
        }
      }

      // Extract all common fields
      const commonFields = this.extractCommonFields(content)
      parsedData.subscriber = { ...commonFields }

      // Extract project information
      const projectInfo = this.extractProjectInfo(content)
      if (Object.keys(projectInfo).length > 0) {
        parsedData.project = projectInfo
      }

      // Detect spouse and children (enhanced detection, but always try to extract)
      const family = this.detectSpouseAndChildren(content)

      // ALWAYS try to extract spouse - don't rely solely on detection
      parsedData.spouse = this.extractSpouseInfo(content) // Always add, even if empty

      // ALWAYS try to extract children - use detected count or try up to 5
      const childrenCount = family.childrenCount > 0 ? family.childrenCount : 5
      parsedData.children = this.extractChildrenInfo(content, childrenCount) // Always add, even if empty array

      // Add warnings if score is low
      if (score < 3.0) {
        parsedData.metadata.warnings.push(
          `Low confidence extraction (score: ${score.toFixed(1)})`
        )
      }

      // Update metadata
      parsedData.metadata = this.buildMetadata(email, parsedData.subscriber)
      parsedData.metadata.parserUsed = this.name
      parsedData.metadata.confidence = this.getConfidenceFromScore(score)

      this.log('Parsing successful', {
        fieldsExtracted: Object.keys(parsedData.subscriber).length,
        score
      })

      return this.createSuccessResult(email, parsedData)
    } catch (error) {
      this.log('Parsing failed', error)
      return this.createFailureResult(
        email,
        `Failed to parse generic email: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get confidence level from score
   */
  private getConfidenceFromScore(score: number): 'high' | 'medium' | 'low' {
    if (score >= 4.0) return 'high'
    if (score >= 2.5) return 'medium'
    return 'low'
  }

  /**
   * Extract spouse information
   */
  private extractSpouseInfo(content: string): ParsedLeadData['spouse'] {
    const spouse: ParsedLeadData['spouse'] = {}

    // Look for spouse-specific sections or keywords
    const spouseKeywords = [
      /conjoint\s*:([^\n]*\n){1,10}/i,
      /[ée]pou(se|x)\s*:([^\n]*\n){1,10}/i,
      /partenaire\s*:([^\n]*\n){1,10}/i
    ]

    let spouseContent = ''
    for (const regex of spouseKeywords) {
      const match = content.match(regex)
      if (match) {
        spouseContent = match[0]
        break
      }
    }

    // If no specific section, try to extract second person info
    if (!spouseContent) {
      // Look for patterns like "Conjoint : M. DUPONT Marie"
      const conjointMatch = content.match(
        /conjoint[^:]*:\s*([A-Z][a-z]+\.?\s+[A-Z]+\s+[A-Z][a-z]+)/i
      )
      if (conjointMatch) {
        spouseContent = conjointMatch[0]
      }
    }

    if (spouseContent) {
      const identity = FieldExtractor.extractIdentity(spouseContent)
      if (identity.civility.value) spouse.civility = this.createParsedField(identity.civility)
      if (identity.lastName.value) spouse.lastName = this.createParsedField(identity.lastName)
      if (identity.firstName.value) spouse.firstName = this.createParsedField(identity.firstName)
      if (identity.birthDate.value) spouse.birthDate = this.createParsedField(identity.birthDate)

      const professional = FieldExtractor.extractProfessionalInfo(spouseContent)
      if (professional.regime.value) spouse.regime = this.createParsedField(professional.regime)
      if (professional.status.value) spouse.status = this.createParsedField(professional.status)
      if (professional.profession.value)
        spouse.profession = this.createParsedField(professional.profession)
    }

    return spouse
  }

  /**
   * Extract children information
   */
  private extractChildrenInfo(content: string, count: number): ParsedLeadData['children'] {
    const children: ParsedLeadData['children'] = []

    // Look for explicit child sections
    for (let i = 1; i <= Math.min(count, 5); i++) {
      const patterns = [
        new RegExp(`enfant\\s*${i}[^\\n]*:([^\\n]*\\n){1,5}`, 'i'),
        new RegExp(`enfant\\s*#${i}[^\\n]*:([^\\n]*\\n){1,5}`, 'i'),
        new RegExp(`child\\s*${i}[^\\n]*:([^\\n]*\\n){1,5}`, 'i')
      ]

      for (const pattern of patterns) {
        const match = content.match(pattern)
        if (match) {
          const childContent = match[0]
          const child: ParsedLeadData['children'][0] = {}

          // Extract birth date
          const birthDate = FieldExtractor.extractBirthDate(childContent)
          if (birthDate.value) {
            child.birthDate = this.createParsedField(birthDate)
          }

          // Extract gender
          const genderMatch = childContent.match(/sexe\s*:?\s*(M|F|Masculin|F[ée]minin|Gar[cç]on|Fille)/i)
          if (genderMatch) {
            const genderText = genderMatch[1].toUpperCase()
            const gender = genderText.startsWith('M') || genderText.startsWith('G') ? 'M' : 'F'
            child.gender = {
              value: gender,
              confidence: 'high',
              source: 'parsed',
              originalText: genderMatch[0]
            }
          }

          // Extract regime
          const regime = FieldExtractor.extractRegime(childContent)
          if (regime.value) {
            child.regime = this.createParsedField(regime)
          }

          children.push(child)
          break
        }
      }
    }

    // Fallback date extraction removed - was causing data corruption
    // It was incorrectly grabbing spouse birthdates and adding them as children
    // Better to have no children data than incorrect data
    // If children are truly present, they should be captured by the explicit patterns above

    return children
  }

  /**
   * Override project extraction with generic-specific logic
   */
  protected extractProjectInfo(content: string): Partial<ParsedLeadData['project']> {
    const result: Partial<ParsedLeadData['project']> = {}

    // Date d'effet
    const dateEffet = FieldExtractor.extractDateEffet(content)
    if (dateEffet.value) {
      result.dateEffet = this.createParsedField(dateEffet)
    }

    // Extract plan/product name
    const planPatterns = [
      /gamme\s*:?\s*([^\n]{5,50})/i,
      /formule\s*:?\s*([^\n]{5,50})/i,
      /produit\s*:?\s*([^\n]{5,50})/i,
      /offre\s*:?\s*([^\n]{5,50})/i
    ]

    for (const pattern of planPatterns) {
      const match = content.match(pattern)
      if (match) {
        result.plan = {
          value: match[1].trim(),
          confidence: 'medium',
          source: 'parsed',
          originalText: match[0]
        }
        break
      }
    }

    // Madelin
    if (content.match(/loi madelin/i) || content.match(/madelin\s*:\s*(oui|yes|1)/i)) {
      result.madelin = {
        value: true,
        confidence: 'high',
        source: 'parsed'
      }
    }

    // Currently insured
    if (content.match(/actuellement assur[ée]|d[ée]j[aà] assur[ée]/i)) {
      result.currentlyInsured = {
        value: true,
        confidence: 'medium',
        source: 'parsed'
      }
    }

    // Wants to cancel
    if (content.match(/r[ée]silier|changer d'assurance|remplacer/i)) {
      result.resiliation = {
        value: true,
        confidence: 'medium',
        source: 'parsed'
      }
    }

    // Coverage levels (if mentioned)
    const coverageMatch = content.match(/niveau\s+(\d)\s*[/|]\s*(\d)/i)
    if (coverageMatch) {
      result.plan = result.plan || {
        value: `Niveau ${coverageMatch[1]}/${coverageMatch[2]}`,
        confidence: 'medium',
        source: 'parsed',
        originalText: coverageMatch[0]
      }
    }

    return result
  }
}
