/**
 * Schema loader for base.domain.json
 *
 * Provides utilities to load and access the domain schema
 * from base.domain.json across frontend and backend.
 */

import type { DomainSchema } from './simpleDefaults'
import * as fs from 'fs'
import * as path from 'path'

// Cache for loaded schema
let cachedSchema: DomainSchema | null = null

/**
 * Load domain schema from base.domain.json
 *
 * @returns Domain schema
 */
export function loadDomainSchema(): DomainSchema {
  if (cachedSchema) {
    return cachedSchema
  }

  // Determine schema path based on environment
  if (typeof window !== 'undefined') {
    // Browser environment - schema should be bundled or fetched
    throw new Error('loadDomainSchema() should not be called directly in browser. Use loadDomainSchemaFromData() with preloaded data.')
  }

  // Try multiple candidates to be robust in dev and packaged app
  const candidates = [
    // Relative to compiled file (main process dist)
    path.join(__dirname, '../../../data/domain/base.domain.json'),
    // Project root (dev)
    path.join(process.cwd(), 'data', 'domain', 'base.domain.json'),
    // Packaged resources path if available
    (typeof (process as any).resourcesPath === 'string'
      ? path.join((process as any).resourcesPath, 'data', 'domain', 'base.domain.json')
      : '')
  ].filter(Boolean) as string[]

  const schemaPath = candidates.find(p => {
    try { return !!p && fs.existsSync(p) } catch { return false }
  })
  if (!schemaPath) {
    throw new Error('Failed to locate base.domain.json in known locations')
  }

  try {
    const fileContent = fs.readFileSync(schemaPath, 'utf-8')
    const parsed = JSON.parse(fileContent)
    cachedSchema = parsed as DomainSchema
    return cachedSchema
  } catch (error) {
    throw new Error(`Failed to load domain schema from ${schemaPath}: ${error}`)
  }
}

/**
 * Load domain schema from already-loaded data (for frontend)
 *
 * @param schemaData - Pre-loaded schema data
 */
export function loadDomainSchemaFromData(schemaData: DomainSchema): void {
  cachedSchema = schemaData
}

/**
 * Get cached schema (returns null if not loaded)
 */
export function getCachedSchema(): DomainSchema | null {
  return cachedSchema
}

/**
 * Clear schema cache (useful for testing)
 */
export function clearSchemaCache(): void {
  cachedSchema = null
}
