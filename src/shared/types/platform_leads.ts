import type { CleanLead } from './leads'

export type FlowAssignmentStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface FlowAssignment {
  id: string
  cleanLeadId: string
  flowId: number
  platformId: number
  platformLeadId: string | null
  platformLeadData: Record<string, any> | null
  cleanLeadVersion: number | null
  status: FlowAssignmentStatus
  priority: number
  assignedAt: string
  startedAt: string | null
  completedAt: string | null
  errorMessage: string | null
}

export interface FlowAssignmentWithDetails extends FlowAssignment {
  platformSlug: string
  platformName: string
  flowSlug: string
  flowName: string
}

export interface CreateFlowAssignmentParams {
  cleanLeadId: string
  flowId: number
  platformId: number
  platformLeadData?: Record<string, any>
  cleanLeadVersion?: number
  priority?: number
}

export interface UpdateFlowAssignmentParams {
  status?: FlowAssignmentStatus
  startedAt?: string
  completedAt?: string
  errorMessage?: string
  platformLeadData?: Record<string, any>
}

export interface FlowAssignmentFilters {
  cleanLeadId?: string
  platformId?: number
  flowId?: number
  status?: FlowAssignmentStatus | FlowAssignmentStatus[]
  priority?: number
}

export interface PlatformLeadData {
  platformId: number
  platformSlug: string
  cleanLeadId: string
  cleanLeadVersion: number
  data: Record<string, any>
  generatedAt: string
  isValid: boolean
  validationErrors: ValidationError[]
}

export interface ValidationError {
  field: string
  domainKey?: string
  message: string
  severity: 'error' | 'warning'
  value?: any
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  missingFields: string[]
  incompatibleFields: string[]
}

export interface GeneratePlatformLeadOptions {
  cleanLeadId: string
  platformId: number
  validate?: boolean
  throwOnError?: boolean
  forceRegenerate?: boolean
}

export interface GeneratePlatformLeadResult {
  success: boolean
  data?: PlatformLeadData
  error?: string
  validationResult?: ValidationResult
}

export interface FieldDefinition {
  key: string
  domainKey: string
  type: string
  label?: string
  selector?: string
  required?: boolean
  defaultValue?: any
  validation?: FieldValidation
  metadata?: Record<string, any>
  valueMappings?: {
    [platformSlug: string]: {
      [domainValue: string]: string
    }
  }
}

export interface FieldValidation {
  pattern?: string
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  enum?: any[]
  custom?: string
}

export interface PlatformFieldDefinitions {
  platform: string
  fields: FieldDefinition[]
  metadata?: {
    version?: string
    lastUpdated?: string
    author?: string
  }
}

export interface FlowSelectionRule {
  id: number
  name: string
  platformId: number
  flowId: number
  conditions: FlowConditions | null
  priority: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface FlowConditions {
  [fieldPath: string]: FieldCondition
}

export type FieldCondition =
  | { equals: any }
  | { oneOf: any[] }
  | { greaterThan: number }
  | { lessThan: number }
  | { contains: string }
  | { matches: string }

export interface AutoAssignFlowsOptions {
  cleanLeadId: string
  platformIds?: number[]
  generateLeadData?: boolean
  priority?: number
}

export interface AutoAssignFlowsResult {
  success: boolean
  assignmentsCreated: FlowAssignment[]
  errors: string[]
  warnings: string[]
}

export interface AssignmentStats {
  total: number
  byStatus: Record<FlowAssignmentStatus, number>
  byPlatform: Record<string, number>
  pendingCount: number
  runningCount: number
  completedCount: number
  failedCount: number
  averageDuration?: number
}

export interface ListAssignmentsOptions {
  filters?: FlowAssignmentFilters
  includeDetails?: boolean
  orderBy?: 'priority' | 'assigned_at' | 'status'
  order?: 'ASC' | 'DESC'
  limit?: number
  offset?: number
}

export interface PaginatedAssignments {
  items: FlowAssignment[] | FlowAssignmentWithDetails[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface RegeneratePlatformLeadOptions {
  cleanLeadId: string
  platformId: number
  updateAssignments?: boolean
  reason?: string
}

export interface RegeneratePlatformLeadResult {
  success: boolean
  data?: PlatformLeadData
  assignmentsUpdated: number
  error?: string
  validationResult?: ValidationResult
}

export interface PlatformInfo {
  id: number
  slug: string
  name: string
  status: string
  selected: boolean
  fieldDefinitions: PlatformFieldDefinitions | null
  hasCredentials: boolean
}

export interface ValueMapping {
  [domainValue: string]: string
}

export interface PlatformValueMappings {
  [fieldKey: string]: ValueMapping
}

export interface GenerationContext {
  lead: CleanLead
  platform: PlatformInfo
  fieldDefinitions: FieldDefinition[]
  valueMappings: PlatformValueMappings
  errors: ValidationError[]
  warnings: ValidationError[]
}

export interface ValidateLeadOptions {
  cleanLeadId: string
  platformId: number
  strict?: boolean
}

export interface ValidateLeadResult {
  isValid: boolean
  canGenerate: boolean
  validationResult: ValidationResult
  missingDataSummary: string[]
}
