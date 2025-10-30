/**
 * AssurleadParser - Parse les leads du format Assurlead/Assurland
 *
 * Format typique: Structure tabulaire (champ\tvaleur)
 * PAS de détection - juste du parsing pur
 */

import type { CleanedContent, ParserResult, ParsedLeadData } from '../types'
import { BaseLeadParser } from '../BaseLeadParser'
import { FieldExtractor } from '../utils/FieldExtractor'
import { TextCleaner } from '../utils/TextCleaner'

export class AssurleadParser extends BaseLeadParser {
  readonly name = 'assurlead'
  readonly priority = 95

  parse(content: CleanedContent, sourceId: string): ParserResult {
    try {
      this.log('Parsing Assurlead format')

      const text = content.text
      const isTabular = FieldExtractor.detectTabularStructure(text)

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

      // Extraction selon format
      if (isTabular) {
        this.parseTabular(text, parsedData)
      } else {
        this.parseStandard(text, parsedData)
      }

      // Spouse et children
      parsedData.spouse = this.parseSpouse(text)
      parsedData.children = this.parseChildren(text)

      // Project info
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
   * Parse format tabulaire (champ\tvaleur)
   */
  private parseTabular(text: string, data: ParsedLeadData): void {
    const fieldMappings: Record<string, string[]> = {
      civility: ['civilit[ée]'],
      lastName: ['nom'],
      firstName: ['pr[ée]nom'],
      birthDate: ['date.*naissance', 'n[ée].*le'],
      email: ['e-?mail'],
      telephone: ['t[ée]l[ée]phone'],
      address: ['adresse', 'v4'],
      postalCode: ['code postal'],
      city: ['ville'],
      profession: ['profession'],
      regime: ['r[ée]gime'],
      status: ['statut']
    }

    for (const [field, patterns] of Object.entries(fieldMappings)) {
      for (const pattern of patterns) {
        const extracted = FieldExtractor.extractFromTable(text, pattern)
        if (extracted.value) {
          data.subscriber![field] = this.toParsedField(extracted)!
          break
        }
      }
    }
  }

  /**
   * Parse format standard (label: valeur)
   */
  private parseStandard(text: string, data: ParsedLeadData): void {
    const identity = FieldExtractor.extractIdentity(text)
    const contact = FieldExtractor.extractContactInfo(text)
    const professional = FieldExtractor.extractProfessionalInfo(text)

    if (identity.civility.value) data.subscriber!.civility = this.toParsedField(identity.civility)
    if (identity.lastName.value) data.subscriber!.lastName = this.toParsedField(identity.lastName)
    if (identity.firstName.value) data.subscriber!.firstName = this.toParsedField(identity.firstName)
    if (identity.birthDate.value) data.subscriber!.birthDate = this.toParsedField(identity.birthDate)

    if (contact.email.value) data.subscriber!.email = this.toParsedField(contact.email)
    if (contact.telephone.value) data.subscriber!.telephone = this.toParsedField(contact.telephone)
    if (contact.address.value) data.subscriber!.address = this.toParsedField(contact.address)
    if (contact.postalCode.value) data.subscriber!.postalCode = this.toParsedField(contact.postalCode)
    if (contact.city.value) data.subscriber!.city = this.toParsedField(contact.city)

    if (professional.profession.value) data.subscriber!.profession = this.toParsedField(professional.profession)
    if (professional.regime.value) data.subscriber!.regime = this.toParsedField(professional.regime)
  }

  /**
   * Parse conjoint
   */
  private parseSpouse(text: string): ParsedLeadData['spouse'] {
    // Pattern: "Conjoint" (avec ou sans deux-points) suivi de 1-8 lignes de données
    const spouseMatch = text.match(/conjoint[^\n]*\n([^\n]*\n){1,8}/i)
    if (!spouseMatch) return undefined

    const spouseText = spouseMatch[0]
    const identity = FieldExtractor.extractIdentity(spouseText)
    const professional = FieldExtractor.extractProfessionalInfo(spouseText)

    const spouse: ParsedLeadData['spouse'] = {}
    if (identity.civility.value) spouse.civility = this.toParsedField(identity.civility)
    if (identity.lastName.value) spouse.lastName = this.toParsedField(identity.lastName)
    if (identity.firstName.value) spouse.firstName = this.toParsedField(identity.firstName)
    if (identity.birthDate.value) spouse.birthDate = this.toParsedField(identity.birthDate)
    if (professional.regime.value) spouse.regime = this.toParsedField(professional.regime)
    if (professional.profession.value) spouse.profession = this.toParsedField(professional.profession)

    return spouse
  }

  /**
   * Parse enfants
   */
  private parseChildren(text: string): ParsedLeadData['children'] {
    const children: ParsedLeadData['children'] = []

    // Pattern: "Date de naissance du Xème enfant : DD/MM/YYYY"
    const regex = /date.*naissance.*(\d+).*enfant.*:.*(\d{2}[/-]\d{2}[/-]\d{4})/gi
    let match

    while ((match = regex.exec(text)) !== null) {
      const birthDate = match[2].replace(/-/g, '/')
      children.push({
        birthDate: {
          value: birthDate,
          confidence: 'high',
          source: 'parsed'
        }
      })
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

    if (/madelin/i.test(text)) {
      project.madelin = { value: true, confidence: 'high', source: 'parsed' }
    }

    return project
  }
}
