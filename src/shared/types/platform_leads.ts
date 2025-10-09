// Types pour le système de génération de leads spécifiques par plateforme

import type { CleanLead } from './leads'

// Statut d'un assignment flow
export type FlowAssignmentStatus = 'pending' | 'running' | 'completed' | 'failed'

// Assignment d'un flow à un lead pour une plateforme
export interface FlowAssignment {
  id: string
  cleanLeadId: string
  flowId: number
  platformId: number
  platformLeadId: string | null
  platformLeadData: Record<string, any> | null // Payload JSON complet pour automation
  cleanLeadVersion: number | null // Version du lead utilisée
  status: FlowAssignmentStatus
  priority: number
  assignedAt: string
  startedAt: string | null
  completedAt: string | null
  errorMessage: string | null
}

// Données d'un assignment avec informations jointes (platform, flow)
export interface FlowAssignmentWithDetails extends FlowAssignment {
  platformSlug: string
  platformName: string
  flowSlug: string
  flowName: string
}

// Paramètres pour créer un assignment
export interface CreateFlowAssignmentParams {
  cleanLeadId: string
  flowId: number
  platformId: number
  platformLeadData?: Record<string, any>
  cleanLeadVersion?: number
  priority?: number
}

// Paramètres pour mettre à jour un assignment
export interface UpdateFlowAssignmentParams {
  status?: FlowAssignmentStatus
  startedAt?: string
  completedAt?: string
  errorMessage?: string
  platformLeadData?: Record<string, any>
}

// Filtres pour rechercher des assignments
export interface FlowAssignmentFilters {
  cleanLeadId?: string
  platformId?: number
  flowId?: number
  status?: FlowAssignmentStatus | FlowAssignmentStatus[]
  priority?: number
}

// Données générées pour une plateforme spécifique
export interface PlatformLeadData {
  platformId: number
  platformSlug: string
  cleanLeadId: string
  cleanLeadVersion: number
  data: Record<string, any> // Payload complet mappé
  generatedAt: string
  isValid: boolean
  validationErrors: ValidationError[]
}

// Erreur de validation
export interface ValidationError {
  field: string // Chemin du champ (ex: "adherent.date_naissance")
  domainKey?: string // Clé dans le domaine (ex: "subscriber.birthDate")
  message: string // Message d'erreur
  severity: 'error' | 'warning' // Sévérité
  value?: any // Valeur qui a causé l'erreur
}

// Résultat de validation d'un lead pour une plateforme
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  missingFields: string[] // Champs requis manquants
  incompatibleFields: string[] // Champs incompatibles
}

// Options pour générer un platform lead
export interface GeneratePlatformLeadOptions {
  cleanLeadId: string
  platformId: number
  validate?: boolean // Valider les données générées (default: true)
  throwOnError?: boolean // Throw si validation échoue (default: false)
  forceRegenerate?: boolean // Forcer la regénération si existe déjà (default: false)
}

// Résultat de génération d'un platform lead
export interface GeneratePlatformLeadResult {
  success: boolean
  data?: PlatformLeadData
  error?: string
  validationResult?: ValidationResult
}

// Définition d'un champ dans field-definitions
export interface FieldDefinition {
  key: string // Clé du champ côté plateforme (ex: "date_naissance_adherent")
  domainKey: string // Clé dans le domaine (ex: "subscriber.birthDate")
  type: string // Type de champ (text, date, select, etc.)
  label?: string
  selector?: string // Sélecteur pour automation
  required?: boolean
  defaultValue?: any
  validation?: FieldValidation
  metadata?: Record<string, any>
}

// Validation d'un champ
export interface FieldValidation {
  pattern?: string // Regex pattern
  min?: number // Valeur minimum (nombre/longueur)
  max?: number // Valeur maximum (nombre/longueur)
  minLength?: number
  maxLength?: number
  enum?: any[] // Valeurs autorisées
  custom?: string // Nom d'une validation custom
}

