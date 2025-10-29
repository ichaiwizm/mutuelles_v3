/**
 * Lead Transformer
 *
 * Transforms ParsedLeadData (nested structure with ParsedField objects)
 * into flat form data compatible with the existing form system.
 */

import type { ParsedLeadData, ParsedField } from '../../shared/types/emailParsing'

export class LeadTransformer {
  /**
   * Transform ParsedLeadData to flat form data
   */
  static toFormData(parsedData: ParsedLeadData): Record<string, any> {
    const formData: Record<string, any> = {}

    // Transform subscriber
    if (parsedData.subscriber) {
      this.transformSubscriber(parsedData.subscriber, formData)
    }

    // Transform spouse
    if (parsedData.spouse && Object.keys(parsedData.spouse).length > 0) {
      formData.conjoint = true
      this.transformSpouse(parsedData.spouse, formData)
    } else {
      formData.conjoint = false
    }

    // Transform children
    if (parsedData.children && parsedData.children.length > 0) {
      formData.enfants = true
      formData['children.count'] = parsedData.children.length
      this.transformChildren(parsedData.children, formData)
    } else {
      formData.enfants = false
      formData['children.count'] = 0
    }

    // Transform project
    if (parsedData.project) {
      this.transformProject(parsedData.project, formData)
    }

    return formData
  }

  /**
   * Transform subscriber fields
   */
  private static transformSubscriber(
    subscriber: ParsedLeadData['subscriber'],
    formData: Record<string, any>
  ): void {
    if (!subscriber) return

    const fieldMappings: Record<string, string> = {
      civility: 'subscriber.civility',
      lastName: 'subscriber.lastName',
      firstName: 'subscriber.firstName',
      birthDate: 'subscriber.birthDate',
      email: 'subscriber.email',
      telephone: 'subscriber.telephone',
      address: 'subscriber.address',
      postalCode: 'subscriber.postalCode',
      city: 'subscriber.city',
      departmentCode: 'subscriber.departmentCode',
      regime: 'subscriber.regime',
      category: 'subscriber.category',
      status: 'subscriber.status',
      profession: 'subscriber.profession',
      workFramework: 'subscriber.workFramework'
    }

    for (const [parsedKey, formKey] of Object.entries(fieldMappings)) {
      const value = this.extractValue(subscriber[parsedKey])
      if (value !== null && value !== undefined) {
        formData[formKey] = value
      }
    }

    // Add children count to subscriber
    if (formData['children.count']) {
      formData['subscriber.childrenCount'] = formData['children.count']
    }
  }

  /**
   * Transform spouse fields
   */
  private static transformSpouse(
    spouse: ParsedLeadData['spouse'],
    formData: Record<string, any>
  ): void {
    if (!spouse) return

    const fieldMappings: Record<string, string> = {
      civility: 'spouse.civility',
      lastName: 'spouse.lastName',
      firstName: 'spouse.firstName',
      birthDate: 'spouse.birthDate',
      regime: 'spouse.regime',
      category: 'spouse.category',
      status: 'spouse.status',
      profession: 'spouse.profession'
    }

    for (const [parsedKey, formKey] of Object.entries(fieldMappings)) {
      const value = this.extractValue(spouse[parsedKey])
      if (value !== null && value !== undefined) {
        formData[formKey] = value
      }
    }
  }

  /**
   * Transform children fields
   */
  private static transformChildren(
    children: ParsedLeadData['children'],
    formData: Record<string, any>
  ): void {
    if (!children || children.length === 0) return

    children.forEach((child, index) => {
      const fieldMappings: Record<string, string> = {
        birthDate: `children[${index}].birthDate`,
        gender: `children[${index}].gender`,
        regime: `children[${index}].regime`,
        ayantDroit: `children[${index}].ayantDroit`
      }

      for (const [parsedKey, formKey] of Object.entries(fieldMappings)) {
        const value = this.extractValue(child[parsedKey])
        if (value !== null && value !== undefined) {
          formData[formKey] = value
        }
      }
    })
  }

  /**
   * Transform project fields
   */
  private static transformProject(
    project: ParsedLeadData['project'],
    formData: Record<string, any>
  ): void {
    if (!project) return

    const fieldMappings: Record<string, string> = {
      name: 'project.name',
      dateEffet: 'project.dateEffet',
      plan: 'project.plan',
      couverture: 'project.couverture',
      ij: 'project.ij',
      madelin: 'project.madelin',
      resiliation: 'project.resiliation',
      reprise: 'project.reprise',
      currentlyInsured: 'project.currentlyInsured'
    }

    for (const [parsedKey, formKey] of Object.entries(fieldMappings)) {
      const value = this.extractValue(project[parsedKey])
      if (value !== null && value !== undefined) {
        formData[formKey] = value
      }
    }

    // If no project name, generate one
    if (!formData['project.name']) {
      const lastName = formData['subscriber.lastName'] || ''
      const firstName = formData['subscriber.firstName'] || ''
      if (lastName || firstName) {
        formData['project.name'] = `Simulation ${lastName} ${firstName}`.trim()
      }
    }
  }

