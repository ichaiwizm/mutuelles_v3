/**
 * Parsed Data Validator
 *
 * Validates parsed lead data to determine if it's complete enough for insertion.
 * Checks for required fields and assigns validation status.
 */

import type { ParsedLeadData, ValidationStatus } from '../../../shared/types/emailParsing'

export interface ValidationResult {
  status: ValidationStatus
  missingRequiredFields: string[]
  missingOptionalFields: string[]
  warnings: string[]
  score: number // 0-100
}

export class ParsedDataValidator {
  // Critical fields that MUST be present (or defaultable)
  private static readonly CRITICAL_FIELDS = [
    'subscriber.lastName',
    'subscriber.firstName'
  ]

  // Important fields that should be present for high quality
  private static readonly IMPORTANT_FIELDS = [
    'subscriber.civility',
    'subscriber.birthDate',
    'subscriber.postalCode',
    // Multi-porteur: exigence "régime" satisfaite si présent sur au moins un porteur
    'subscriber.regime',
    'project.dateEffet'
  ]

  // Optional but useful fields
  private static readonly OPTIONAL_FIELDS = [
    'subscriber.email',
    'subscriber.address',
    'subscriber.city',
    'subscriber.departmentCode',
    'subscriber.profession',
    'subscriber.category',
    'subscriber.status',
    'project.plan',
    'project.madelin'
  ]

  /**
   * Validate parsed lead data
   */
  static validate(parsedData: ParsedLeadData): ValidationResult {
    const result: ValidationResult = {
      status: 'invalid',
      missingRequiredFields: [],
      missingOptionalFields: [],
      warnings: [],
      score: 0
    }

    // Check critical fields
    const missingCritical: string[] = []
    for (const fieldPath of this.CRITICAL_FIELDS) {
      if (!this.hasField(parsedData, fieldPath)) {
        missingCritical.push(fieldPath)
      }
    }

    // Check important fields
    const missingImportant: string[] = []
    for (const fieldPath of this.IMPORTANT_FIELDS) {
      if (!this.hasField(parsedData, fieldPath)) {
        missingImportant.push(fieldPath)
      }
    }

    // Check optional fields
    const missingOptional: string[] = []
    for (const fieldPath of this.OPTIONAL_FIELDS) {
      if (!this.hasField(parsedData, fieldPath)) {
        missingOptional.push(fieldPath)
      }
    }

    // Calculate score
    const criticalScore = ((this.CRITICAL_FIELDS.length - missingCritical.length) / this.CRITICAL_FIELDS.length) * 50
    const importantScore = ((this.IMPORTANT_FIELDS.length - missingImportant.length) / this.IMPORTANT_FIELDS.length) * 30
    const optionalScore = ((this.OPTIONAL_FIELDS.length - missingOptional.length) / this.OPTIONAL_FIELDS.length) * 20

    result.score = Math.round(criticalScore + importantScore + optionalScore)

    // Determine status
    if (missingCritical.length > 0) {
      result.status = 'invalid'
      result.missingRequiredFields = missingCritical
      result.warnings.push(
        `Missing critical fields: ${missingCritical.map((f) => this.fieldLabel(f)).join(', ')}`
      )
    } else if (missingImportant.length > 0) {
      result.status = 'partial'
      result.missingRequiredFields = missingImportant
      result.warnings.push(
        `Missing important fields: ${missingImportant.map((f) => this.fieldLabel(f)).join(', ')}`
      )
    } else {
      result.status = 'valid'
    }

    result.missingOptionalFields = missingOptional

    // Additional validation warnings
    this.addQualityWarnings(parsedData, result)

    return result
  }

  /**
   * Check if a field exists and has a value
   */
  private static hasField(parsedData: ParsedLeadData, fieldPath: string): boolean {
    // Multi-porteur: cas particuliers mappés vers variantes préfixées
    if (fieldPath === 'subscriber.regime') {
      // Satisfait si commun ou au moins un des porteurs possède un régime
      if (this.hasField(parsedData, 'alptis.subscriber.regime' as any)) return true
      if (this.hasField(parsedData, 'swisslifeone.subscriber.regime' as any)) return true
      // Continue avec la vérification classique du champ commun
    }
    if (fieldPath === 'project.plan') {
      // Optionnel: plan SwissLife est préfixé
      if (this.hasField(parsedData, 'swisslifeone.project.plan' as any)) return true
    }
    const parts = fieldPath.split('.')
    let current: any = parsedData

    for (const part of parts) {
      if (!current || !current[part]) {
        return false
      }
      current = current[part]
    }

    // Check ParsedField wrapper
    if (current && typeof current === 'object' && 'value' in current) {
      return current.value !== null && current.value !== undefined && current.value !== ''
    }

    // Accept plain primitive values (e.g., carrier-prefixed leaves stored as raw values)
    if (current !== null && current !== undefined && typeof current !== 'object') {
      const str = String(current)
      return str.trim() !== ''
    }

    return false
  }

  /**
   * Get value of a field
   */
  private static getFieldValue(parsedData: ParsedLeadData, fieldPath: string): any {
    const parts = fieldPath.split('.')
    let current: any = parsedData

    for (const part of parts) {
      if (!current || !current[part]) {
        return null
      }
      current = current[part]
    }

    // Extract value from ParsedField
    if (current && typeof current === 'object' && 'value' in current) {
      return current.value
    }

    return current
  }

