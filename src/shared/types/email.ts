/**
 * Types pour le système d'import de leads par email
 */

export type EmailProvider = 'gmail' | 'outlook'

export type AuthStatus = 'not_authenticated' | 'authenticated' | 'expired' | 'error'

export type SenderPatternType = 'domain' | 'email' | 'contains'

export interface KnownSender {
  pattern: string
  type: SenderPatternType
  bonus: number
}

export interface EmailConfig {
  id?: number
  provider: EmailProvider
  email: string
  displayName?: string
  accessToken?: string
  refreshToken?: string
  expiryDate?: number
  knownSenders?: KnownSender[]
  createdAt?: string
  updatedAt?: string
}

export interface DateRange {
  from: Date
  to: Date
}

export interface EmailFilters {
  dateRange?: DateRange
  days?: number
  query?: string
  senders?: string[]
  keywords?: string[]
  maxResults?: number
}

export interface EmailMessage {
  id: string
  threadId?: string
  subject: string
  from: string
  to?: string
  date: string
  snippet?: string
  content: string
  htmlContent?: string
  labels?: string[]
  hasLeadPotential: boolean
  detectionReasons?: string[]
  attachments?: EmailAttachment[]
}

export interface EmailAttachment {
  id: string
  filename: string
  mimeType: string
  size: number
}

export interface EmailImportResult {
  success: boolean
  totalFetched: number
  leadsDetected: number
  messages: EmailMessage[]
  error?: string
}

export interface EmailImportProgress {
  phase: 'authenticating' | 'fetching' | 'processing' | 'completed' | 'error'
  message: string
  total?: number
  current?: number
  percentage?: number
}

export interface StartImportParams {
  configId?: number
  filters: EmailFilters
}

export interface OAuthResult {
  success: boolean
  config?: EmailConfig
  error?: string
}

export interface EmailImportStats {
  totalImports: number
  lastImportDate?: string
  totalEmailsFetched: number
  totalLeadsDetected: number
}

export type ImportMethod = 'email' | 'csv' | 'manual'

export interface ImportWizardState {
  step: number
  method: ImportMethod
  emailConfig?: EmailConfig
  filters?: EmailFilters
  result?: EmailImportResult
  selectedMessageIds: string[]
}
