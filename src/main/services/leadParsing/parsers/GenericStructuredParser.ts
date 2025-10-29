/**
 * GenericStructuredParser - Parser générique pour contenu structuré
 *
 * Fallback pour leads qui ne matchent pas de format spécifique
 * Extrait ce qu'il peut avec patterns génériques
 */

import type { CleanedContent, ParserResult, ParsedLeadData } from '../types'
import { BaseLeadParser } from '../BaseLeadParser'
import { FieldExtractor } from '../utils/FieldExtractor'

export class GenericStructuredParser extends BaseLeadParser {
  readonly name = 'generic'
  readonly priority = 50

  parse(content: CleanedContent, sourceId: string): ParserResult {
    try {
      this.log('Parsing with generic parser')

      const text = content.text

      const parsedData: ParsedLeadData = {
        subscriber: {},
        metadata: {
          parserUsed: this.name,
          parsingDate: new Date().toISOString(),
          sourceId,
          confidence: 'medium',
          parsedFieldsCount: 0,
          defaultedFieldsCount: 0,
          warnings: ['Parsed with generic parser - may be incomplete']
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

      // Spouse et children (best effort)
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
   * Parse conjoint (best effort)
   */
  private parseSpouse(text: string): ParsedLeadData['spouse'] {
    const keywords = [
      /conjoint[^\n]*:([^\n]*\n){1,8}/i,
      /[ée]pou[sx]e?[^\n]*:([^\n]*\n){1,8}/i
    ]

    for (const regex of keywords) {
      const match = text.match(regex)
      if (match) {
        const spouseText = match[0]
        const identity = FieldExtractor.extractIdentity(spouseText)

        const spouse: ParsedLeadData['spouse'] = {}
        if (identity.civility.value) spouse.civility = this.toParsedField(identity.civility)
        if (identity.lastName.value) spouse.lastName = this.toParsedField(identity.lastName)
        if (identity.firstName.value) spouse.firstName = this.toParsedField(identity.firstName)
        if (identity.birthDate.value) spouse.birthDate = this.toParsedField(identity.birthDate)

        return spouse
      }
    }

    return {}
  }

  /**
   * Parse enfants (best effort)
   */
  private parseChildren(text: string): ParsedLeadData['children'] {
    const children: ParsedLeadData['children'] = []

    // Essayer de trouver des dates d'enfants
    const childDateRegex = /date.*naissance.*(\d+).*enfant.*:.*(\d{2}[/-]\d{2}[/-]\d{4})/gi
    let match

    while ((match = childDateRegex.exec(text)) !== null) {
      children.push({
        birthDate: {
          value: match[2].replace(/-/g, '/'),
          confidence: 'medium',
          source: 'parsed'
        }
      })
    }

    return children
  }

  /**
   * Parse project info (best effort)
   */
  private parseProject(text: string): ParsedLeadData['project'] {
    const project: ParsedLeadData['project'] = {}

    const dateEffet = FieldExtractor.extractDateEffet(text)
    if (dateEffet.value) project.dateEffet = this.toParsedField(dateEffet)

    if (/madelin/i.test(text)) {
      project.madelin = { value: true, confidence: 'medium', source: 'parsed' }
    }

    return project
  }
}
