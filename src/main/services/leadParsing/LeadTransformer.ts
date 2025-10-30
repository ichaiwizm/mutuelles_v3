/**
 * Lead Transformer
 *
 * Transforms ParsedLeadData (nested structure with ParsedField objects)
 * into flat form data compatible with the existing form system.
 */

import type { ParsedLeadData, ParsedField } from '../../../shared/types/emailParsing'

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

    // Transform spouse - check if spouse object exists and has fields (even if empty)
    // We preserve spouse data if the object has any fields, regardless of whether values are populated
    // This allows DataEnricher to add defaults to detected but partially empty spouse objects
    const hasSpouseData = parsedData.spouse && this.hasMeaningfulSpouse(parsedData.spouse)
    if (hasSpouseData) {
      formData.conjoint = true
      this.transformSpouse(parsedData.spouse, formData)
    } else {
      formData.conjoint = false
    }

    // Transform children - check if has at least one child with fields (even if empty)
    // We preserve children if they have any fields, regardless of whether values are populated
    const hasChildrenData =
      parsedData.children &&
      parsedData.children.length > 0 &&
      parsedData.children.some((child) =>
        this.hasAnyFieldValue(child) || this.hasAnyFields(child)
      )

    if (hasChildrenData && parsedData.children) {
      formData.enfants = true
      // Filter children to those with fields (either with values or empty fields)
      const childrenWithData = parsedData.children.filter((child) =>
        this.hasAnyFieldValue(child) || this.hasAnyFields(child)
      )
      formData['children.count'] = childrenWithData.length
      this.transformChildren(childrenWithData, formData)
    } else {
      formData.enfants = false
      formData['children.count'] = 0
    }

    // Transform project
    if (parsedData.project) {
      this.transformProject(parsedData.project, formData)
    }

    // Flatten carrier-specific slices (if present) into prefixed flat keys
    const carriers: Array<'alptis'|'swisslifeone'> = ['alptis','swisslifeone']
    const flatten = (obj: any, prefix: string, out: Record<string, any>) => {
      const walk = (node: any, path: string[]) => {
        if (node === null || node === undefined) return

        // Treat ParsedField objects as leaves and extract .value
        if (typeof node === 'object' && 'value' in node && 'confidence' in node) {
          const key = `${prefix}.${path.join('.')}`
          out[key] = (node as any).value
          return
        }

        if (Array.isArray(node)) {
          node.forEach((item, idx) => walk(item, [...path.slice(0, -1), `${path[path.length-1]}[${idx}]`]))
          return
        }
        if (typeof node === 'object') {
          for (const [k, v] of Object.entries(node)) {
            walk(v as any, [...path, k])
          }
          return
        }
        const key = `${prefix}.${path.join('.')}`
        out[key] = node
      }
      walk(obj, [])
    }
    carriers.forEach((carrier) => {
      const slice = (parsedData as any)[carrier]
      if (slice && typeof slice === 'object') {
        flatten(slice, carrier, formData)
      }
    })

    // Normalize possible dot-index children keys to bracket notation
    // e.g., alptis.children.0.regime -> alptis.children[0].regime
    const childIndexKeyRegex = /^(alptis|swisslifeone)\.children\.(\d+)(\..+)$/
    for (const key of Object.keys(formData)) {
      const m = key.match(childIndexKeyRegex)
      if (m) {
        const newKey = `${m[1]}.children[${m[2]}]${m[3]}`
        if (formData[newKey] === undefined) {
          formData[newKey] = formData[key]
        }
        delete formData[key]
      }
    }

    // Propagate common children.count to SwissLife prefixed count for UI coherence
    if (formData['children.count'] !== undefined && formData['swisslifeone.children.count'] === undefined) {
      formData['swisslifeone.children.count'] = formData['children.count']
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
      const value = this.extractValue((subscriber as any)[parsedKey])
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
      const value = this.extractValue((spouse as any)[parsedKey])
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
        const value = this.extractValue((child as any)[parsedKey])
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
      const value = this.extractValue((project as any)[parsedKey])
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
   * Check if an object has at least one field with a non-null value
   * Used to determine if spouse/children data is meaningful
   */
  private static hasAnyFieldValue(obj: any): boolean {
    if (!obj || typeof obj !== 'object') return false

    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object' && 'value' in value) {
        const fieldValue = value.value
        if (fieldValue !== null && fieldValue !== undefined && String(fieldValue).trim() !== '') {
          return true
        }
      }
    }

    return false
  }

  /**
   * Check if an object has any ParsedField fields (regardless of value)
   * This is more lenient than hasAnyFieldValue and detects objects that have been
   * created by parsers even if all field values are empty.
   * Used to preserve detected spouse/children for enrichment.
   */
  private static hasAnyFields(obj: any): boolean {
    if (!obj || typeof obj !== 'object') return false

    // Check if object has any meaningful ParsedField objects
    // - 'present' with value false is NOT considered meaningful
    // - 'present' with value true IS meaningful
    // - any other ParsedField key is meaningful regardless of value
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object' && 'value' in value && 'confidence' in value) {
        if (key === 'present') {
          if ((value as any).value === true) return true
          continue
        }
        return true // Found at least one ParsedField structure (non 'present')
      }
    }

    return false
  }

  /**
   * Determine if spouse slice has real (non-default) data
   * Considered meaningful if:
   * - present === true, or
   * - at least one of [birthDate, lastName, firstName, regime, status] has source !== 'default' and a non-empty, non-"non renseigne" value
   */
  private static hasMeaningfulSpouse(spouse: any): boolean {
    if (!spouse || typeof spouse !== 'object') return false

    const norm = (v: any) => String(v || '').trim().toLowerCase()
    const isGood = (f: any) => {
      if (!f || typeof f !== 'object') return false
      const val = norm(f.value)
      const src = f.source
      if (src === 'default') return false
      if (!val || val === 'non renseigne' || val === 'non renseigné' || val === 'non renseigne.') return false
      return true
    }

    if (spouse.present && spouse.present.value === true) return true

    const keys = ['birthDate', 'lastName', 'firstName', 'regime', 'status']
    for (const k of keys) {
      if (isGood(spouse[k])) return true
    }
    return false
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
          scores.push(confidenceValues[(value as any).confidence] || 1)
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