// Définitions des champs pour une plateforme
export interface PlatformFieldDefinitions {
  platform: string // Slug de la plateforme
  fields: FieldDefinition[]
  metadata?: {
    version?: string
    lastUpdated?: string
    author?: string
  }
}

// Règle de sélection de flow
export interface FlowSelectionRule {
  id: number
  name: string
  platformId: number
  flowId: number
  conditions: FlowConditions | null // Conditions JSON pour matcher le lead
  priority: number
  active: boolean
  createdAt: string
  updatedAt: string
}

// Conditions pour sélectionner un flow
export interface FlowConditions {
  [fieldPath: string]: FieldCondition
}

// Condition sur un champ
export type FieldCondition =
  | { equals: any }
  | { oneOf: any[] }
  | { greaterThan: number }
  | { lessThan: number }
  | { contains: string }
  | { matches: string } // Regex pattern

// Options pour assigner automatiquement des flows
export interface AutoAssignFlowsOptions {
  cleanLeadId: string
  platformIds?: number[] // Limiter à certaines plateformes (default: toutes les selected)
  generateLeadData?: boolean // Générer les platform_lead_data (default: true)
  priority?: number // Priorité des assignments créés (default: 0)
}

// Résultat d'auto-assignment de flows
export interface AutoAssignFlowsResult {
  success: boolean
  assignmentsCreated: FlowAssignment[]
  errors: string[]
  warnings: string[]
}

// Statistiques sur les assignments
export interface AssignmentStats {
  total: number
  byStatus: Record<FlowAssignmentStatus, number>
  byPlatform: Record<string, number>
  pendingCount: number
  runningCount: number
  completedCount: number
  failedCount: number
  averageDuration?: number // Durée moyenne en ms
}

// Options pour lister les assignments
export interface ListAssignmentsOptions {
  filters?: FlowAssignmentFilters
  includeDetails?: boolean // Inclure platform/flow details (default: false)
  orderBy?: 'priority' | 'assigned_at' | 'status'
  order?: 'ASC' | 'DESC'
  limit?: number
  offset?: number
}

// Résultat paginé d'assignments
export interface PaginatedAssignments {
  items: FlowAssignment[] | FlowAssignmentWithDetails[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// Options pour régénérer un platform lead
export interface RegeneratePlatformLeadOptions {
  cleanLeadId: string
  platformId: number
  updateAssignments?: boolean // Mettre à jour les assignments existants (default: true)
  reason?: string // Raison de la regénération (pour logs)
}

// Résultat de regénération
export interface RegeneratePlatformLeadResult {
  success: boolean
  data?: PlatformLeadData
  assignmentsUpdated: number
  error?: string
  validationResult?: ValidationResult
}

// Informations sur une plateforme avec ses field definitions
export interface PlatformInfo {
  id: number
  slug: string
  name: string
  status: string
  selected: boolean
  fieldDefinitions: PlatformFieldDefinitions | null
  hasCredentials: boolean
}

// Mapping d'une valeur (pour value_mappings)
export interface ValueMapping {
  [domainValue: string]: string // Valeur domaine → Valeur plateforme
}

// Mappings de valeurs pour une plateforme
export interface PlatformValueMappings {
  [fieldKey: string]: ValueMapping
}

// Contexte de génération (utilisé en interne)
export interface GenerationContext {
  lead: CleanLead
  platform: PlatformInfo
  fieldDefinitions: FieldDefinition[]
  valueMappings: PlatformValueMappings
  errors: ValidationError[]
  warnings: ValidationError[]
}

// Options pour valider un lead
export interface ValidateLeadOptions {
  cleanLeadId: string
  platformId: number
  strict?: boolean // Mode strict: warnings deviennent errors (default: false)
}

// Résultat de validation standalone
export interface ValidateLeadResult {
  isValid: boolean
  canGenerate: boolean // Peut générer malgré warnings
  validationResult: ValidationResult
  missingDataSummary: string[]
}
