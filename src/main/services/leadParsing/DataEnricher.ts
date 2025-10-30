/**
 * Data enrichment for parsed leads
 *
 * Applies default values and computes derived fields for leads parsed from emails.
 * Uses the unified defaults system (simpleDefaults) and business rules (computedValues).
 */

import { ParsedLeadData, ParsedField } from './types'
import { applyDefaults, getAllDefaults, type DomainSchema } from '@shared/defaults/simpleDefaults'
import { computeDerivedFields } from '@shared/businessRules/computedValues'
import { loadDomainSchema } from '@shared/defaults/schemaLoader'

// ------------------------------
// Normalization helpers
// ------------------------------
function normalizeCivility(input: any): 'MONSIEUR' | 'MADAME' | undefined {
  if (!input) return undefined
  const s = String(input).toLowerCase().replace(/\./g, '').trim()
  if (['m', 'mr', 'monsieur'].includes(s)) return 'MONSIEUR'
  if (['mme', 'madame', 'mlle', 'mademoiselle'].includes(s)) return 'MADAME'
  return undefined
}

function normalizeRegimeCommon(input: any): 'TNS' | 'SECURITE_SOCIALE' | 'AMEXA' | 'SECURITE_SOCIALE_ALSACE_MOSELLE' | 'AUTRES_REGIME_SPECIAUX' | undefined {
  if (!input) return undefined
  const s = String(input).toLowerCase()
  if (s.includes('tns') || s.includes('indépendant') || s.includes('independant') || s.includes('travailleurs non salaries')) return 'TNS'
  if (s.includes('alsace') || s.includes('moselle')) return 'SECURITE_SOCIALE_ALSACE_MOSELLE'
  if (s.includes('msa') || s.includes('amexa') || s.includes('agric')) return 'AMEXA'
  if (s.includes('salari')) return 'SECURITE_SOCIALE'
  if (s.includes('regime général') || s.includes('régime général') || s.includes('sécurité sociale')) return 'SECURITE_SOCIALE'
  if (s.includes('spécial') || s.includes('special')) return 'AUTRES_REGIME_SPECIAUX'
  return undefined
}

function mapRegimeForCarrier(common: ReturnType<typeof normalizeRegimeCommon>, carrier: 'alptis'|'swisslifeone'): string | undefined {
  if (!common) return undefined
  if (carrier === 'swisslifeone') {
    // SwissLife accepts the common codes directly
    return common
  }
  // Alptis mapping
  if (common === 'TNS') return 'SECURITE_SOCIALE_INDEPENDANTS'
  if (common === 'SECURITE_SOCIALE') return 'SECURITE_SOCIALE'
  if (common === 'AMEXA') return 'AMEXA'
  if (common === 'SECURITE_SOCIALE_ALSACE_MOSELLE') return 'ALSACE_MOSELLE'
  // Otherwise, fallback to SECURITE_SOCIALE
  return 'SECURITE_SOCIALE'
}

function cleanPostalCode(input: any): string | undefined {
  if (input === undefined || input === null) return undefined
  const s = String(input).replace(/\D/g, '').slice(0, 5)
  return s.length === 5 ? s : undefined
}

function cleanPhone(input: any): string | undefined {
  if (!input) return undefined
  const s = String(input).replace(/\D/g, '')
  // Keep as-is if 10+ digits, trim to last 10 if longer
  if (s.length >= 10) return s.slice(-10)
  return s || undefined
}

/**
 * Convert ParsedLeadData (with ParsedField wrappers) to plain values object
 */
