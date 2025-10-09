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
   * Generate platform-specific lead data
   * PRIORITÉ 1 : Utiliser les données platform-specific que l'utilisateur a remplies manuellement
   * PRIORITÉ 2 : Générer automatiquement si pas de données manuelles
   */
  async generatePlatformLead(options: GeneratePlatformLeadOptions): Promise<GeneratePlatformLeadResult> {
    try {
      // Get lead
      const lead = await this.leadsService.getCleanLead(options.cleanLeadId)
      if (!lead) {
        return { success: false, error: 'Lead not found' }
      }

      // Get platform info
      const platform = this.getPlatformInfo(options.platformId)
      if (!platform) {
        return { success: false, error: 'Platform not found' }
      }

      // PRIORITÉ 1 : Vérifier si l'utilisateur a rempli des données platform-specific
      const manualPlatformData = lead.platformData?.[platform.slug]

      if (manualPlatformData && Object.keys(manualPlatformData).length > 0) {
        // L'utilisateur a rempli des données manuellement → LES UTILISER !
        console.log(`[PlatformLeadsService] Using manual platform data for ${platform.slug}`)

        const platformLeadData: PlatformLeadData = {
          platformId: options.platformId,
          platformSlug: platform.slug,
          cleanLeadId: options.cleanLeadId,
          cleanLeadVersion: lead.version || 1,
          data: manualPlatformData,  // ← Données de l'utilisateur
          generatedAt: new Date().toISOString(),
          isValid: true,  // Assume valide (vient de l'utilisateur)
          validationErrors: []
        }

        return { success: true, data: platformLeadData }
      }

      // PRIORITÉ 2 : Pas de données manuelles → Générer automatiquement
      console.log(`[PlatformLeadsService] Generating platform data for ${platform.slug}`)

      const fieldDefinitions = this.loadFieldDefinitions(platform.fieldDefinitionsJson)
      const valueMappings = this.loadValueMappings(platform.valueMappingsJson)

      // Validate if requested
      let validationResult
      if (options.validate !== false) {
        validationResult = this.validator.validate(lead, fieldDefinitions)
        if (!validationResult.isValid && options.throwOnError) {
          return {
            success: false,
            error: 'Validation failed',
            validationResult
          }
        }
      }

      // Generate platform data automatically
      const data = this.generator.generate(lead, fieldDefinitions, valueMappings)

      const platformLeadData: PlatformLeadData = {
        platformId: options.platformId,
        platformSlug: platform.slug,
        cleanLeadId: options.cleanLeadId,
        cleanLeadVersion: lead.version || 1,
        data,
        generatedAt: new Date().toISOString(),
        isValid: validationResult?.isValid ?? true,
        validationErrors: validationResult?.errors || []
      }

      return { success: true, data: platformLeadData, validationResult }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
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
