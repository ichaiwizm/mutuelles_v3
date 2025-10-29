/**
 * Parser for AssurProspect email format
 *
 * Detects emails from AssurProspect with specific markers like:
 * - "AssurProspect"
 * - "Transmission d'une fiche"
 * - "Voici les éléments de votre prospect"
 */

import type { EmailMessage } from '../../../shared/types/email'
import type { EmailParsingResult, ParsedLeadData } from '../../../shared/types/emailParsing'
import { BaseEmailParser } from '../BaseEmailParser'
import { FieldExtractor } from '../FieldExtractor'

export class AssurProspectParser extends BaseEmailParser {
  readonly name = 'AssurProspectParser'
  readonly priority = 100 // High priority for specific format

  /**
   * Detect if email is from AssurProspect
   */
  canParse(email: EmailMessage): boolean {
    const content = email.content + ' ' + email.subject
    const keywords = ['assurprospect', 'transmission d\'une fiche', 'voici les éléments']

    // Need at least 2 out of 3 keywords
    const matches = keywords.filter((k) => content.toLowerCase().includes(k))
    return matches.length >= 2
  }

  /**
   * Parse AssurProspect email
   */
  parse(email: EmailMessage): EmailParsingResult {
    try {
      this.log('Parsing AssurProspect email', email.id)

      const content = this.extractMainBlock(email.content)
      const parsedData: ParsedLeadData = {
        subscriber: {},
        metadata: {
          parserUsed: this.name,
          parsingDate: new Date().toISOString(),
          sourceEmailId: email.id,
          confidence: 'high',
          parsedFieldsCount: 0,
          defaultedFieldsCount: 0,
          warnings: []
        }
      }

      // Extract subscriber information using common field extractor
      const commonFields = this.extractCommonFields(content)
      parsedData.subscriber = { ...commonFields }

      // AssurProspect-specific extraction
      this.extractAssurProspectSpecificFields(content, parsedData)

      // Extract project information
      const projectInfo = this.extractProjectInfo(content)
      if (Object.keys(projectInfo).length > 0) {
        parsedData.project = projectInfo
      }

      // Detect spouse and children (enhanced detection, but always try to extract)
      const family = this.detectSpouseAndChildren(content)

      // ALWAYS try to extract spouse - don't rely solely on detection
      const spouse = this.extractSpouseInfo(content)
      parsedData.spouse = spouse // Always add, even if empty

      // ALWAYS try to extract children - use detected count or try up to 5
      const childrenCount = family.childrenCount > 0 ? family.childrenCount : 5
      const children = this.extractChildrenInfo(content, childrenCount)
      parsedData.children = children // Always add, even if empty array

      // Update metadata
      parsedData.metadata = this.buildMetadata(email, parsedData.subscriber)
      parsedData.metadata.parserUsed = this.name

      this.log('Parsing successful', {
        fieldsExtracted: Object.keys(parsedData.subscriber).length
      })

      return this.createSuccessResult(email, parsedData)
    } catch (error) {
      this.log('Parsing failed', error)
      return this.createFailureResult(
        email,
        `Failed to parse AssurProspect email: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Extract AssurProspect-specific fields
   */
  private extractAssurProspectSpecificFields(
    content: string,
    parsedData: ParsedLeadData
  ): void {
    // AssurProspect often uses specific field labels
    // Example: "Type de contrat : Santé"
    const contractMatch = content.match(/Type de contrat\s*:?\s*([^\n]+)/i)
    if (contractMatch) {
      // This could help determine the plan
      const contractType = contractMatch[1].trim()
      if (!parsedData.project) parsedData.project = {}
      parsedData.project.plan = {
        value: contractType,
        confidence: 'medium',
        source: 'parsed',
        originalText: contractMatch[0]
      }
    }

    // Extract additional professional information
    // "Secteur d'activité : ..."
    const sectorMatch = content.match(/Secteur d'activit[ée]\s*:?\s*([^\n]+)/i)
    if (sectorMatch && !parsedData.subscriber?.profession) {
      parsedData.subscriber = parsedData.subscriber || {}
      parsedData.subscriber.profession = {
        value: sectorMatch[1].trim(),
        confidence: 'medium',
        source: 'parsed',
        originalText: sectorMatch[0]
      }
    }

    // "Nombre de salariés : ..." (could indicate company size for TNS)
    const employeesMatch = content.match(/Nombre de salari[ée]s\s*:?\s*(\d+)/i)
    if (employeesMatch) {
      const count = parseInt(employeesMatch[1])
      if (count > 0) {
        // Likely TNS or company owner
        if (!parsedData.subscriber?.status) {
          parsedData.subscriber = parsedData.subscriber || {}
          parsedData.subscriber.status = {
            value: 'TNS',
            confidence: 'medium',
            source: 'inferred'
          }
        }
      }
    }
  }

  /**
   * Extract spouse information
   */
  private extractSpouseInfo(content: string): ParsedLeadData['spouse'] {
    const spouse: ParsedLeadData['spouse'] = {}

    // Look for spouse-specific sections with flexible separators (: or - or newline)
    // Handles: "Conjoint:", "Conjoint-", "*Conjoint*", "Époux/Épouse:"
    const spouseSection = content.match(/\*?Conjoint\*?\s*[\-:\n]([^\n]*\n){1,10}/i)
    let spouseContent = spouseSection ? spouseSection[0] : ''

    // Fallback: Try to extract inline spouse data if no multi-line section found
    if (!spouseContent) {
      // Look for inline format: "Conjoint - Field: Value" on single line or "*Conjoint*\nField: Value"
      const inlineMatch = content.match(/\*?Conjoint\*?\s*[\-:\n]\s*([^\n]+)/i)
      if (inlineMatch) {
        spouseContent = inlineMatch[0]
      }
    }

    // If still no spouse content found, try looking for spouse keywords
    if (!spouseContent) {
      const spouseKeywordSection = content.match(/[ÉéE]pou[sx]e?\s*[-:]([^\n]*\n){1,10}/i)
      if (spouseKeywordSection) {
        spouseContent = spouseKeywordSection[0]
      }
    }

    // If no spouse content at all, return empty
    if (!spouseContent) {
      return spouse
    }

    // Extract basic info
    const identity = FieldExtractor.extractIdentity(spouseContent)

    if (identity.civility.value) {
      spouse.civility = this.createParsedField(identity.civility)
    }
    if (identity.lastName.value) {
      spouse.lastName = this.createParsedField(identity.lastName)
    }
    if (identity.firstName.value) {
      spouse.firstName = this.createParsedField(identity.firstName)
    }
    if (identity.birthDate.value) {
      spouse.birthDate = this.createParsedField(identity.birthDate)
    }

    // Professional info
    const professional = FieldExtractor.extractProfessionalInfo(spouseContent)
    if (professional.regime.value) {
      spouse.regime = this.createParsedField(professional.regime)
    }
    if (professional.status.value) {
      spouse.status = this.createParsedField(professional.status)
    }
    if (professional.profession.value) {
      spouse.profession = this.createParsedField(professional.profession)
    }

    return spouse
  }

  /**
   * Extract children information
   */
  private extractChildrenInfo(content: string, count: number): ParsedLeadData['children'] {
    const children: ParsedLeadData['children'] = []

    // Look for "Enfant 1 :", "Enfant 2 :", "*Enfants*", etc.
    for (let i = 1; i <= Math.min(count, 5); i++) {
      const childSection = content.match(
        new RegExp(`\\*?Enfant\\s*${i}\\s*\\*?\\s*:([^\\n]*\\n){1,5}`, 'i')
      )
      const childContent = childSection ? childSection[0] : ''

      if (childContent) {
        const child: ParsedLeadData['children'][0] = {}

        // Birth date
        const birthDate = FieldExtractor.extractBirthDate(childContent)
        if (birthDate.value) {
          child.birthDate = this.createParsedField(birthDate)
        }

        // Gender
        const genderMatch = childContent.match(/Sexe\s*:?\s*(M|F|Masculin|F[ée]minin)/i)
        if (genderMatch) {
          const gender = genderMatch[1].toUpperCase().startsWith('M') ? 'M' : 'F'
          child.gender = {
            value: gender,
            confidence: 'high',
            source: 'parsed',
            originalText: genderMatch[0]
          }
        }

        // Regime
        const regime = FieldExtractor.extractRegime(childContent)
        if (regime.value) {
          child.regime = this.createParsedField(regime)
        }

        children.push(child)
      }
    }

    // Pattern explicite: "Date de naissance [du] 1er/2ème enfant : DD/MM/YYYY"
    // Made "du" optional to support variations like "Date de naissance 1er enfant"
    // Handles asterisks: "*Date de naissance du 1er enfant :* DD/MM/YYYY"
    const childDateRegex = /\*?Date de naissance\s+(?:du\s+)?(\d+)(?:er|e|ème)?\s*enfant\s*\*?\s*:?\s*\*?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/gi
    let m: RegExpExecArray | null
    while ((m = childDateRegex.exec(content)) !== null) {
      const childIndex = parseInt(m[1]) - 1
      // Avoid duplicates - check if child at this index already exists with birthdate
      if (!children[childIndex] || !children[childIndex].birthDate) {
        // Insert at correct position or push
        if (childIndex < children.length && !children[childIndex].birthDate) {
          children[childIndex].birthDate = {
            value: m[2].replace(/-/g, '/'),
            confidence: 'high',
            source: 'parsed',
            originalText: m[0]
          }
        } else {
          children.push({
            birthDate: {
              value: m[2].replace(/-/g, '/'),
              confidence: 'high',
              source: 'parsed',
              originalText: m[0]
            }
          })
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
   * Isolate the core lead block to avoid signatures/disclaimers
   * IMPORTANT: Preserves spouse and children sections which may appear late in email
   */
  private extractMainBlock(raw: string): string {
    if (!raw) return ''
    const lower = raw.toLowerCase()

    const startMarkers = [
      "transmission d'une fiche",
      'voici les éléments de la fiche',
      'voici les elements de la fiche',
      'contact'
    ]

    let start = 0
    for (const m of startMarkers) {
      const idx = lower.indexOf(m)
      if (idx !== -1) {
        start = idx
        break
      }
    }

    // Find the LAST occurrence of family-related sections
    // These sections must be preserved in the extracted content
    const familySectionMarkers = ['conjoint', 'époux', 'épouse', 'enfant']
    let lastFamilySection = -1
    for (const marker of familySectionMarkers) {
      const idx = lower.lastIndexOf(marker)
      if (idx !== -1) {
        lastFamilySection = Math.max(lastFamilySection, idx)
      }
    }

    const endMarkers = [
      'a noter',
      'a noter :',
      'a très bientôt sur assurprospect',
      'a tres bientot sur assurprospect',
      "l'équipe assurprospect",
      'ps :',
      'confidentialité',
      'sarl france epargne'
    ]

    let end = raw.length
    for (const m of endMarkers) {
      const idx = lower.indexOf(m)
      // Only use end marker if it comes AFTER all family sections
      // This prevents truncating spouse/children data
      if (idx !== -1 && idx > start && idx > lastFamilySection) {
        end = Math.min(end, idx)
      }
    }

    const sliced = raw.slice(start, end)
    return sliced || raw
  }
}
