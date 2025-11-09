/**
 * AssurProspectParser - Parse les leads du format AssurProspect
 *
 * Format typique: Sections structurées avec labels
 * PAS de détection - juste du parsing pur
 */

import type { CleanedContent, ParserResult, ParsedLeadData } from '../types'
import { BaseLeadParser } from '../BaseLeadParser'
import { FieldExtractor } from '../utils/FieldExtractor'

export class AssurProspectParser extends BaseLeadParser {
  readonly name = 'assurprospect'
  readonly priority = 100

  parse(content: CleanedContent, sourceId: string): ParserResult {
    try {
      this.log('Parsing AssurProspect format')

      const text = content.text

      const parsedData: ParsedLeadData = {
        subscriber: {},
        metadata: {
          parserUsed: this.name,
          parsingDate: new Date().toISOString(),
          sourceId,
          confidence: 'high',
          parsedFieldsCount: 0,
          defaultedFieldsCount: 0,
          warnings: []
        }
      }

      // Extraction subscriber
      const identity = FieldExtractor.extractIdentity(text)
      const contact = FieldExtractor.extractContactInfo(text)
      const professional = FieldExtractor.extractProfessionalInfo(text)

      if (identity.civility.value) parsedData.subscriber!.civility = this.toParsedField(identity.civility)
      if (identity.lastName.value) parsedData.subscriber!.lastName = this.toParsedField(identity.lastName)
      if (identity.firstName.value) parsedData.subscriber!.firstName = this.toParsedField(identity.firstName)
      if (identity.birthDate.value) parsedData.subscriber!.birthDate = this.toParsedField(identity.birthDate)

      if (contact.email.value) parsedData.subscriber!.email = this.toParsedField(contact.email)
      if (contact.telephone.value) parsedData.subscriber!.telephone = this.toParsedField(contact.telephone)
      if (contact.address.value) parsedData.subscriber!.address = this.toParsedField(contact.address)
      if (contact.postalCode.value) parsedData.subscriber!.postalCode = this.toParsedField(contact.postalCode)
      if (contact.city.value) parsedData.subscriber!.city = this.toParsedField(contact.city)

      if (professional.profession.value) parsedData.subscriber!.profession = this.toParsedField(professional.profession)
      if (professional.regime.value) parsedData.subscriber!.regime = this.toParsedField(professional.regime)
      if (professional.status.value) parsedData.subscriber!.status = this.toParsedField(professional.status)

      // Spouse et children
      parsedData.spouse = this.parseSpouse(text)
      parsedData.children = this.parseChildren(text)

      // Project
      parsedData.project = this.parseProject(text)

      return this.createSuccessResult(sourceId, parsedData)
    } catch (error) {
      this.log('Parsing failed', error)
      return this.createFailureResult(
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  /**
   * Parse conjoint
   * ✅ FIXED: Better section boundary detection using negative lookahead
   */
  private parseSpouse(text: string): ParsedLeadData['spouse'] {
    // ✅ Pattern with negative lookahead to stop at next section (Enfant, Besoin, Projet, Contact)
    // Captures lines that don't start with these section headers
    const spouseMatch = text.match(
      /conjoint[^\n]*\n((?:(?!^\s*(?:Enfant|Besoin|Projet|Contact|Souscripteur actuellement))[^\n]*\n)*?)(?=^\s*(?:Enfant|Besoin|Projet|Contact|Souscripteur actuellement)|$)/im
    )
    if (!spouseMatch) return undefined

    const spouseText = spouseMatch[0]

    // ✅ Validate that we actually have spouse-specific data (not just the header)
    const hasSpouseData = spouseText.match(/(?:Date de naissance|Profession|R[ée]gime|Civilit[ée])/i)
    if (!hasSpouseData) return undefined

    const identity = FieldExtractor.extractIdentity(spouseText)
    const professional = FieldExtractor.extractProfessionalInfo(spouseText)

    const spouse: ParsedLeadData['spouse'] = {}
    if (identity.civility.value) spouse.civility = this.toParsedField(identity.civility)
    if (identity.lastName.value) spouse.lastName = this.toParsedField(identity.lastName)
    if (identity.firstName.value) spouse.firstName = this.toParsedField(identity.firstName)
    if (identity.birthDate.value) spouse.birthDate = this.toParsedField(identity.birthDate)
    if (professional.regime.value) spouse.regime = this.toParsedField(professional.regime)
    if (professional.profession.value) spouse.profession = this.toParsedField(professional.profession)

    // ✅ Return undefined if no meaningful data was extracted
    if (Object.keys(spouse).length === 0) return undefined

    return spouse
  }

  /**
   * Parse enfants
   */
  private parseChildren(text: string): ParsedLeadData['children'] {
    const children: ParsedLeadData['children'] = []

    // Pattern: "Enfant 1:", "Date de naissance du 1er enfant:", etc.
    const patterns = [
      /enfant\s+(\d+)[^\n]*:([^\n]*\n){1,5}/gi,
      /date.*naissance.*(\d+).*enfant.*:.*(\d{2}[/-]\d{2}[/-]\d{4})/gi
    ]

    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const childText = match[0]
        const birthDate = FieldExtractor.extractBirthDate(childText)

        if (birthDate.value) {
          children.push({
            birthDate: this.toParsedField(birthDate)
          })
        }
      }
    }

    return children
  }

  /**
   * Parse project info
   */
  private parseProject(text: string): ParsedLeadData['project'] {
    const project: ParsedLeadData['project'] = {}

    const dateEffet = FieldExtractor.extractDateEffet(text)
    if (dateEffet.value) project.dateEffet = this.toParsedField(dateEffet)

    // Type de contrat
    const contractMatch = text.match(/type.*contrat\s*:?\s*([^\n]+)/i)
    if (contractMatch) {
      project.plan = {
        value: contractMatch[1].trim(),
        confidence: 'medium',
        source: 'parsed'
      }
    }

    if (/madelin/i.test(text)) {
      project.madelin = { value: true, confidence: 'high', source: 'parsed' }
    }

    // Souscripteur actuellement assuré : Oui/Non
    const insuredMatch = text.match(/Souscripteur\s+actuellement\s+assur[ée]\s*:\s*(oui|non)/i)
    if (insuredMatch) {
      project.currentlyInsured = {
        value: insuredMatch[1].toLowerCase() === 'oui',
        confidence: 'high',
        source: 'parsed'
      }
    }

    // Need levels: Soins médicaux, Hospitalisation, Optique, Dentaire (values like 1..4)
    const level = (label: string): number | null => {
      const m = text.match(new RegExp(`${label}[^\n]*:\\s*(\\d)`, 'i'))
      return m ? parseInt(m[1], 10) : null
    }

    const medical = level('Soins\s*m[ée]dicaux')
    if (medical !== null) {
      project.medicalCareLevel = { value: medical, confidence: 'medium', source: 'parsed' }
    }
    const hosp = level('Hospitalisation')
    if (hosp !== null) {
      project.hospitalizationLevel = { value: hosp, confidence: 'medium', source: 'parsed' }
    }
    const optics = level('Optique')
    if (optics !== null) {
      project.opticsLevel = { value: optics, confidence: 'medium', source: 'parsed' }
    }
    const dental = level('Dentaire')
    if (dental !== null) {
      project.dentalLevel = { value: dental, confidence: 'medium', source: 'parsed' }
    }

    return project
  }
}
