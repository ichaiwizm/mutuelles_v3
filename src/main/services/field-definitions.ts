import { getDb } from '../db/connection'

export interface FieldDefinition {
  id: number
  platformSlug: string
  fieldKey: string
  fieldType: string
  label?: string
  selector: string
  options?: FieldOption[]
  metadata?: Record<string, any>
  createdAt: string
}

export interface FieldOption {
  value: string
  label: string
  selector?: string
  isDefault?: boolean
  orderIndex?: number
}

export interface FieldDependency {
  id: number
  platformSlug: string
  triggerField: string
  triggerValue?: string
  dependentField: string
  action: 'show' | 'hide' | 'enable' | 'disable'
  metadata?: Record<string, any>
  createdAt: string
}

/**
 * Récupère toutes les définitions de champs pour une plateforme
 */
export function getFieldDefinitions(platformSlug: string): FieldDefinition[] {
  const rows = getDb().prepare(`
    SELECT
      id,
      platform_slug as platformSlug,
      field_key as fieldKey,
      field_type as fieldType,
      label,
      selector,
      options,
      metadata,
      created_at as createdAt
    FROM field_definitions
    WHERE platform_slug = ?
    ORDER BY field_key
  `).all(platformSlug) as any[]

  return rows.map(row => ({
    ...row,
    options: row.options ? JSON.parse(row.options) : undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined
  }))
}

/**
 * Récupère une définition de champ spécifique
 */
export function getFieldDefinition(platformSlug: string, fieldKey: string): FieldDefinition | null {
  const row = getDb().prepare(`
    SELECT
      id,
      platform_slug as platformSlug,
      field_key as fieldKey,
      field_type as fieldType,
      label,
      selector,
      options,
      metadata,
      created_at as createdAt
    FROM field_definitions
    WHERE platform_slug = ? AND field_key = ?
  `).get(platformSlug, fieldKey) as any

  if (!row) return null

  return {
    ...row,
    options: row.options ? JSON.parse(row.options) : undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined
  }
}

/**
 * Récupère toutes les dépendances de champs pour une plateforme
 */
export function getFieldDependencies(platformSlug: string): FieldDependency[] {
  const rows = getDb().prepare(`
    SELECT
      id,
      platform_slug as platformSlug,
      trigger_field as triggerField,
      trigger_value as triggerValue,
      dependent_field as dependentField,
      action,
      metadata,
      created_at as createdAt
    FROM field_dependencies
    WHERE platform_slug = ?
    ORDER BY trigger_field, dependent_field
  `).all(platformSlug) as any[]

  return rows.map(row => ({
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined
  }))
}

/**
 * Récupère les dépendances pour un champ déclencheur spécifique
 */
export function getFieldDependenciesForTrigger(platformSlug: string, triggerField: string): FieldDependency[] {
  const rows = getDb().prepare(`
    SELECT
      id,
      platform_slug as platformSlug,
      trigger_field as triggerField,
      trigger_value as triggerValue,
      dependent_field as dependentField,
      action,
      metadata,
      created_at as createdAt
    FROM field_dependencies
    WHERE platform_slug = ? AND trigger_field = ?
    ORDER BY dependent_field
  `).all(platformSlug, triggerField) as any[]

  return rows.map(row => ({
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined
  }))
}

/**
 * Récupère les champs qui dépendent d'un champ donné
 */
export function getDependentFields(platformSlug: string, triggerField: string, triggerValue?: string): FieldDependency[] {
  let query = `
    SELECT
      id,
      platform_slug as platformSlug,
      trigger_field as triggerField,
      trigger_value as triggerValue,
      dependent_field as dependentField,
      action,
      metadata,
      created_at as createdAt
    FROM field_dependencies
    WHERE platform_slug = ? AND trigger_field = ?
  `
  const params: any[] = [platformSlug, triggerField]

  if (triggerValue !== undefined) {
    query += ' AND (trigger_value IS NULL OR trigger_value = ?)'
    params.push(triggerValue)
  }

  query += ' ORDER BY dependent_field'

  const rows = getDb().prepare(query).all(...params) as any[]

  return rows.map(row => ({
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined
  }))
}

/**
 * Récupère la liste des plateformes ayant des définitions de champs
 */
export function getPlatformsWithFieldDefinitions(): string[] {
  const rows = getDb().prepare(`
    SELECT DISTINCT platform_slug
    FROM field_definitions
    ORDER BY platform_slug
  `).all() as { platform_slug: string }[]

  return rows.map(row => row.platform_slug)
}

/**
 * Compte le nombre de champs définis pour une plateforme
 */
export function getFieldDefinitionsCount(platformSlug: string): number {
  const result = getDb().prepare(`
    SELECT COUNT(*) as count
    FROM field_definitions
    WHERE platform_slug = ?
  `).get(platformSlug) as { count: number }

  return result.count
}

/**
 * Compte le nombre de dépendances pour une plateforme
 */
export function getFieldDependenciesCount(platformSlug: string): number {
  const result = getDb().prepare(`
    SELECT COUNT(*) as count
    FROM field_dependencies
    WHERE platform_slug = ?
  `).get(platformSlug) as { count: number }

  return result.count
}