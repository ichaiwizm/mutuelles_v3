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
   * Uses scoring system to be more lenient - accepts if score >= 2
   */
  canParse(email: EmailMessage): boolean {
    const content = (email.content + ' ' + email.subject + ' ' + email.from).toLowerCase()

    let score = 0
    const scoreDetails: string[] = []

    // Level 1: Domain detection (strongest signal) - 3 points
    const hasDomain = content.includes('assurlead') || content.includes('assurland')
    if (hasDomain) {
      score += 3
      scoreDetails.push('domain(+3)')
    }

    // Level 2: Tabular structure - 2 points
    const hasTableStructure = FieldExtractor.detectTabularStructure(email.content)
    if (hasTableStructure) {
      score += 2
      scoreDetails.push('table(+2)')
    }

    // Level 3: Specific markers - 1 point
    const hasMarkers =
      content.includes('user_id') || content.includes('besoin assurance') || content.includes('devis')
    if (hasMarkers) {
      score += 1
      scoreDetails.push('markers(+1)')
    }

    // Level 4: Individual field detection (more granular) - max 2.5 points
    if (content.includes('civilit')) {
      score += 0.5
      scoreDetails.push('civilite(+0.5)')
    }
    if (content.includes('tel') || content.includes('telephone') || content.includes('mobile')) {
      score += 0.5
      scoreDetails.push('phone(+0.5)')
    }
    if (content.includes('postal') || content.includes('code postal') || content.includes('cp')) {
      score += 0.5
      scoreDetails.push('postal(+0.5)')
    }
    if (content.includes('profession') || content.includes('metier') || content.includes('activit')) {
      score += 0.5
      scoreDetails.push('profession(+0.5)')
    }
    if (content.includes('nom') && content.includes('pr')) { // prenom or prénom
      score += 0.5
      scoreDetails.push('name(+0.5)')
    }

    const canParse = score >= 1.5
    console.log(
      `[AssurleadParser] canParse(${email.id.substring(0, 8)}): score=${score.toFixed(1)}, details=[${scoreDetails.join(', ')}], result=${canParse}`
    )

    // Accept if score >= 1.5
    // Examples of valid combinations:
    // - Domain alone (3 >= 1.5) ✅
    // - Table structure alone (2 >= 1.5) ✅
    // - 3+ individual fields (0.5*3 = 1.5 >= 1.5) ✅
    // - Markers + 1 field (1 + 0.5 = 1.5 >= 1.5) ✅
    return canParse
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

      // Detect spouse and children (enhanced detection, but always try to extract)
      const family = this.detectSpouseAndChildren(content)

      // ALWAYS try to extract spouse - don't rely solely on detection
      const spouse = this.extractSpouseInfo(content, isTabular)
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
      // Accept compound labels like "Téléphone portable" by listing both variants
      telephone: ['t[ée]l[ée]phone\\s*portable', 't[ée]l[ée]phone', 'portable', 'tel', 'mobile'],
      // Assurland often encodes street in a technical field "v4"
      address: ['adresse', 'address', 'rue', 'v4'],
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
        status: 'statut\\s+conjoint',
        profession: 'profession\\s+conjoint'
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
      // Look for spouse-specific sections with flexible separators (: or - or newline)
      // Handles: "Conjoint:", "Conjoint-", "*Conjoint*", "Époux/Épouse:"
      const spouseSection = content.match(/\*?Conjoint\*?\s*[\-:\n]([^\n]*\n){1,10}/i)
      let spouseContent = spouseSection ? spouseSection[0] : ''

      // Fallback: Try to extract inline spouse data if no multi-line section found
      if (!spouseContent) {
        const inlineMatch = content.match(/\*?Conjoint\*?\s*[\-:\n]\s*([^\n]+)/i)
        if (inlineMatch) {
          spouseContent = inlineMatch[0]
        }
      }

      // Additional fallback: Look for spouse keywords
      if (!spouseContent) {
        const spouseKeywordSection = content.match(/[ÉéE]pou[sx]e?\s*[-:]([^\n]*\n){1,10}/i)
        if (spouseKeywordSection) {
          spouseContent = spouseKeywordSection[0]
        }
      }

      if (spouseContent) {
        // Extract identity
        const identity = FieldExtractor.extractIdentity(spouseContent)
        if (identity.civility.value) spouse.civility = this.createParsedField(identity.civility)
        if (identity.lastName.value) spouse.lastName = this.createParsedField(identity.lastName)
        if (identity.firstName.value) spouse.firstName = this.createParsedField(identity.firstName)
        if (identity.birthDate.value) spouse.birthDate = this.createParsedField(identity.birthDate)

        // Extract professional info
        const professional = FieldExtractor.extractProfessionalInfo(spouseContent)
        if (professional.regime.value) spouse.regime = this.createParsedField(professional.regime)
        if (professional.status.value) spouse.status = this.createParsedField(professional.status)
        if (professional.profession.value) spouse.profession = this.createParsedField(professional.profession)
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

        // Try to get regime
        const regime = FieldExtractor.extractFromTable(content, `enfant\\s*${i}.*r[ée]gime`)
        if (regime.value) {
          child.regime = {
            value: regime.value,
            confidence: regime.confidence,
            source: regime.source
          }
        }

        children.push(child)
      }
    }

    // Fallback: Try explicit pattern "Date de naissance [du] 1er/2ème enfant : DD/MM/YYYY"
    // Made "du" optional to support variations like "Date de naissance 1er enfant"
    // Handles asterisks: "*Date de naissance du 1er enfant :* DD/MM/YYYY"
    const childDateRegex = /\*?Date de naissance\s+(?:du\s+)?(\d+)(?:er|e|ème)?\s*enfant\s*\*?\s*:?\s*\*?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/gi
    let m: RegExpExecArray | null
    while ((m = childDateRegex.exec(content)) !== null) {
      const childIndex = parseInt(m[1]) - 1
      // Avoid duplicates - check if child at this index already exists with birthdate
      if (!children[childIndex] || !children[childIndex].birthDate) {
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

    return children
  }

  /**
   * Isolate core Assurlead block to avoid signatures/disclaimers
   * IMPORTANT: Preserves spouse and children sections which may appear late in email
   */
  private extractMainBlock(raw: string): string {
    if (!raw) return ''
    const lower = raw.toLowerCase()

    // Start near first field label
    // IMPORTANT: String.search() returns -1 when not found, and -1 is truthy.
    // Avoid using "|| 0" which would keep -1 and slice from the end.
    const firstFieldRegex = /\b(civilit[ée]?|nom|pr[ée]nom|user_id|code postal|ville|telephone|t[ée]l)/i
    const found = lower.search(firstFieldRegex)
    const start = found >= 0 ? found : 0

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
