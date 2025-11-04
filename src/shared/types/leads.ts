/**
 * Lead types (aligned with v2 canonical schema)
 *
 * This file re-exports types from the v2 canonical schema
 * and adds UI-specific types for the Electron application.
 */

// Import canonical types from v2 schema
export type {
  SubscriberInfo,
  SpouseInfo,
  ChildInfo,
  ProjectInfo,
  LeadData,
  Lead,
} from '../../../core/domain/lead.schema'

export type PlatformLeadStatus = 'pending' | 'processing' | 'completed' | 'error'

export type CleanLead = Lead
export type FullLead = Lead

export interface PlatformLead {
  id: string
  cleanLeadId: string
  platformId: number
  adaptedData: Record<string, any>
  status: PlatformLeadStatus
  adaptedAt: string
  processedAt?: string
  errorMessage?: string
}

export interface GmailConfig {
  id?: number
  name: string
  email?: string
  refreshToken?: string
  providerSettings: Record<string, any>
  active: boolean
  createdAt?: string
}

// Removed legacy carrier-specific containers (SwissLifeOneData, PlatformData)
// Canonical LeadData must remain platform-agnostic.

export interface CreateLeadData extends Partial<LeadData> {
  subscriber: SubscriberInfo
  project: ProjectInfo
}

export interface UpdateLeadData extends Partial<LeadData> {
  subscriber?: Partial<SubscriberInfo>
  project?: Partial<ProjectInfo>
}

export interface LeadFilters {
  search?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface LeadStats {
  total: number
  new: number
  processed: number
  processing: number
}

export interface GmailExtractionConfig {
  configId: number
  daysBack?: number
  query?: string
}

export interface ExtractionResult {
  success: boolean
  rawLeadsCreated: number
  cleanLeadsCreated: number
  duplicatesSkipped: number
  errors: string[]
}

export interface ImportResult {
  success: boolean
  leadsCreated: number
  leadsSkipped: number
  errors: string[]
}

export interface OperationProgress {
  current: number
  total: number
  message: string
  completed: boolean
  error?: string
}

export interface DuplicateInfo {
  leadId: string
  subscriber: SubscriberInfo
  reasons: string[]
}

export interface CreateLeadResult {
  success: boolean
  data?: CleanLead
  error?: string
  duplicates?: DuplicateInfo[]
  warning?: string
}
