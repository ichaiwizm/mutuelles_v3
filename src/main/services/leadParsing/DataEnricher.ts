/**
 * Data Enricher
 *
 * Enriches parsed lead data by applying intelligent defaults for missing fields.
 * Now uses the unified defaults system from @/shared/defaults
 */

import type { ParsedLeadData, ParsedField } from '@shared/types/emailParsing'
import { enrich, applyAllBusinessRules } from '@shared/defaults'
import type { DefaultContext } from '@shared/defaults'

export class DataEnricher {
  /**
   * Enrich parsed data with defaults
   *
   * Now uses the unified defaults system. Converts between ParsedLeadData
   * (with ParsedField wrappers) and the simple value structure used by the
   * shared defaults module.
   */
  static enrich(parsedData: ParsedLeadData): {
    enrichedData: ParsedLeadData
    defaultedFields: string[]
  } {
    // Convert ParsedLeadData to simple values for the shared module
    const currentValues = this.parsedDataToValues(parsedData)

    // Create context for default generation (email source)
    const context: DefaultContext = {
      source: 'email',
      platform: undefined, // Platform not known at parsing time
      currentValues
    }

    // Use the shared defaults module
    const enrichmentResult = enrich(currentValues, context, undefined, {
      overwriteExisting: false, // Don't overwrite existing parsed values
      minConfidence: 'low' // Accept all confidence levels
    })

    // Convert enriched values back to ParsedLeadData structure
    const enrichedData = this.valuesToParsedData(enrichmentResult.enrichedData, parsedData)

    return {
      enrichedData,
      defaultedFields: enrichmentResult.defaultedFields
    }
  }

  /**
   * Convert ParsedLeadData (with ParsedField wrappers) to simple values
   */
  private static parsedDataToValues(parsedData: ParsedLeadData): Record<string, any> {
    const values: Record<string, any> = {}

    // Extract subscriber values
    if (parsedData.subscriber) {
      values.subscriber = {}
      for (const [key, field] of Object.entries(parsedData.subscriber)) {
        if (field && typeof field === 'object' && 'value' in field) {
          values.subscriber[key] = field.value
        }
      }
    }

    // Extract project values
    if (parsedData.project) {
      values.project = {}
      for (const [key, field] of Object.entries(parsedData.project)) {
        if (field && typeof field === 'object' && 'value' in field) {
          values.project[key] = field.value
        }
      }
    }

    // Extract spouse values
    if (parsedData.spouse) {
      values.spouse = {}
      for (const [key, field] of Object.entries(parsedData.spouse)) {
        if (field && typeof field === 'object' && 'value' in field) {
          values.spouse[key] = field.value
        }
      }
    }

    // Extract children values
    if (parsedData.children && Array.isArray(parsedData.children)) {
      values.children = parsedData.children.map((child) => {
        const childValues: Record<string, any> = {}
        for (const [key, field] of Object.entries(child)) {
          if (field && typeof field === 'object' && 'value' in field) {
            childValues[key] = field.value
          }
        }
        return childValues
      })
    }

    return values
  }

  /**
   * Convert simple values back to ParsedLeadData structure
   *
   * Preserves existing ParsedField metadata from original parsed data,
   * and wraps new default values in ParsedField structures.
   */
  private static valuesToParsedData(
    values: Record<string, any>,
    originalParsedData: ParsedLeadData
  ): ParsedLeadData {
    const result: ParsedLeadData = JSON.parse(JSON.stringify(originalParsedData))

    // Update subscriber
    if (values.subscriber) {
      if (!result.subscriber) result.subscriber = {}
      for (const [key, value] of Object.entries(values.subscriber)) {
        // If field already exists in original, preserve it
        if (result.subscriber[key] && 'value' in result.subscriber[key]) {
          // Field was already parsed, keep original
          continue
        }
        // New default value - wrap in ParsedField
        result.subscriber[key] = this.createDefaultField(value)
      }
    }

    // Update project
    if (values.project) {
      if (!result.project) result.project = {}
      for (const [key, value] of Object.entries(values.project)) {
        if (result.project[key] && 'value' in result.project[key]) {
          continue
        }
        result.project[key] = this.createDefaultField(value)
      }
    }

    // Update spouse
    if (values.spouse) {
      if (!result.spouse) result.spouse = {}
      for (const [key, value] of Object.entries(values.spouse)) {
        if (result.spouse[key] && 'value' in result.spouse[key]) {
          continue
        }
        result.spouse[key] = this.createDefaultField(value)
      }
    }

    // Update children
    if (values.children && Array.isArray(values.children)) {
      if (!result.children) result.children = []
      values.children.forEach((child, index) => {
        if (!result.children[index]) result.children[index] = {}
        for (const [key, value] of Object.entries(child)) {
          if (result.children[index][key] && 'value' in result.children[index][key]) {
            continue
          }
          result.children[index][key] = this.createDefaultField(value)
        }
      })
    }

    return result
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
   * Apply business rules for intelligent defaults
   *
   * Now uses the unified business rules from the shared defaults module.
   * This method is kept for backward compatibility but delegates to the shared system.
   */
  static applyBusinessRules(parsedData: ParsedLeadData): void {
    // Convert to simple values
    const currentValues = this.parsedDataToValues(parsedData)

    // Create context
    const context: DefaultContext = {
      source: 'email',
      platform: undefined,
      currentValues
    }

    // Apply business rules from shared module
    const businessDefaults = applyAllBusinessRules(currentValues, context)

    // Apply the business rule defaults to parsedData
    for (const [fieldPath, defaultValue] of Object.entries(businessDefaults)) {
      if (!defaultValue) continue

      // Parse field path (e.g., "subscriber.status", "project.madelin")
      const parts = fieldPath.split('.')
      if (parts.length === 2) {
        const [section, field] = parts
        if (section === 'subscriber' && parsedData.subscriber) {
          if (!parsedData.subscriber[field] || !parsedData.subscriber[field].value) {
            parsedData.subscriber[field] = {
              value: defaultValue.value,
              confidence: 'medium',
              source: 'inferred'
            }
          }
        } else if (section === 'project' && parsedData.project) {
          if (!parsedData.project[field] || parsedData.project[field].value === undefined) {
            parsedData.project[field] = {
              value: defaultValue.value,
              confidence: 'medium',
              source: 'inferred'
            }
          }
        } else if (section === 'spouse' && parsedData.spouse) {
          if (!parsedData.spouse[field] || !parsedData.spouse[field].value) {
            parsedData.spouse[field] = {
              value: defaultValue.value,
              confidence: 'medium',
              source: 'inferred'
            }
          }
        }
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
