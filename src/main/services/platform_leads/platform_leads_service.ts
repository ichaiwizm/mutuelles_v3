/**
 * Platform Leads Service - Main orchestrator
 * Public API for generating platform-specific lead data and managing assignments
 */

import { getDb } from '../../db/connection'
import { LeadsService } from '../leads'
import type {
  GeneratePlatformLeadOptions,
  GeneratePlatformLeadResult,
  PlatformLeadData,
  PlatformFieldDefinitions,
  PlatformValueMappings,
  AutoAssignFlowsOptions,
  AutoAssignFlowsResult,
  FlowAssignment
} from '../../../shared/types/platform_leads'

import { PlatformLeadGenerator } from './platform_lead_generator'
import { PlatformLeadValidator } from './platform_lead_validator'
import { AssignmentsRepository } from './assignments_repository'
import { FlowSelector } from './flow_selector'

export class PlatformLeadsService {
  private generator: PlatformLeadGenerator
  private validator: PlatformLeadValidator
  private repository: AssignmentsRepository
  private selector: FlowSelector
  private leadsService: LeadsService

  constructor() {
    this.generator = new PlatformLeadGenerator()
    this.validator = new PlatformLeadValidator()
    this.repository = new AssignmentsRepository()
    this.selector = new FlowSelector()
    this.leadsService = new LeadsService()
  }

  /**
   * Génère les données plateforme UNIQUEMENT depuis le formulaire manuel.
   * Aucun fallback ni génération automatique n'est autorisé.
   * Échec si des champs requis (y compris spécifiques plateforme) manquent.
   */
  async generatePlatformLead(options: GeneratePlatformLeadOptions): Promise<GeneratePlatformLeadResult> {
    try {
      // 1) Lead + plateforme
      const lead = await this.leadsService.getCleanLead(options.cleanLeadId)
      if (!lead) return { success: false, error: 'Lead not found' }

      const platform = this.getPlatformInfo(options.platformId)
      if (!platform) return { success: false, error: 'Platform not found' }

      // 2) Charger field-definitions pour connaître les champs requis / mapping key ↔ domainKey
      const fieldDefinitions = this.loadFieldDefinitions(platform.fieldDefinitionsJson)

      // 3) Récupérer les données manuelles depuis le lead
      //    - Supporter 2 formats existants:
      //      a) lead.data.platformData[slug] : objet par plateforme
      //      b) lead.data.platformData : map { domainKey -> value } (legacy UI)
      const pd: any = (lead as any).data?.platformData || (lead as any).platformData || {}
      const manualBySlug = pd?.[platform.slug]
      const manualFlat: Record<string, any> | null = manualBySlug ? null : (typeof pd === 'object' ? pd : null)

      // Helper pour lire une valeur manuelle par domainKey (gère enfants[])
      const readManual = (domainKey: string): any => {
        if (manualBySlug && typeof manualBySlug === 'object') {
          return manualBySlug[domainKey]
        }
        if (!manualFlat) return undefined
        if (!domainKey.includes('[]')) return manualFlat[domainKey]
        // Pattern répétable: children[].x → à traiter hors de cette fonction
        return undefined
      }

      // 4) Valider présence des champs requis contre les données manuelles
      const missing: string[] = []
      const valuesForOutput: Array<{ key: string; value: any }> = []

      // Compter les enfants si présent (pour développer children[].*)
      const childrenCount = Number(readManual('children.count') ?? 0)

      for (const f of fieldDefinitions.fields || []) {
        const isRepeat = !!f.domainKey && f.domainKey.includes('children[].')
        if (!f.domainKey) continue

        if (isRepeat) {
          // Ex: children[].birthDate → children[0].birthDate ... children[n-1].birthDate
          const base = f.domainKey.replace('[]', '') // children.birthDate
          for (let i = 0; i < childrenCount; i++) {
            const dk = f.domainKey.replace('[]', `[${i}]`)
            const v = manualBySlug ? manualBySlug[dk] : manualFlat?.[dk]
            if (f.required && (v === undefined || v === null || v === '')) {
              missing.push(dk)
            } else if (v !== undefined) {
              const outKey = f.key?.replace('{i}', String(i)) || f.key
              valuesForOutput.push({ key: outKey, value: v })
            }
          }
          continue
        }

        const v = readManual(f.domainKey)
        if (f.required && (v === undefined || v === null || v === '')) {
          missing.push(f.domainKey)
        } else if (v !== undefined) {
          valuesForOutput.push({ key: f.key, value: v })
        }
      }

      if (missing.length > 0) {
        return {
          success: false,
          error: 'Missing required platform fields',
          validationResult: {
            isValid: false,
            errors: missing.map(m => ({ field: m, domainKey: m, message: 'Champ requis manquant', severity: 'error' } as any)),
            warnings: [],
            missingFields: missing,
            incompatibleFields: []
          } as any
        }
      }

      // 5) Construire le payload plateforme à partir EXCLUSIVEMENT des données manuelles
      const out: Record<string, any> = {}
      for (const { key, value } of valuesForOutput) {
        // Pas d’ajout de valeurs par défaut, pas de champs calculés: on pose tel quel.
        // On formate juste en string pour compat navigateur lorsque valeur non‑string.
        const finalValue = typeof value === 'string' ? value : (value === null || value === undefined ? value : String(value))
        this.setNestedValue(out, key, finalValue)
      }

      const platformLeadData: PlatformLeadData = {
        platformId: options.platformId,
        platformSlug: platform.slug,
        cleanLeadId: options.cleanLeadId,
        cleanLeadVersion: (lead as any).version || 1,
        data: out,
        generatedAt: new Date().toISOString(),
        isValid: true,
        validationErrors: []
      }

      return { success: true, data: platformLeadData }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /** Dépose une valeur dans un objet via une clé en notation pointée */
  private setNestedValue(obj: Record<string, any>, path: string | undefined, value: any) {
    if (!path) return
    const keys = String(path).split('.')
    let cur = obj
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]
      if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {}
      cur = cur[k]
    }
    cur[keys[keys.length - 1]] = value
  }