  /**
   * Add quality warnings based on field values
   */
  private static addQualityWarnings(parsedData: ParsedLeadData, result: ValidationResult): void {
    // Check email format
    const email = this.getFieldValue(parsedData, 'subscriber.email')
    if (email && !this.isValidEmail(email)) {
      result.warnings.push(`Invalid email format: ${email}`)
    }

    // Check phone format (should be 10 digits)
    const phone = this.getFieldValue(parsedData, 'subscriber.telephone')
    if (phone && !this.isValidPhone(phone)) {
      result.warnings.push(`Invalid phone format: ${phone} (expected 10 digits)`)
    }

    // Check postal code format (should be 5 digits)
    const postalCode = this.getFieldValue(parsedData, 'subscriber.postalCode')
    if (postalCode && !this.isValidPostalCode(postalCode)) {
      result.warnings.push(`Invalid postal code: ${postalCode} (expected 5 digits)`)
    }

    // Check birth date format
    const birthDate = this.getFieldValue(parsedData, 'subscriber.birthDate')
    if (birthDate && !this.isValidDate(birthDate)) {
      result.warnings.push(`Invalid birth date format: ${birthDate}`)
    }

    // Check date d'effet format
    const dateEffet = this.getFieldValue(parsedData, 'project.dateEffet')
    if (dateEffet && !this.isValidDate(dateEffet)) {
      result.warnings.push(`Invalid date d'effet format: ${dateEffet}`)
    }

    // Check for low confidence fields
    const lowConfidenceFields = this.getLowConfidenceFields(parsedData)
    if (lowConfidenceFields.length > 0) {
      result.warnings.push(
        `Low confidence fields: ${lowConfidenceFields.map((f) => this.fieldLabel(f)).join(', ')}`
      )
    }

    // Check if spouse data is incomplete
    if (parsedData.spouse && Object.keys(parsedData.spouse).length < 2) {
      result.warnings.push('Spouse data is very incomplete (consider removing)')
    }

    // Check if children data is incomplete
    if (parsedData.children && parsedData.children.length > 0) {
      const incompleteChildren = parsedData.children.filter(
        (child) => !child.birthDate || !child.birthDate.value
      ).length

      if (incompleteChildren > 0) {
        result.warnings.push(
          `${incompleteChildren} child(ren) missing birth date`
        )
      }
    }
  }

  /**
   * Get fields with low confidence
   */
  private static getLowConfidenceFields(parsedData: ParsedLeadData): string[] {
    const lowConfidence: string[] = []

    const checkObject = (obj: any, prefix: string) => {
      if (!obj) return

      for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object' && 'confidence' in value) {
          if (value.confidence === 'low') {
            lowConfidence.push(`${prefix}.${key}`)
          }
        }
      }
    }

    checkObject(parsedData.subscriber, 'subscriber')
    checkObject(parsedData.spouse, 'spouse')
    checkObject(parsedData.project, 'project')

    return lowConfidence
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[\w\.\-]+@[\w\.\-]+\.[a-z]{2,}$/i
    return emailRegex.test(email)
  }

  /**
   * Validate phone format (10 digits)
   */
  private static isValidPhone(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '')
    return cleaned.length === 10 && cleaned.startsWith('0')
  }

  /**
   * Validate postal code (5 digits)
   */
  private static isValidPostalCode(postalCode: string): boolean {
    return /^\d{5}$/.test(postalCode)
  }

  /**
   * Validate date format (DD/MM/YYYY)
   */
  private static isValidDate(date: string): boolean {
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/
    if (!dateRegex.test(date)) return false

    const [day, month, year] = date.split('/').map(Number)
    const dateObj = new Date(year, month - 1, day)

    return (
      dateObj.getDate() === day &&
      dateObj.getMonth() === month - 1 &&
      dateObj.getFullYear() === year
    )
  }

  /**
   * Get human-readable field label
   */
  private static fieldLabel(fieldPath: string): string {
    const labels: Record<string, string> = {
      'subscriber.civility': 'Civilité',
      'subscriber.lastName': 'Nom',
      'subscriber.firstName': 'Prénom',
      'subscriber.birthDate': 'Date de naissance',
      'subscriber.email': 'Email',
      'subscriber.telephone': 'Téléphone',
      'subscriber.address': 'Adresse',
      'subscriber.postalCode': 'Code postal',
      'subscriber.city': 'Ville',
      'subscriber.departmentCode': 'Département',
      'subscriber.regime': 'Régime',
      'subscriber.category': 'Catégorie',
      'subscriber.status': 'Statut',
      'subscriber.profession': 'Profession',
      'project.dateEffet': "Date d'effet",
      'project.plan': 'Gamme/Plan',
      'project.madelin': 'Loi Madelin'
    }

    return labels[fieldPath] || fieldPath
  }

  /**
   * Get summary of validation result
   */
  static getSummary(result: ValidationResult): string {
    const status = result.status === 'valid' ? '✅ Complet' :
                   result.status === 'partial' ? '⚠️ Partiel' :
                   '❌ Invalide'

    const criticalMissing = result.missingRequiredFields.length
    const score = result.score

    return `${status} (${score}%) - ${criticalMissing} champ(s) manquant(s)`
  }
}
