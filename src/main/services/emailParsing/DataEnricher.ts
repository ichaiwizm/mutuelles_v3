/**
 * Data Enricher
 *
 * Enriches parsed lead data by applying intelligent defaults for missing fields.
 * Uses the existing default value system and business logic.
 */

import type { ParsedLeadData, ParsedField } from '../../shared/types/emailParsing'

export class DataEnricher {
  /**
   * Enrich parsed data with defaults
   */
  static enrich(parsedData: ParsedLeadData): {
    enrichedData: ParsedLeadData
    defaultedFields: string[]
  } {
    const enrichedData: ParsedLeadData = JSON.parse(JSON.stringify(parsedData)) // Deep clone
    const defaultedFields: string[] = []

    // Enrich subscriber
    if (!enrichedData.subscriber) {
      enrichedData.subscriber = {}
    }

    this.enrichSubscriber(enrichedData.subscriber, defaultedFields)

    // Enrich project
    if (!enrichedData.project) {
      enrichedData.project = {}
    }

    this.enrichProject(enrichedData.project, defaultedFields)

    // Enrich spouse if present
    if (enrichedData.spouse) {
      this.enrichSpouse(enrichedData.spouse, defaultedFields)
    }

    // Enrich children if present
    if (enrichedData.children && enrichedData.children.length > 0) {
      enrichedData.children.forEach((child, index) => {
        this.enrichChild(child, index, defaultedFields)
      })
    }

    return { enrichedData, defaultedFields }
  }

  /**
   * Enrich subscriber data
   */
  private static enrichSubscriber(
    subscriber: ParsedLeadData['subscriber'],
    defaultedFields: string[]
  ): void {
    if (!subscriber) return

    // Civility - default to MONSIEUR
    if (!subscriber.civility || !subscriber.civility.value) {
      subscriber.civility = this.createDefaultField('MONSIEUR')
      defaultedFields.push('subscriber.civility')
    }

    // Regime - default to SECURITE_SOCIALE (most common)
    if (!subscriber.regime || !subscriber.regime.value) {
      subscriber.regime = this.createDefaultField('SECURITE_SOCIALE')
      defaultedFields.push('subscriber.regime')
    }

    // Category - default to CADRES only for salaried profiles
    if (!subscriber.category || !subscriber.category.value) {
      const status = subscriber.status?.value
      if (status === 'SALARIE') {
        subscriber.category = this.createDefaultField('CADRES')
        defaultedFields.push('subscriber.category')
      }
    }

    // Status - default to SALARIE only for standard regimes
    if (!subscriber.status || !subscriber.status.value) {
      const regime = subscriber.regime?.value
      if (regime === 'SECURITE_SOCIALE' || regime === 'ALSACE_MOSELLE') {
        subscriber.status = this.createDefaultField('SALARIE')
        defaultedFields.push('subscriber.status')
      }
    }

    // Department code - infer from postal code if not present
    if (
      (!subscriber.departmentCode || !subscriber.departmentCode.value) &&
      subscriber.postalCode &&
      subscriber.postalCode.value
    ) {
      const dept = this.inferDepartmentCode(subscriber.postalCode.value)
      if (dept) {
        subscriber.departmentCode = {
          value: dept,
          confidence: 'high',
          source: 'inferred',
          originalText: subscriber.postalCode.value
        }
        defaultedFields.push('subscriber.departmentCode')
      }
    }
  }

  /**
   * Enrich project data
   */
  private static enrichProject(
    project: ParsedLeadData['project'],
    defaultedFields: string[]
  ): void {
    if (!project) return

    // Date d'effet - default to first day of next month
    if (!project.dateEffet || !project.dateEffet.value) {
      const firstOfNextMonth = this.getFirstDayOfNextMonth()
      project.dateEffet = this.createDefaultField(firstOfNextMonth)
      defaultedFields.push('project.dateEffet')
    }

    // Couverture - default to true (individual coverage)
    if (!project.couverture || project.couverture.value === undefined) {
      project.couverture = this.createDefaultField(true)
      defaultedFields.push('project.couverture')
    }

    // IJ - default to false
    if (!project.ij || project.ij.value === undefined) {
      project.ij = this.createDefaultField(false)
      defaultedFields.push('project.ij')
    }

    // Madelin - default to false (unless TNS status detected)
    if (!project.madelin || project.madelin.value === undefined) {
      project.madelin = this.createDefaultField(false)
      defaultedFields.push('project.madelin')
    }

    // Resiliation - default to false
    if (!project.resiliation || project.resiliation.value === undefined) {
      project.resiliation = this.createDefaultField(false)
      defaultedFields.push('project.resiliation')
    }

    // Reprise - default to false
    if (!project.reprise || project.reprise.value === undefined) {
      project.reprise = this.createDefaultField(false)
      defaultedFields.push('project.reprise')
    }

    // Currently insured - default to false
    if (!project.currentlyInsured || project.currentlyInsured.value === undefined) {
      project.currentlyInsured = this.createDefaultField(false)
      defaultedFields.push('project.currentlyInsured')
    }
  }