  /**
   * Extract value from ParsedField
   */
  private static extractValue<T>(field: ParsedField<T> | undefined): T | null {
    if (!field) return null
    return field.value
  }

  /**
   * Get list of all fields that were parsed (not defaulted)
   */
  static getParsedFields(parsedData: ParsedLeadData): string[] {
    const parsedFields: string[] = []

    const collectFields = (obj: any, prefix: string) => {
      if (!obj) return

      for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object' && 'value' in value && 'source' in value) {
          if (value.source === 'parsed') {
            parsedFields.push(`${prefix}.${key}`)
          }
        }
      }
    }

    collectFields(parsedData.subscriber, 'subscriber')
    collectFields(parsedData.spouse, 'spouse')
    collectFields(parsedData.project, 'project')

    // Children
    if (parsedData.children) {
      parsedData.children.forEach((child, index) => {
        collectFields(child, `children[${index}]`)
      })
    }

    return parsedFields
  }

  /**
   * Get list of all fields that were defaulted
   */
  static getDefaultedFields(parsedData: ParsedLeadData): string[] {
    const defaultedFields: string[] = []

    const collectFields = (obj: any, prefix: string) => {
      if (!obj) return

      for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object' && 'value' in value && 'source' in value) {
          if (value.source === 'default') {
            defaultedFields.push(`${prefix}.${key}`)
          }
        }
      }
    }

    collectFields(parsedData.subscriber, 'subscriber')
    collectFields(parsedData.spouse, 'spouse')
    collectFields(parsedData.project, 'project')

    // Children
    if (parsedData.children) {
      parsedData.children.forEach((child, index) => {
        collectFields(child, `children[${index}]`)
      })
    }

    return defaultedFields
  }

  /**
   * Get confidence score (0-100)
   */
  static getConfidenceScore(parsedData: ParsedLeadData): number {
    const scores: number[] = []
    const confidenceValues = { high: 3, medium: 2, low: 1 }

    const collectScores = (obj: any) => {
      if (!obj) return

      for (const value of Object.values(obj)) {
        if (value && typeof value === 'object' && 'confidence' in value) {
          scores.push(confidenceValues[value.confidence] || 1)
        }
      }
    }

    collectScores(parsedData.subscriber)
    collectScores(parsedData.spouse)
    collectScores(parsedData.project)

    if (parsedData.children) {
      parsedData.children.forEach(collectScores)
    }

    if (scores.length === 0) return 0

    const average = scores.reduce((sum, s) => sum + s, 0) / scores.length
    return Math.round((average / 3) * 100) // Convert 0-3 scale to 0-100
  }

  /**
   * Create a summary of parsed lead
   */
  static createSummary(parsedData: ParsedLeadData): string {
    const subscriber = parsedData.subscriber
    if (!subscriber) return 'Lead sans données'

    const lastName = this.extractValue(subscriber.lastName) || '?'
    const firstName = this.extractValue(subscriber.firstName) || '?'
    const email = this.extractValue(subscriber.email) || ''
    const phone = this.extractValue(subscriber.telephone) || ''

    let summary = `${firstName} ${lastName}`

    if (email) summary += ` (${email})`
    else if (phone) summary += ` (${phone})`

    return summary
  }

  /**
   * Count total fields present
   */
  static countFields(parsedData: ParsedLeadData): {
    total: number
    parsed: number
    defaulted: number
    inferred: number
  } {
    let total = 0
    let parsed = 0
    let defaulted = 0
    let inferred = 0

    const countInObject = (obj: any) => {
      if (!obj) return

      for (const value of Object.values(obj)) {
        if (value && typeof value === 'object' && 'value' in value && 'source' in value) {
          total++
          if (value.source === 'parsed') parsed++
          else if (value.source === 'default') defaulted++
          else if (value.source === 'inferred') inferred++
        }
      }
    }

    countInObject(parsedData.subscriber)
    countInObject(parsedData.spouse)
    countInObject(parsedData.project)

    if (parsedData.children) {
      parsedData.children.forEach(countInObject)
    }

    return { total, parsed, defaulted, inferred }
  }
}
