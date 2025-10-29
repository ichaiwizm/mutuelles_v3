/**
 * Parser for Assurlead email format
 *
 * Detects emails from Assurlead/Assurland with specific markers:
 * - Domain detection (assurlead, assurland)
 * - Tabular structure with specific headers
 * - Specific markers (user_id, besoin assurance)
 *
 * Uses tabular extraction for key-value pairs
 */

import type { EmailMessage } from '../../../shared/types/email'
import type { EmailParsingResult, ParsedLeadData } from '../../../shared/types/emailParsing'
import { BaseEmailParser } from '../BaseEmailParser'
import { FieldExtractor } from '../FieldExtractor'
import { TextCleaner } from '../TextCleaner'

export class AssurleadParser extends BaseEmailParser {
  readonly name = 'AssurleadParser'
  readonly priority = 95 // High priority, slightly lower than AssurProspect

  /**
   * Detect if email is from Assurlead/Assurland
   */
  canParse(email: EmailMessage): boolean {
    const content = (email.content + ' ' + email.subject + ' ' + email.from).toLowerCase()

    // Level 1: Domain detection
    const hasDomain = content.includes('assurlead') || content.includes('assurland')

    // Level 2: Tabular structure
    const hasTableStructure = FieldExtractor.detectTabularStructure(email.content)

    // Level 3: Specific markers
    const hasMarkers =
      content.includes('user_id') || content.includes('besoin assurance') || content.includes('devis')

    // Level 4: Basic markers (civilite + tel/cp + profession)
    const hasBasicFields =
      content.includes('civilit') && (content.includes('tel') || content.includes('postal')) && content.includes('profession')

    // Need domain OR (table structure AND markers) OR all basic fields
    return hasDomain || (hasTableStructure && hasMarkers) || hasBasicFields
  }