  /**
   * Enrich spouse data
   */
  private static enrichSpouse(
    spouse: ParsedLeadData['spouse'],
    defaultedFields: string[]
  ): void {
    if (!spouse) return

    // Check if spouse has any ParsedField structures (even with empty values)
    // We now enrich if ANY field structure exists, allowing parsers to create
    // spouse objects with empty fields that will be enriched with defaults
    const hasAnyFields = Object.values(spouse).some(
      (v: any) => v && typeof v === 'object' && 'value' in v && 'confidence' in v
    )

    // Only skip enrichment if spouse is completely empty (no field structures at all)
    if (!hasAnyFields && Object.keys(spouse).length === 0) return

    // Civility - default to MADAME
    if (!spouse.civility || !spouse.civility.value) {
      spouse.civility = this.createDefaultField('MADAME')
      defaultedFields.push('spouse.civility')
    }

    // Regime - default to SECURITE_SOCIALE
    if (!spouse.regime || !spouse.regime.value) {
      spouse.regime = this.createDefaultField('SECURITE_SOCIALE')
      defaultedFields.push('spouse.regime')
    }

    // Category - default to CADRES
    if (!spouse.category || !spouse.category.value) {
      spouse.category = this.createDefaultField('CADRES')
      defaultedFields.push('spouse.category')
    }

    // Status - default to SALARIE
    if (!spouse.status || !spouse.status.value) {
      spouse.status = this.createDefaultField('SALARIE')
      defaultedFields.push('spouse.status')
    }
  }

  /**
   * Enrich child data
   */
  private static enrichChild(
    child: ParsedLeadData['children'][0],
    index: number,
    defaultedFields: string[]
  ): void {
    if (!child) return

    // Regime - default to SECURITE_SOCIALE
    if (!child.regime || !child.regime.value) {
      child.regime = this.createDefaultField('SECURITE_SOCIALE')
      defaultedFields.push(`children[${index}].regime`)
    }

    // Ayant droit - default to subscriber (1)
    if (!child.ayantDroit || !child.ayantDroit.value) {
      child.ayantDroit = this.createDefaultField('1')
      defaultedFields.push(`children[${index}].ayantDroit`)
    }
  }

  /**
   * Create a default parsed field
   */
  private static createDefaultField<T>(value: T): ParsedField<T> {
    return {
      value,
      confidence: 'high',
      source: 'default'
    }
  }

  /**
   * Get first day of next month in DD/MM/YYYY format
   */
  private static getFirstDayOfNextMonth(): string {
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const day = String(nextMonth.getDate()).padStart(2, '0')
    const month = String(nextMonth.getMonth() + 1).padStart(2, '0')
    const year = nextMonth.getFullYear()

    return `${day}/${month}/${year}`
  }

  /**
   * Infer department code from postal code
   */
  private static inferDepartmentCode(postalCode: string): number | null {
    if (!postalCode || postalCode.length !== 5) return null

    const first2 = parseInt(postalCode.substring(0, 2))
    const first3 = parseInt(postalCode.substring(0, 3))

    // Special cases
    if (first3 >= 971 && first3 <= 976) return first3 // DOM-TOM
    if (postalCode.startsWith('20')) {
      // Corsica
      return parseInt(postalCode.substring(0, 3))
    }

    return first2
  }

  /**
   * Apply business rules for intelligent defaults
   */
  static applyBusinessRules(parsedData: ParsedLeadData): void {
    if (!parsedData.subscriber || !parsedData.project) return

    // If status is TNS, set Madelin to true by default
    if (
      parsedData.subscriber.status?.value === 'TNS' &&
      (!parsedData.project.madelin || !parsedData.project.madelin.value)
    ) {
      parsedData.project.madelin = {
        value: true,
        confidence: 'medium',
        source: 'inferred'
      }
    }

    // If status is EXPLOITANT_AGRICOLE, set Madelin to true
    if (
      parsedData.subscriber.status?.value === 'EXPLOITANT_AGRICOLE' &&
      (!parsedData.project.madelin || !parsedData.project.madelin.value)
    ) {
      parsedData.project.madelin = {
        value: true,
        confidence: 'medium',
        source: 'inferred'
      }
    }

    // If regime is TNS, likely need to set status to TNS
    if (
      parsedData.subscriber.regime?.value === 'TNS' &&
      (!parsedData.subscriber.status || !parsedData.subscriber.status.value)
    ) {
      parsedData.subscriber.status = {
        value: 'TNS',
        confidence: 'medium',
        source: 'inferred'
      }
    }

    // If profession contains "agricole", likely EXPLOITANT_AGRICOLE
    if (
      parsedData.subscriber.profession?.value &&
      parsedData.subscriber.profession.value.toLowerCase().includes('agricole') &&
      (!parsedData.subscriber.status || !parsedData.subscriber.status.value)
    ) {
      parsedData.subscriber.status = {
        value: 'EXPLOITANT_AGRICOLE',
        confidence: 'medium',
        source: 'inferred'
      }
    }
  }

  /**
   * Get default value summary
   */
  static getDefaultsSummary(defaultedFields: string[]): string {
    if (defaultedFields.length === 0) {
      return 'Aucun champ par défaut appliqué'
    }

    const fieldLabels = defaultedFields.map((field) => {
      // Convert field path to French label
      const labels: Record<string, string> = {
        'subscriber.civility': 'Civilité',
        'subscriber.regime': 'Régime',
        'subscriber.category': 'Catégorie',
        'subscriber.status': 'Statut',
        'subscriber.departmentCode': 'Département',
        'project.dateEffet': "Date d'effet",
        'project.couverture': 'Couverture',
        'project.ij': 'IJ',
        'project.madelin': 'Madelin',
        'project.resiliation': 'Résiliation',
        'project.reprise': 'Reprise',
        'project.currentlyInsured': 'Actuellement assuré'
      }

      return labels[field] || field
    })

    return `${defaultedFields.length} champ(s) par défaut : ${fieldLabels.join(', ')}`
  }
}