function parsedDataToValues(parsedData: ParsedLeadData): Record<string, any> {
  const values: Record<string, any> = {}

  // Helper to extract value from ParsedField or use direct value
  const extractValue = (field: any): any => {
    if (field && typeof field === 'object' && 'value' in field) {
      return (field as ParsedField).value
    }
    return field
  }

  // Extract subscriber fields
  if (parsedData.subscriber) {
    values.subscriber = {}
    for (const [key, field] of Object.entries(parsedData.subscriber)) {
      values.subscriber[key] = extractValue(field)
    }
  }

  // Extract spouse fields
  if (parsedData.spouse) {
    values.spouse = {}
    for (const [key, field] of Object.entries(parsedData.spouse)) {
      values.spouse[key] = extractValue(field)
    }
  }

  // Extract children fields
  if (parsedData.children && Array.isArray(parsedData.children)) {
    values.children = parsedData.children.map((child) => {
      const childValues: Record<string, any> = {}
      for (const [key, field] of Object.entries(child)) {
        childValues[key] = extractValue(field)
      }
      return childValues
    })
  }

  // Extract project fields
  if (parsedData.project) {
    values.project = {}
    for (const [key, field] of Object.entries(parsedData.project)) {
      values.project[key] = extractValue(field)
    }
  }

  return values
}

/** Normalize common values and seed carrier-specific branches */
function normalizeAndSeedCarriers(values: Record<string, any>) {
  // Civility
  const civ = normalizeCivility(values.subscriber?.civility)
  if (civ) {
    values.subscriber = values.subscriber || {}
    values.subscriber.civility = civ
  }

  // Phone / postal code cleanup
  if (values.subscriber) {
    const phone = cleanPhone(values.subscriber.telephone)
    if (phone) values.subscriber.telephone = phone
    const cp = cleanPostalCode(values.subscriber.postalCode)
    if (cp) values.subscriber.postalCode = cp
  }

  if (values.spouse) {
    const cp = cleanPostalCode(values.spouse.postalCode)
    if (cp) values.spouse.postalCode = cp
  }

  // Regime normalization → seed carriers
  const commonRegime = normalizeRegimeCommon(values.subscriber?.regime)
  const carriers: Array<'alptis'|'swisslifeone'> = ['alptis','swisslifeone']
  if (commonRegime) {
    for (const c of carriers) {
      const mapped = mapRegimeForCarrier(commonRegime, c)
      if (mapped) {
        values[c] = values[c] || {}
        values[c].subscriber = values[c].subscriber || {}
        if (!values[c].subscriber.regime) values[c].subscriber.regime = mapped
      }
    }
  }

  // Spouse regime
  const spouseCommonRegime = normalizeRegimeCommon(values.spouse?.regime)
  if (spouseCommonRegime) {
    for (const c of carriers) {
      const mapped = mapRegimeForCarrier(spouseCommonRegime, c)
      if (mapped) {
        values[c] = values[c] || {}
        values[c].spouse = values[c].spouse || {}
        if (!values[c].spouse.regime) values[c].spouse.regime = mapped
      }
    }
  }

  // Seed common contact/location to carrier slices when missing
  // Needed so platform-specific required fields (e.g., alptis.postalCode, swisslifeone.department derivation) can be satisfied
  const copyIf = (carrier: 'alptis'|'swisslifeone', fromPath: string, toPath: string) => {
    // Simple getter
    const get = (obj: any, path: string) => path.split('.').reduce((o,p)=>o?.[p], obj)
    const set = (obj: any, path: string, v: any) => {
      const parts = path.split('.')
      let cur = obj
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i]
        if (!cur[p]) cur[p] = {}
        cur = cur[p]
      }
      cur[parts[parts.length-1]] = v
    }

    const src = get(values, fromPath)
    const dst = get(values, `${carrier}.${toPath}`)
    if (src !== undefined && src !== null && dst === undefined) {
      values[carrier] = values[carrier] || {}
      set(values[carrier], toPath, src)
    }
  }

  for (const c of carriers) {
    copyIf(c, 'subscriber.postalCode', 'subscriber.postalCode')
    copyIf(c, 'subscriber.city', 'subscriber.city')
    copyIf(c, 'subscriber.birthDate', 'subscriber.birthDate')
  }

  // Subscriber status (Swisslife) can be inferred from regime via computedValues, so no hard mapping here
}

/**
 * Convert plain values object back to ParsedLeadData structure
 * Only wraps newly-added default/computed values, preserves existing ParsedFields
 */