  /**
   * Auto-assign flows for a lead
   */
  async autoAssignFlows(options: AutoAssignFlowsOptions): Promise<AutoAssignFlowsResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const assignmentsCreated: FlowAssignment[] = []

    try {
      // Get lead
      const lead = await this.leadsService.getCleanLead(options.cleanLeadId)
      if (!lead) {
        return {
          success: false,
          assignmentsCreated: [],
          errors: ['Lead not found'],
          warnings: []
        }
      }

      // Select flows for each platform
      const selections = await this.selector.selectFlowsForLead(lead, options.platformIds)

      if (selections.length === 0) {
        warnings.push('No flows selected for this lead')
      }

      // Create assignments
      for (const { platformId, flowId } of selections) {
        // Check if assignment already exists
        const exists = await this.repository.exists(options.cleanLeadId, flowId, platformId)
        if (exists) {
          warnings.push(`Assignment already exists for platform ${platformId}`)
          continue
        }

        // Generate platform lead data if requested
        let platformLeadData: Record<string, any> | undefined
        if (options.generateLeadData !== false) {
          const result = await this.generatePlatformLead({
            cleanLeadId: options.cleanLeadId,
            platformId,
            validate: true,
            throwOnError: false
          })

          if (result.success && result.data) {
            platformLeadData = result.data.data
          } else {
            errors.push(`Failed to generate data for platform ${platformId}: ${result.error}`)
            continue
          }
        }

        // Create assignment
        try {
          const assignment = await this.repository.create({
            cleanLeadId: options.cleanLeadId,
            flowId,
            platformId,
            platformLeadData,
            cleanLeadVersion: lead.version || 1,
            priority: options.priority ?? 0
          })
          assignmentsCreated.push(assignment)
        } catch (error) {
          errors.push(`Failed to create assignment for platform ${platformId}: ${error}`)
        }
      }

      return {
        success: errors.length === 0,
        assignmentsCreated,
        errors,
        warnings
      }
    } catch (error) {
      return {
        success: false,
        assignmentsCreated: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings
      }
    }
  }

  /**
   * Get assignments for a lead
   */
  async getAssignmentsForLead(cleanLeadId: string): Promise<FlowAssignment[]> {
    return this.repository.findByLeadId(cleanLeadId)
  }

  /**
   * Update assignment status
   */
  async updateAssignmentStatus(
    assignmentId: string,
    status: 'running' | 'completed' | 'failed',
    errorMessage?: string
  ): Promise<boolean> {
    const updates: any = { status }

    if (status === 'running') {
      updates.startedAt = new Date().toISOString()
    } else if (status === 'completed' || status === 'failed') {
      updates.completedAt = new Date().toISOString()
      if (errorMessage) {
        updates.errorMessage = errorMessage
      }
    }

    return this.repository.update(assignmentId, updates)
  }

  // =================== PRIVATE HELPERS ===================

  private getPlatformInfo(platformId: number): any {
    const row = getDb().prepare(`
      SELECT id, slug, name, field_definitions_json, value_mappings_json
      FROM platforms_catalog
      WHERE id = ?
    `).get(platformId) as any

    if (!row) return null

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      fieldDefinitionsJson: row.field_definitions_json,
      valueMappingsJson: row.value_mappings_json
    }
  }

  private loadFieldDefinitions(json: string | null): PlatformFieldDefinitions {
    if (!json) {
      throw new Error('Field definitions not found for platform')
    }
    return JSON.parse(json)
  }

  private loadValueMappings(json: string | null): PlatformValueMappings | undefined {
    if (!json) return undefined
    return JSON.parse(json)
  }
}
