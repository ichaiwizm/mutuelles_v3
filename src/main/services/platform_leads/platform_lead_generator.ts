/**
 * Generator for platform-specific lead data
 * Transforms generic clean lead data into platform-specific payloads
 */

import type { CleanLead } from '../../../shared/types/leads'
import type {
  PlatformFieldDefinitions,
  PlatformValueMappings,
  FieldDefinition
} from '../../../shared/types/platform_leads'
import {
  getLeadValue,
  mapValue,
  isEmpty,
  calculateAge,
  generateSimulationName,
  formatDate,
  hasSpouse,
  hasChildren,
  getChildrenCount
} from './utils'

export class PlatformLeadGenerator {
  /**
   * Generate platform-specific data from a clean lead
   */
  generate(
    lead: CleanLead,
    fieldDefinitions: PlatformFieldDefinitions,
    valueMappings?: PlatformValueMappings
  ): Record<string, any> {
    const platformData: Record<string, any> = {}

    for (const fieldDef of fieldDefinitions.fields) {
      const value = this.generateFieldValue(lead, fieldDef, valueMappings, fieldDefinitions.platform)

      // Only include non-empty values
      if (!isEmpty(value)) {
        this.setNestedValue(platformData, fieldDef.key, value)
      }
    }

    // Add computed fields based on platform
    this.addComputedFields(lead, platformData, fieldDefinitions.platform)

    return platformData
  }

  /**
   * Generate value for a single field
   */
  private generateFieldValue(
    lead: CleanLead,
    fieldDef: FieldDefinition,
    valueMappings?: PlatformValueMappings,
    platformSlug?: string
  ): any {
    // Get raw value from lead
    let value = getLeadValue(lead, fieldDef.domainKey)

    // Apply domain-level value mappings first (from base.domain.json)
    if (platformSlug && fieldDef.valueMappings?.[platformSlug]) {
      const domainMapping = fieldDef.valueMappings[platformSlug]
      if (domainMapping[String(value)] !== undefined) {
        value = domainMapping[String(value)]
      }
    }

    // Apply external value mapping if exists (backward compatibility)
    if (valueMappings && valueMappings[fieldDef.key]) {
      value = mapValue(value, valueMappings[fieldDef.key])
    }

    // Apply default value if empty and default is defined
    if (isEmpty(value) && fieldDef.defaultValue !== undefined) {
      value = fieldDef.defaultValue
    }

    // Format value based on field type
    value = this.formatFieldValue(value, fieldDef)

    return value
  }

  /**
   * Format value based on field type
   */
  private formatFieldValue(value: any, fieldDef: FieldDefinition): any {
    if (isEmpty(value)) return value

    switch (fieldDef.type) {
      case 'date':
        // Convert dates to the format expected by the platform
        // Most platforms expect DD/MM/YYYY
        return formatDate(value, 'FR') || value

      case 'number':
        return typeof value === 'number' ? value : Number(value)

      case 'boolean':
      case 'toggle':
        return Boolean(value)

      case 'text':
      case 'select':
      case 'radio':
      default:
        return String(value)
    }
  }

  /**
   * Add computed fields that are derived from lead data
   */
  private addComputedFields(
    lead: CleanLead,
    platformData: Record<string, any>,
    platformSlug: string
  ): void {
    switch (platformSlug) {
      case 'swisslifeone':
        this.addSwissLifeComputedFields(lead, platformData)
        break

      case 'alptis':
        this.addAlptisComputedFields(lead, platformData)
        break
    }
  }

  /**
   * Add SwissLife-specific computed fields
   */
  private addSwissLifeComputedFields(lead: CleanLead, data: Record<string, any>): void {
    // Ensure projet object exists
    if (!data.projet) data.projet = {}

    // Generate simulation name
    if (!data.projet.nom) {
      data.projet.nom = generateSimulationName(lead)
    }

    // Calculate Loi Madelin eligibility (age < 70)
    if (data.projet.loi_madelin === undefined) {
      const age = calculateAge(lead.souscripteur?.dateNaissance)
      data.projet.loi_madelin = age !== null && age < 70
    }

    // Set default values for toggles
    if (data.projet.couverture_individuelle === undefined) {
      data.projet.couverture_individuelle = true
    }

    if (data.projet.indemnites_journalieres === undefined) {
      data.projet.indemnites_journalieres = false
    }

    if (data.projet.resiliation_contrat === undefined) {
      data.projet.resiliation_contrat = false
    }

    if (data.projet.reprise_concurrence === undefined) {
      data.projet.reprise_concurrence = false
    }

    // Add spouse/children presence flags
    data.a_conjoint = hasSpouse(lead)
    data.nb_enfants = getChildrenCount(lead)
  }

  /**
   * Add Alptis-specific computed fields
   */
  private addAlptisComputedFields(lead: CleanLead, data: Record<string, any>): void {
    // Ensure sections exist
    if (!data.projet) data.projet = {}
    if (!data.adherent) data.adherent = {}

    // Generate simulation name
    if (!data.projet.nom) {
      data.projet.nom = generateSimulationName(lead)
    }

    // Add spouse/children presence flags (Alptis uses toggles)
    if (data.conjoint === undefined) {
      data.conjoint_present = hasSpouse(lead)
    }

    if (data.enfants === undefined) {
      data.enfants_present = hasChildren(lead)
      data.nb_enfants = getChildrenCount(lead)
    }
  }

  /**
   * Set a value in a nested object using dot notation
   * @example setNestedValue({}, 'projet.nom', 'Test') => { projet: { nom: 'Test' } }
   */
  private setNestedValue(obj: Record<string, any>, path: string, value: any): void {
    const keys = path.split('.')
    let current = obj

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key]
    }

    const lastKey = keys[keys.length - 1]
    current[lastKey] = value
  }
}