function valuesToParsedData(
  values: Record<string, any>,
  originalParsed: ParsedLeadData,
  defaultedFields: string[],
  computedFields: string[]
): ParsedLeadData {
  const result: ParsedLeadData = {
    subscriber: {},
    spouse: {},
    children: [],
    project: {},
    // Preserve metadata from original parsed data
    metadata: {
      ...originalParsed.metadata,
      // Update defaults count
      defaultedFieldsCount: (originalParsed.metadata.defaultedFieldsCount || 0) + defaultedFields.length,
      // Add warnings for computed fields
      warnings: [
        ...originalParsed.metadata.warnings,
        ...(computedFields.length > 0 ? [`${computedFields.length} computed fields added`] : [])
      ]
    }
  }

  // Helper to create ParsedField for defaults or computed values
  const createField = (value: any, fieldPath: string): ParsedField => {
    if (defaultedFields.includes(fieldPath)) {
      return {
        value,
        source: 'default',
        confidence: 'high',
      }
    } else if (computedFields.includes(fieldPath)) {
      return {
        value,
        source: 'inferred',
        confidence: 'high',
      }
    } else {
      // Preserve original parsed field if it exists
      const parts = fieldPath.split('.')
      let current: any = originalParsed
      for (const part of parts) {
        if (current === undefined) break
        current = current[part]
      }
      if (current && typeof current === 'object' && 'value' in current) {
        return current as ParsedField
      }
      // Fallback: create new parsed field
      return {
        value,
        source: 'parsed',
        confidence: 'medium',
      }
    }
  }

  // Reconstruct subscriber
  if (values.subscriber) {
    result.subscriber = {}
    for (const [key, value] of Object.entries(values.subscriber)) {
      ;(result.subscriber as any)[key] = createField(value, `subscriber.${key}`)
    }
  }

  // Reconstruct spouse
  if (values.spouse) {
    result.spouse = {}
    for (const [key, value] of Object.entries(values.spouse)) {
      ;(result.spouse as any)[key] = createField(value, `spouse.${key}`)
    }
  }

  // Reconstruct children
  if (values.children && Array.isArray(values.children)) {
    result.children = values.children.map((child, index) => {
      const childResult: Record<string, ParsedField> = {}
      for (const [key, value] of Object.entries(child)) {
        childResult[key] = createField(value, `children[${index}].${key}`)
      }
      return childResult
    })
  }

  // Reconstruct project
  if (values.project) {
    result.project = {}
    for (const [key, value] of Object.entries(values.project)) {
      ;(result.project as any)[key] = createField(value, `project.${key}`)
    }
  }

  // Carry carrier-specific nested slices, wrapping leaves into ParsedField with proper source
  const carriers: Array<'alptis'|'swisslifeone'> = ['alptis','swisslifeone']
  const wrapCarrier = (carrier: string) => {
    const slice = (values as any)[carrier]
    if (!slice || typeof slice !== 'object') return
    const build: any = {}

    const setNested = (obj: any, path: string, value: any) => {
      const parts = path.split('.')
      let cur = obj
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        const m = part.match(/^(.+)\[(\d+)\]$/)
        if (m) {
          const name = m[1]
          const idx = parseInt(m[2], 10)
          if (!cur[name]) cur[name] = []
          if (!cur[name][idx]) cur[name][idx] = {}
          cur = cur[name][idx]
        } else {
          if (!cur[part]) cur[part] = {}
          cur = cur[part]
        }
      }
      const last = parts[parts.length - 1]
      cur[last] = value
    }

    const walk = (node: any, path: string) => {
      if (node === null || node === undefined) return
      if (Array.isArray(node)) {
        node.forEach((item, idx) => walk(item, `${path}[${idx}]`))
        return
      }
      if (typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) {
          const next = path ? `${path}.${k}` : k
          walk(v, next)
        }
        return
      }
      // Leaf value
      const fieldPath = `${carrier}.${path}`
      const pf = createField(node, fieldPath)
      setNested(build, path, pf)
    }

    walk(slice, '')
    ;(result as any)[carrier] = build
  }
  carriers.forEach(wrapCarrier)

  return result
}

/**
 * Enrich parsed lead data with defaults and computed values
 *
 * This is the main entry point for data enrichment during email parsing.
 * It applies defaults from base.domain.json and computes derived fields.
 *
 * @param parsedData - Parsed lead data from email
 * @param platform - Optional platform for carrier-specific defaults
 * @returns Enriched parsed data with metadata
 */
