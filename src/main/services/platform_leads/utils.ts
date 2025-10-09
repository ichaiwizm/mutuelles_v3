/**
 * Utility functions for platform leads service
 * Helper functions for data extraction, formatting, and manipulation
 */

import type { CleanLead } from '../../../shared/types/leads'

/**
 * Extract a value from a nested object using dot notation
 * @example getValue({ contact: { nom: 'Dupont' } }, 'contact.nom') // 'Dupont'
 */
export function getValue(obj: any, path: string): any {
  if (!obj || !path) return undefined

  const keys = path.split('.')
  let current = obj

  for (const key of keys) {
    // Handle array notation like "enfants[0]"
    const arrayMatch = key.match(/^(.+)\[(\d+)\]$/)
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch
      current = current?.[arrayKey]?.[parseInt(index, 10)]
    } else {
      current = current?.[key]
    }

    if (current === undefined || current === null) {
      return undefined
    }
  }

  return current
}

/**
 * Format a date from DD/MM/YYYY to YYYY-MM-DD or vice versa
 */
export function formatDate(date: string | undefined, targetFormat: 'ISO' | 'FR'): string | undefined {
  if (!date) return undefined

  // Check if date is in DD/MM/YYYY format
  const frMatch = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (frMatch && targetFormat === 'ISO') {
    const [, day, month, year] = frMatch
    return `${year}-${month}-${day}`
  }

  // Check if date is in YYYY-MM-DD format
  const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch && targetFormat === 'FR') {
    const [, year, month, day] = isoMatch
    return `${day}/${month}/${year}`
  }

  return date
}

/**
 * Calculate age from birth date (DD/MM/YYYY format)
 */
export function calculateAge(birthDate: string | undefined): number | null {
  if (!birthDate) return null

  const match = birthDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null

  const [, day, month, year] = match
  const birth = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  const today = new Date()

  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

/**
 * Map a domain value to a platform value using value mappings
 */
export function mapValue(
  value: any,
  mappings: Record<string, string> | undefined
): any {
  if (!mappings || value === undefined || value === null) return value
  return mappings[String(value)] ?? value
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array)
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' && value.trim() === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

/**
 * Deep clone an object (simple implementation)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Extract domain value from lead using domain key notation
 * Supports nested paths and special keys
 * @example getLeadValue(lead, 'contact.nom') // lead.contact.nom
 * @example getLeadValue(lead, 'enfants[0].dateNaissance') // lead.enfants[0].dateNaissance
 */
export function getLeadValue(lead: CleanLead, domainKey: string): any {
  // Map special domain keys to lead structure
  const keyMapping: Record<string, string> = {
    'subscriber.birthDate': 'souscripteur.dateNaissance',
    'subscriber.profession': 'souscripteur.profession',
    'subscriber.regime': 'souscripteur.regimeSocial',
    'spouse.birthDate': 'conjoint.dateNaissance',
    'spouse.profession': 'conjoint.profession',
    'spouse.regime': 'conjoint.regimeSocial',
    'project.dateEffet': 'besoins.dateEffet',
    'project.madelin': 'besoins.madelin'
  }

  const mappedKey = keyMapping[domainKey] || domainKey

  // Handle array notation for children
  if (mappedKey.startsWith('children[')) {
    const arrayMatch = mappedKey.match(/^children\[(\d+)\]\.(.+)$/)
    if (arrayMatch) {
      const [, index, childField] = arrayMatch
      const child = lead.enfants?.[parseInt(index, 10)]
      if (!child) return undefined

      const childMapping: Record<string, string> = {
        'birthDate': 'dateNaissance'
      }
      const mappedChildField = childMapping[childField] || childField
      return child[mappedChildField]
    }
  }

  return getValue(lead, mappedKey)
}

/**
 * Generate a simulation name from lead data
 */
export function generateSimulationName(lead: CleanLead): string {
  const prenom = lead.contact?.prenom?.trim() || ''
  const nom = lead.contact?.nom?.trim() || ''

  if (!prenom && !nom) return 'Simulation sans nom'

  return [prenom, nom].filter(Boolean).join(' ')
}

/**
 * Check if lead has spouse
 */
export function hasSpouse(lead: CleanLead): boolean {
  return !!lead.conjoint && !!lead.conjoint.dateNaissance
}

/**
 * Check if lead has children
 */
export function hasChildren(lead: CleanLead): boolean {
  return Array.isArray(lead.enfants) && lead.enfants.length > 0
}

/**
 * Get number of children
 */
export function getChildrenCount(lead: CleanLead): number {
  return Array.isArray(lead.enfants) ? lead.enfants.length : 0
}