  /**
   * Parse Assurlead email
   */
  parse(email: EmailMessage): EmailParsingResult {
    try {
      this.log('Parsing Assurlead email', email.id)

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

      // Detect if content is tabular
      const isTabular = FieldExtractor.detectTabularStructure(content)

      if (isTabular) {
        this.log('Using tabular extraction')
        this.extractFromTabularFormat(content, parsedData)
      } else {
        this.log('Using standard extraction')
        const commonFields = this.extractCommonFields(content)
        parsedData.subscriber = { ...commonFields }
      }

      // Extract Assurlead-specific fields
      this.extractAssurleadSpecificFields(content, parsedData)

      // Extract project information
      const projectInfo = this.extractProjectInfo(content)
      if (Object.keys(projectInfo).length > 0) {
        parsedData.project = projectInfo
      }

      // Detect spouse and children
      const family = this.detectSpouseAndChildren(content)
      if (family.hasSpouse) {
        const spouse = this.extractSpouseInfo(content, isTabular)
        if (spouse && Object.keys(spouse).length > 0) {
          parsedData.spouse = spouse
        }
      }
      if (family.childrenCount > 0) {
        const children = this.extractChildrenInfo(content, family.childrenCount)
        if (children.length > 0) parsedData.children = children
      }

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
        `Failed to parse Assurlead email: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Extract fields from tabular format
   */
  private extractFromTabularFormat(content: string, parsedData: ParsedLeadData): void {
    const subscriber = parsedData.subscriber || {}

    // Field mappings (Assurlead field name → our field name)
    const fieldMappings = {
      civility: ['civilit[ée]', 'genre'],
      lastName: ['nom', 'nom de famille', 'lastname'],
      firstName: ['pr[ée]nom', 'firstname'],
      birthDate: ['date de naissance', 'n[ée] le', 'birth'],
      email: ['e-?mail', 'courriel'],
      telephone: ['t[ée]l[ée]phone', 'portable', 'tel', 'mobile'],
      address: ['adresse', 'address', 'rue'],
      postalCode: ['code postal', 'cp'],
      city: ['ville', 'city'],
      profession: ['profession', 'm[ée]tier', 'activit[ée]'],
      regime: ['r[ée]gime'],
      status: ['statut', 'situation professionnelle']
    }

    // Extract each field using table format
    for (const [fieldName, patterns] of Object.entries(fieldMappings)) {
      for (const pattern of patterns) {
        const extraction = FieldExtractor.extractFromTable(content, pattern)
        if (extraction.value) {
          // Apply specific transformations based on field type
          let value = extraction.value

          if (fieldName === 'civility') {
            value = value.toUpperCase()
            if (value.match(/M(ME|ADAME)?/i)) value = 'MADAME'
            else value = 'MONSIEUR'
          } else if (fieldName === 'lastName') {
            value = value.toUpperCase()
          } else if (fieldName === 'firstName') {
            value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
          } else if (fieldName === 'email') {
            value = TextCleaner.cleanEmail(value)
          } else if (fieldName === 'telephone') {
            value = TextCleaner.cleanPhone(value)
          } else if (fieldName === 'birthDate') {
            value = value.replace(/-/g, '/')
          } else if (fieldName === 'postalCode') {
            value = TextCleaner.cleanPostalCode(value)
          } else if (fieldName === 'regime') {
            const normalized = value.toUpperCase()
            if (normalized.match(/S[ÉE]CURIT[ÉE]|^SS$/)) value = 'SECURITE_SOCIALE'
            else if (normalized.match(/TNS|RSI/)) value = 'TNS'
            else if (normalized.match(/ALSACE|MOSELLE/)) value = 'ALSACE_MOSELLE'
          } else if (fieldName === 'status') {
            const normalized = value.toUpperCase()
            if (normalized.match(/SALARI/)) value = 'SALARIE'
            else if (normalized.match(/TNS|IND[ÉE]PENDANT/)) value = 'TNS'
            else if (normalized.match(/FONCTIONNAIRE/)) value = 'FONCTIONNAIRE'
          }

          subscriber[fieldName] = {
            value,
            confidence: extraction.confidence,
            source: extraction.source,
            originalText: extraction.originalText
          }

          // Auto-extract department from postal code
          if (fieldName === 'postalCode') {
            const dept = FieldExtractor.departmentFromPostalCode(value)
            if (dept) {
              subscriber.departmentCode = {
                value: dept,
                confidence: 'high',
                source: 'inferred',
                originalText: value
              }
            }
          }

          break // Found the field, move to next
        }
      }
    }

    parsedData.subscriber = subscriber
  }

  /**
   * Extract Assurlead-specific fields
   */
  private extractAssurleadSpecificFields(
    content: string,
    parsedData: ParsedLeadData
  ): void {
    // User ID (for tracking)
    const userIdMatch = content.match(/user_?id\s*[:|]\s*(\d+)/i)
    if (userIdMatch) {
      if (!parsedData.metadata.warnings) parsedData.metadata.warnings = []
      parsedData.metadata.warnings.push(`User ID: ${userIdMatch[1]}`)
    }

    // Type of insurance needed (Besoin)
    const needMatch = content.match(/besoin\s*[:|]\s*([^\n|]+)/i)
    if (needMatch && !parsedData.project?.plan) {
      const need = needMatch[1].trim()
      if (!parsedData.project) parsedData.project = {}
      parsedData.project.plan = {
        value: need,
        confidence: 'medium',
        source: 'parsed',
        originalText: needMatch[0]
      }
    }

    // Currently insured
    const insuredMatch = content.match(/(d[ée]j[aà]\s+assur[ée]|actuellement\s+assur[ée])/i)
    if (insuredMatch) {
      if (!parsedData.project) parsedData.project = {}
      parsedData.project.currentlyInsured = {
        value: true,
        confidence: 'medium',
        source: 'parsed'
      }
    }

    // Wants to cancel current insurance
    const cancelMatch = content.match(/r[ée]silie?r?|annuler|changer\s+d'assurance/i)
    if (cancelMatch) {
      if (!parsedData.project) parsedData.project = {}
      parsedData.project.resiliation = {
        value: true,
        confidence: 'medium',
        source: 'parsed'
      }
    }
  }

  /**
   * Extract spouse information
   */
  private extractSpouseInfo(content: string, isTabular: boolean): ParsedLeadData['spouse'] {
    const spouse: ParsedLeadData['spouse'] = {}

    if (isTabular) {
      // Look for spouse-specific table entries
      const spouseFields = {
        civility: 'civilit[ée]\\s+conjoint',
        lastName: 'nom\\s+conjoint',
        firstName: 'pr[ée]nom\\s+conjoint',
        birthDate: 'date\\s+naissance\\s+conjoint',
        regime: 'r[ée]gime\\s+conjoint',
        status: 'statut\\s+conjoint'
      }

      for (const [fieldName, pattern] of Object.entries(spouseFields)) {
        const extraction = FieldExtractor.extractFromTable(content, pattern)
        if (extraction.value) {
          spouse[fieldName] = {
            value: extraction.value,
            confidence: extraction.confidence,
            source: extraction.source,
            originalText: extraction.originalText
          }
        }
      }
    } else {
      // Look for spouse-specific sections
      const spouseSection = content.match(/Conjoint\s*:([^\n]*\n){1,10}/i)
      const spouseContent = spouseSection ? spouseSection[0] : ''

      if (spouseContent) {
        const identity = FieldExtractor.extractIdentity(spouseContent)
        if (identity.civility.value) spouse.civility = this.createParsedField(identity.civility)
        if (identity.lastName.value) spouse.lastName = this.createParsedField(identity.lastName)
        if (identity.firstName.value) spouse.firstName = this.createParsedField(identity.firstName)
        if (identity.birthDate.value) spouse.birthDate = this.createParsedField(identity.birthDate)
      }
    }

    return spouse
  }

  /**
   * Extract children information
   */
  private extractChildrenInfo(content: string, count: number): ParsedLeadData['children'] {
    const children: ParsedLeadData['children'] = []

    // Try to extract from table format
    for (let i = 1; i <= Math.min(count, 5); i++) {
      const childBirthDate = FieldExtractor.extractFromTable(
        content,
        `enfant\\s*${i}.*date.*naissance`
      )

      if (childBirthDate.value) {
        const child: ParsedLeadData['children'][0] = {
          birthDate: {
            value: childBirthDate.value,
            confidence: childBirthDate.confidence,
            source: childBirthDate.source
          }
        }

        // Try to get gender
        const gender = FieldExtractor.extractFromTable(content, `enfant\\s*${i}.*sexe`)
        if (gender.value) {
          child.gender = {
            value: gender.value.toUpperCase().startsWith('M') ? 'M' : 'F',
            confidence: 'high',
            source: 'parsed'
          }
        }

        children.push(child)
      }
    }

    return children
  }

  /**
   * Isolate core Assurlead block to avoid signatures/disclaimers
   */
  private extractMainBlock(raw: string): string {
    if (!raw) return ''
    const lower = raw.toLowerCase()

    // Start near first field label
    const startIdx =
      lower.search(/\b(civilit|nom|pr[ée]nom|user_id|code postal|ville|telephone|t[ée]l)/i) || 0

    const endCandidates = [
      'le pôle commercial',
      'le pole commercial',
      'cette alerte email',
      'confidentialité',
      'décompte de lead',
      'decompte de lead'
    ]

    let end = raw.length
    for (const m of endCandidates) {
      const idx = lower.indexOf(m)
      if (idx !== -1 && idx > startIdx) end = Math.min(end, idx)
    }

    return raw.slice(startIdx, end)
  }
}
