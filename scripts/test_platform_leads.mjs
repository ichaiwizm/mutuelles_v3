#!/usr/bin/env node
/**
 * Test script for platform leads generation
 * Standalone implementation that mirrors the TypeScript services
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { openDbRW } from './flows/lib/flows_io.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

// ============= UTILITIES (mirrored from utils.ts) =============

function getValue(obj, path) {
  if (!obj || !path) return undefined
  const keys = path.split('.')
  let current = obj

  for (const key of keys) {
    const arrayMatch = key.match(/^(.+)\[(\d+)\]$/)
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch
      current = current?.[arrayKey]?.[parseInt(index, 10)]
    } else {
      current = current?.[key]
    }
    if (current === undefined || current === null) return undefined
  }
  return current
}

function formatDate(date, targetFormat) {
  if (!date) return undefined

  const frMatch = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (frMatch && targetFormat === 'ISO') {
    const [, day, month, year] = frMatch
    return `${year}-${month}-${day}`
  }

  const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch && targetFormat === 'FR') {
    const [, year, month, day] = isoMatch
    return `${day}/${month}/${year}`
  }

  return date
}

function calculateAge(birthDate) {
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

function mapValue(value, mappings) {
  if (!mappings || value === undefined || value === null) return value
  return mappings[String(value)] ?? value
}

function getLeadValue(lead, domainKey) {
  // Direct mapping from domainKey to lead structure
  const paths = {
    'auth.username': 'credentials.username',
    'auth.password': 'credentials.password',
    'project.dateEffet': 'project.effectiveDate',
    'subscriber.civility': 'subscriber.civility',
    'subscriber.firstName': 'subscriber.firstName',
    'subscriber.lastName': 'subscriber.lastName',
    'subscriber.birthDate': 'subscriber.birthDate',
    'subscriber.category': 'subscriber.category',
    'subscriber.regime': 'subscriber.regime',
    'subscriber.postalCode': 'subscriber.postalCode',
    'subscriber.workFramework': 'subscriber.workFramework',
    'spouse.present': 'spouse.present',
    'spouse.birthDate': 'spouse.birthDate',
    'spouse.category': 'spouse.category',
    'spouse.regime': 'spouse.regime',
    'spouse.workFramework': 'spouse.workFramework',
    'children.present': 'children.length',
    'email': 'email',
    'phone': 'phone'
  }

  // Handle children array notation
  if (domainKey.startsWith('children[')) {
    const match = domainKey.match(/^children\[(\d+)\]\.(.+)$/)
    if (match) {
      const [, index, field] = match
      const child = lead.children?.[parseInt(index)]
      if (!child) return undefined
      return child[field === 'birthDate' ? 'birthDate' : field]
    }
  }

  const path = paths[domainKey] || domainKey
  const value = getValue(lead, path)

  // Special case for children.present
  if (domainKey === 'children.present') {
    return value > 0
  }

  return value
}

// ============= VALIDATOR (mirrored from platform_lead_validator.ts) =============

function validateField(lead, fieldDef) {
  const value = getLeadValue(lead, fieldDef.domainKey)
  const error = {}
  const warning = {}

  // Check required fields
  if (fieldDef.required && (value === undefined || value === null || value === '')) {
    error.field = fieldDef.domainKey
    error.message = `Required field missing: ${fieldDef.label || fieldDef.key}`
    error.severity = 'error'
    return { error }
  }

  // Validate formats
  if (value !== undefined && value !== null && value !== '') {
    // Date format validation
    if (fieldDef.type === 'date' || fieldDef.domainKey?.includes('Date')) {
      const frMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
      const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (!frMatch && !isoMatch) {
        error.field = fieldDef.domainKey
        error.message = `Invalid date format: ${value}`
        error.severity = 'error'
        return { error }
      }
    }

    // Email validation
    if (fieldDef.type === 'email' || fieldDef.domainKey === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        warning.field = fieldDef.domainKey
        warning.message = `Invalid email format: ${value}`
        warning.severity = 'warning'
        return { warning }
      }
    }

    // Postal code validation
    if (fieldDef.domainKey?.includes('postalCode') || fieldDef.domainKey?.includes('code_postal')) {
      if (!/^\d{5}$/.test(String(value))) {
        warning.field = fieldDef.domainKey
        warning.message = `Invalid postal code: ${value}`
        warning.severity = 'warning'
        return { warning }
      }
    }
  }

  return {}
}

function validate(lead, fieldDefinitions) {
  const errors = []
  const warnings = []

  for (const fieldDef of fieldDefinitions.fields || []) {
    if (!fieldDef.domainKey) continue

    const result = validateField(lead, fieldDef)
    if (result.error) errors.push(result.error)
    if (result.warning) warnings.push(result.warning)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// ============= GENERATOR (mirrored from platform_lead_generator.ts) =============

function generateFieldValue(lead, fieldDef, valueMappings) {
  const domainValue = getLeadValue(lead, fieldDef.domainKey)

  if (domainValue === undefined || domainValue === null) {
    return fieldDef.defaultValue !== undefined ? fieldDef.defaultValue : null
  }

  // Apply value mappings if present
  let value = domainValue
  if (valueMappings && fieldDef.domainKey && valueMappings[fieldDef.domainKey]) {
    value = mapValue(domainValue, valueMappings[fieldDef.domainKey])
  }

  // Format dates to ISO
  if (fieldDef.type === 'date' || fieldDef.domainKey?.includes('Date')) {
    value = formatDate(value, 'ISO')
  }

  // Convert booleans for toggles
  if (fieldDef.type === 'toggle') {
    return Boolean(value)
  }

  return value
}

function generate(lead, fieldDefinitions, valueMappings) {
  const data = {}

  for (const fieldDef of fieldDefinitions.fields || []) {
    if (!fieldDef.domainKey) continue

    // Skip dynamic fields (they'll be handled separately)
    if (fieldDef.key?.includes('{i}')) continue

    const value = generateFieldValue(lead, fieldDef, valueMappings)
    data[fieldDef.key] = value
  }

  // Handle dynamic children fields
  const childrenCount = lead.children?.length || 0
  for (let i = 0; i < childrenCount; i++) {
    for (const fieldDef of fieldDefinitions.fields || []) {
      if (!fieldDef.domainKey?.startsWith('children[]')) continue

      const key = fieldDef.key.replace('{i}', String(i))
      const domainKey = fieldDef.domainKey.replace('[]', `[${i}]`)

      const childFieldDef = { ...fieldDef, domainKey }
      const value = generateFieldValue(lead, childFieldDef, valueMappings)
      data[key] = value
    }
  }

  return data
}

// ============= LEAD TRANSFORMATION =============

function transformToCleanLead(legacyLead) {
  return {
    id: legacyLead.name || 'test-lead',
    source: legacyLead.source || 'test',
    rawData: legacyLead,

    email: legacyLead.contact?.email || null,
    phone: legacyLead.contact?.telephone || null,

    subscriber: {
      civility: legacyLead.adherent?.civilite || legacyLead.contact?.civilite || null,
      firstName: legacyLead.adherent?.prenom || legacyLead.contact?.prenom || null,
      lastName: legacyLead.adherent?.nom || legacyLead.contact?.nom || null,
      birthDate: legacyLead.adherent?.date_naissance || null,
      category: legacyLead.adherent?.categorie || null,
      regime: legacyLead.adherent?.regime || null,
      postalCode: legacyLead.adherent?.code_postal || legacyLead.contact?.code_postal || null,
      workFramework: legacyLead.adherent?.statut || null
    },

    spouse: legacyLead.conjoint?.present ? {
      present: true,
      birthDate: legacyLead.conjoint.date_naissance || null,
      category: legacyLead.conjoint.categorie || null,
      regime: legacyLead.conjoint.regime || null,
      workFramework: legacyLead.conjoint.statut || null
    } : { present: false },

    children: (legacyLead.enfants || []).map(child => ({
      birthDate: child.date_naissance || null,
      regime: child.regime || null
    })),

    project: {
      effectiveDate: legacyLead.projet?.date_effet || null
    },

    version: 1,
    createdAt: new Date().toISOString()
  }
}

// ============= TEST EXECUTION =============

function loadTestLeads() {
  const leadsDir = path.join(rootDir, 'admin/leads')
  const files = fs.readdirSync(leadsDir).filter(f => f.endsWith('.json'))

  return files.map(file => {
    const content = fs.readFileSync(path.join(leadsDir, file), 'utf8')
    const data = JSON.parse(content)
    return {
      filename: file,
      slug: file.replace('.json', ''),
      data
    }
  })
}

function getPlatforms(db) {
  const rows = db.prepare(`
    SELECT id, slug, name, field_definitions_json, value_mappings_json
    FROM platforms_catalog
    WHERE selected = 1 AND field_definitions_json IS NOT NULL
  `).all()

  return rows.map(row => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    fieldDefinitions: JSON.parse(row.field_definitions_json),
    valueMappings: row.value_mappings_json ? JSON.parse(row.value_mappings_json) : undefined
  }))
}

function testGeneration(lead, platform) {
  const cleanLead = transformToCleanLead(lead.data)

  const validationResult = validate(cleanLead, platform.fieldDefinitions)
  const platformData = generate(cleanLead, platform.fieldDefinitions, platform.valueMappings)

  return {
    leadSlug: lead.slug,
    platformSlug: platform.slug,
    validation: validationResult,
    data: platformData,
    metadata: {
      subscriberAge: calculateAge(cleanLead.subscriber.birthDate),
      spouseAge: cleanLead.spouse?.birthDate ? calculateAge(cleanLead.spouse.birthDate) : null,
      childrenCount: cleanLead.children.length
    }
  }
}

async function main() {
  console.log('🧪 Platform Leads Generation Test\n')

  const leads = loadTestLeads()
  console.log(`📋 Loaded ${leads.length} test leads:`)
  leads.forEach(l => console.log(`   - ${l.filename}`))
  console.log()

  const db = openDbRW()
  try {
    const platforms = getPlatforms(db)
    console.log(`🏢 Found ${platforms.length} platforms with field definitions:`)
    platforms.forEach(p => console.log(`   - ${p.slug} (${p.name})`))
    console.log()

    if (platforms.length === 0) {
      console.error('❌ No platforms with field_definitions_json found!')
      console.error('   Run: npm run platforms:fields:import admin/field-definitions/alptis.json')
      console.error('        npm run platforms:fields:import admin/field-definitions/swisslifeone.json')
      process.exit(1)
    }

    const results = []
    let totalTests = 0
    let passed = 0
    let failed = 0

    console.log('🚀 Starting tests...\n')

    for (const lead of leads) {
      for (const platform of platforms) {
        totalTests++
        try {
          const result = testGeneration(lead, platform)
          results.push(result)

          const status = result.validation.isValid ? '✅' : '⚠️ '
          console.log(`${status} ${lead.slug} × ${platform.slug}`)

          if (result.validation.errors.length > 0) {
            failed++
            console.log(`   ❌ Errors: ${result.validation.errors.length}`)
            result.validation.errors.forEach(e => {
              console.log(`      - ${e.field}: ${e.message}`)
            })
          } else {
            passed++
          }

          if (result.validation.warnings.length > 0) {
            console.log(`   ⚠️  Warnings: ${result.validation.warnings.length}`)
            result.validation.warnings.forEach(w => {
              console.log(`      - ${w.field}: ${w.message}`)
            })
          }

          // Show key generated fields
          const keyFields = ['date_effet', 'nom_adherent', 'prenom_adherent', 'date_naissance_adherent']
          const generated = keyFields
            .filter(k => result.data[k])
            .map(k => `${k}=${result.data[k]}`)
            .slice(0, 2)
          if (generated.length > 0) {
            console.log(`   📝 ${generated.join(', ')}`)
          }

        } catch (error) {
          failed++
          console.log(`❌ ${lead.slug} × ${platform.slug}: ${error.message}`)
          console.error(error.stack)
        }
      }
    }

    console.log()
    console.log('='.repeat(60))
    console.log(`📊 Results: ${passed}/${totalTests} passed, ${failed}/${totalTests} with errors`)
    console.log('='.repeat(60))

    // Save outputs
    const outputDir = path.join(rootDir, 'test-output')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    for (const result of results) {
      const filename = `${result.leadSlug}_${result.platformSlug}.json`
      const filepath = path.join(outputDir, filename)
      fs.writeFileSync(filepath, JSON.stringify(result, null, 2))
    }

    console.log(`\n💾 Saved ${results.length} outputs to test-output/`)

    const summaryPath = path.join(outputDir, 'summary.json')
    fs.writeFileSync(summaryPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalTests,
      passed,
      failed,
      leads: leads.map(l => l.slug),
      platforms: platforms.map(p => p.slug),
      results: results.map(r => ({
        lead: r.leadSlug,
        platform: r.platformSlug,
        isValid: r.validation.isValid,
        errorsCount: r.validation.errors.length,
        warningsCount: r.validation.warnings.length,
        metadata: r.metadata
      }))
    }, null, 2))

    console.log(`📄 Summary saved to test-output/summary.json\n`)

  } finally {
    try { db.close() } catch {}
  }
}

main().catch(err => {
  console.error('💥 Fatal error:', err)
  console.error(err.stack)
  process.exit(1)
})
