/**
 * Validator for platform lead data
 * Validates that a lead has all required fields for a specific platform
 */

import type { CleanLead } from '../../../shared/types/leads'
import type {
  ValidationResult,
  ValidationError,
  FieldDefinition,
  PlatformFieldDefinitions
} from '../../../shared/types/platform_leads'
import { isEmpty, getLeadValue } from './utils'

export class PlatformLeadValidator {
  /**
   * Validate that a lead has all required data for a platform
   */
  validate(
    lead: CleanLead,
    fieldDefinitions: PlatformFieldDefinitions,
    strict: boolean = false
  ): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const missingFields: string[] = []
    const incompatibleFields: string[] = []

    // Validate each field definition
    for (const fieldDef of fieldDefinitions.fields) {
      const result = this.validateField(lead, fieldDef, strict)

      if (result.error) {
        errors.push(result.error)
        if (fieldDef.required) {
          missingFields.push(fieldDef.key)
        } else {
          incompatibleFields.push(fieldDef.key)
        }
      }

      if (result.warning) {
        warnings.push(result.warning)
      }
    }

    // In strict mode, warnings become errors
    if (strict) {
      errors.push(...warnings)
      warnings.length = 0
    }

    const isValid = errors.length === 0

    return {
      isValid,
      errors,
      warnings,
      missingFields,
      incompatibleFields
    }
  }

  /**
   * Validate a single field
   */
  private validateField(
    lead: CleanLead,
    fieldDef: FieldDefinition,
    strict: boolean
  ): { error?: ValidationError; warning?: ValidationError } {
    const value = getLeadValue(lead, fieldDef.domainKey)

    // Check if field is empty
    if (isEmpty(value)) {
      if (fieldDef.required) {
        return {
          error: {
            field: fieldDef.key,
            domainKey: fieldDef.domainKey,
            message: `Champ requis manquant: ${fieldDef.label || fieldDef.key}`,
            severity: 'error',
            value
          }
        }
      } else {
        // Optional field missing - warning only
        return {
          warning: {
            field: fieldDef.key,
            domainKey: fieldDef.domainKey,
            message: `Champ optionnel vide: ${fieldDef.label || fieldDef.key}`,
            severity: 'warning',
            value
          }
        }
      }
    }

    // Validate field type and format
    const typeValidation = this.validateFieldType(value, fieldDef)
    if (typeValidation) {
      return { error: typeValidation }
    }

    // Validate against validation rules if present
    if (fieldDef.validation) {
      const ruleValidation = this.validateFieldRules(value, fieldDef)
      if (ruleValidation) {
        return { error: ruleValidation }
      }
    }

    return {}
  }

  /**
   * Validate field type
   */
  private validateFieldType(value: any, fieldDef: FieldDefinition): ValidationError | null {
    switch (fieldDef.type) {
      case 'date':
        if (!this.isValidDate(value)) {
          return {
            field: fieldDef.key,
            domainKey: fieldDef.domainKey,
            message: `Format de date invalide pour ${fieldDef.label || fieldDef.key}`,
            severity: 'error',
            value
          }
        }
        break

      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          return {
            field: fieldDef.key,
            domainKey: fieldDef.domainKey,
            message: `Valeur numérique invalide pour ${fieldDef.label || fieldDef.key}`,
            severity: 'error',
            value
          }
        }
        break

      case 'email':
        if (!this.isValidEmail(value)) {
          return {
            field: fieldDef.key,
            domainKey: fieldDef.domainKey,
            message: `Email invalide pour ${fieldDef.label || fieldDef.key}`,
            severity: 'error',
            value
          }
        }
        break
    }

    return null
  }

  /**
   * Validate against field validation rules
   */
  private validateFieldRules(value: any, fieldDef: FieldDefinition): ValidationError | null {
    const rules = fieldDef.validation!

    // Pattern validation
    if (rules.pattern) {
      const regex = new RegExp(rules.pattern)
      if (!regex.test(String(value))) {
        return {
          field: fieldDef.key,
          domainKey: fieldDef.domainKey,
          message: `Format invalide pour ${fieldDef.label || fieldDef.key}`,
          severity: 'error',
          value
        }
      }
    }

    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      return {
        field: fieldDef.key,
        domainKey: fieldDef.domainKey,
        message: `Valeur non autorisée pour ${fieldDef.label || fieldDef.key}`,
        severity: 'error',
        value
      }
    }

    // Numeric range validation
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        return {
          field: fieldDef.key,
          domainKey: fieldDef.domainKey,
          message: `Valeur trop petite pour ${fieldDef.label || fieldDef.key} (min: ${rules.min})`,
          severity: 'error',
          value
        }
      }

      if (rules.max !== undefined && value > rules.max) {
        return {
          field: fieldDef.key,
          domainKey: fieldDef.domainKey,
          message: `Valeur trop grande pour ${fieldDef.label || fieldDef.key} (max: ${rules.max})`,
          severity: 'error',
          value
        }
      }
    }

    // String length validation
    if (typeof value === 'string') {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        return {
          field: fieldDef.key,
          domainKey: fieldDef.domainKey,
          message: `Texte trop court pour ${fieldDef.label || fieldDef.key} (min: ${rules.minLength})`,
          severity: 'error',
          value
        }
      }

      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        return {
          field: fieldDef.key,
          domainKey: fieldDef.domainKey,
          message: `Texte trop long pour ${fieldDef.label || fieldDef.key} (max: ${rules.maxLength})`,
          severity: 'error',
          value
        }
      }
    }

    return null
  }

  // =================== HELPERS ===================

  private isValidDate(value: any): boolean {
    if (typeof value !== 'string') return false

    // Check DD/MM/YYYY format
    const frMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (frMatch) {
      const [, day, month, year] = frMatch
      const d = parseInt(day, 10)
      const m = parseInt(month, 10)
      const y = parseInt(year, 10)

      if (m < 1 || m > 12) return false
      if (d < 1 || d > 31) return false

      // Basic date validity check
      const date = new Date(y, m - 1, d)
      return date.getDate() === d && date.getMonth() === m - 1 && date.getFullYear() === y
    }

    // Check YYYY-MM-DD format
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (isoMatch) {
      const [, year, month, day] = isoMatch
      const d = parseInt(day, 10)
      const m = parseInt(month, 10)
      const y = parseInt(year, 10)

      if (m < 1 || m > 12) return false
      if (d < 1 || d > 31) return false

      const date = new Date(y, m - 1, d)
      return date.getDate() === d && date.getMonth() === m - 1 && date.getFullYear() === y
    }

    return false
  }

  private isValidEmail(value: any): boolean {
    if (typeof value !== 'string') return false
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }
}