export function enrich(
  parsedData: ParsedLeadData,
  platform?: string
): {
  enrichedData: ParsedLeadData
  defaultedFields: string[]
  computedFields: string[]
} {
  // Load domain schema
  const schema = loadDomainSchema()

  // Convert ParsedLeadData to plain values
  const currentValues = parsedDataToValues(parsedData)

  // Apply defaults from schema
  const defaultedFields = applyDefaults(currentValues, schema, {
    platform,
    overwrite: false, // Never overwrite parsed values
  })

  // Normalize values and seed carrier branches before carrier defaults
  normalizeAndSeedCarriers(currentValues)

  // Apply carrier-specific defaults for both carriers under prefixed namespaces
  const carriers: Array<'alptis'|'swisslifeone'> = ['alptis','swisslifeone']
  const setNestedValue = (obj: any, path: string, value: any) => {
    const parts = path.split('.')
    let cur = obj
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      const m = part.match(/^(.+)\[(\d+)\]$/)
      if (m) {
        const name = m[1]
        const idx = parseInt(m[2], 10)
        if (!cur[name]) cur[name] = []
        if (!cur[name][idx]) cur[name][idx] = {}
        cur = cur[name][idx]
      } else {
        if (!cur[part]) cur[part] = {}
        cur = cur[part]
      }
    }
    const last = parts[parts.length - 1]
    cur[last] = value
  }
  const getNestedValue = (obj: any, path: string) => {
    const parts = path.split('.')
    let cur = obj
    for (const part of parts) {
      const m = part.match(/^(.+)\[(\d+)\]$/)
      if (m) {
        const name = m[1]
        const idx = parseInt(m[2], 10)
        cur = cur?.[name]?.[idx]
      } else {
        cur = cur?.[part]
      }
      if (cur === undefined) return undefined
    }
    return cur
  }
  const isEmpty = (v: any) => v === undefined || v === null || v === ''

  const extraDefaulted: string[] = []
  for (const carrier of carriers) {
    const defaults = getAllDefaults(schema, carrier)
    for (const [k, v] of Object.entries(defaults)) {
      const prefixedPath = `${carrier}.${k}`
      if (isEmpty(getNestedValue(currentValues, prefixedPath))) {
        setNestedValue(currentValues, prefixedPath, v)
        extraDefaulted.push(prefixedPath)
      }
    }
  }

  // Compute derived fields (business rules)
  const computedValues = computeDerivedFields(currentValues, {
    overwriteExisting: false, // Never overwrite existing values
  })

  // Apply computed values to current values
  const computedFieldsList: string[] = []
  for (const [fieldPath, value] of Object.entries(computedValues)) {
    // Use nested setter
    const parts = fieldPath.split('.')
    let current = currentValues
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      // Handle array notation
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/)
      if (arrayMatch) {
        const arrayName = arrayMatch[1]
        const index = parseInt(arrayMatch[2], 10)
        if (!current[arrayName]) current[arrayName] = []
        if (!current[arrayName][index]) current[arrayName][index] = {}
        current = current[arrayName][index]
      } else {
        if (!current[part]) current[part] = {}
        current = current[part]
      }
    }
    const lastPart = parts[parts.length - 1]
    current[lastPart] = value
    computedFieldsList.push(fieldPath)
  }

  // Convert back to ParsedLeadData
  const enrichedData = valuesToParsedData(
    currentValues,
    parsedData,
    [...defaultedFields, ...extraDefaulted],
    computedFieldsList
  )

  return {
    enrichedData,
    defaultedFields: [...defaultedFields, ...extraDefaulted],
    computedFields: computedFieldsList,
  }
}

/**
 * Get all available defaults for preview (without applying)
 *
 * @param platform - Optional platform for carrier-specific defaults
 * @returns Object with all default values
 */
export function getAvailableDefaults(platform?: string): Record<string, any> {
  const schema = loadDomainSchema()
  return getAllDefaults(schema, platform)
}

// Export for backward compatibility (used by other modules)
export const DataEnricher = {
  enrich,
  getAvailableDefaults,
}
