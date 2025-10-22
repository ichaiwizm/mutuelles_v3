/**
 * Comprehensive type definitions for the automation system
 * Covers execution matrix, settings, progress tracking, and run history
 */

// ============================================================================
// Execution Matrix Types
// ============================================================================

export interface ExecutionMatrix {
  items: ExecutionMatrixItem[]
  createdAt: string
  totalCount: number
}

export interface ExecutionMatrixItem {
  id: string
  leadId: string
  leadName: string
  platform: string
  platformName: string
  flowSlug?: string
  flowName?: string
  priority?: number
}

// ============================================================================
// Execution Settings
// ============================================================================

export type ExecutionMode = 'headless' | 'dev' | 'dev_private'
export type ScreenshotFrequency = 'all' | 'errors' | 'none'

export interface ExecutionSettings {
  mode: ExecutionMode
  concurrency: number
  timeout: number // in milliseconds
  keepBrowserOpen: boolean
  screenshotFrequency: ScreenshotFrequency
  retryFailed: boolean
  maxRetries: number
}

export const DEFAULT_EXECUTION_SETTINGS: ExecutionSettings = {
  mode: 'headless',
  concurrency: 2,
  timeout: 300000, // 5 minutes
  keepBrowserOpen: false,
  screenshotFrequency: 'all',
  retryFailed: false,
  maxRetries: 1
}

// ============================================================================
// Execution Progress & State
// ============================================================================

export type ExecutionItemStatus = 'pending' | 'running' | 'success' | 'error' | 'cancelled'

export interface ExecutionItem {
  id: string
  runId: string  // Parent run ID
  leadId: string
  leadName: string
  platform: string
  platformName: string
  flowSlug?: string
  flowName?: string
  status: ExecutionItemStatus
  runDir?: string
  message?: string
  startedAt?: Date
  completedAt?: Date
  currentStep?: number
  totalSteps?: number
  durationMs?: number
  attemptNumber?: number
}

export interface ExecutionItemProgress {
  current: number
  total: number
  currentStep?: string
  percentage: number
}

// ============================================================================
// Execution Run
// ============================================================================

export interface ExecutionRun {
  runId: string
  status: 'starting' | 'running' | 'completed' | 'error' | 'stopped'
  items: ExecutionItem[]
  settings: ExecutionSettings
  startedAt: string
  completedAt?: string
  totalItems: number
  completedItems: number
  successItems: number
  errorItems: number
  skippedItems: number
  progress: number // 0-100
  durationMs?: number
}

// ============================================================================
// Progress Events
// ============================================================================

export type ProgressEventType =
  | 'run-start'
  | 'items-queued'
  | 'item-start'
  | 'item-progress'
  | 'item-success'
  | 'item-error'
  | 'item-skip'
  | 'run-done'
  | 'run-error'

export interface ProgressEvent {
  type: ProgressEventType
  runId: string
  timestamp: string
  itemId?: string
  leadId?: string
  platform?: string
  flowSlug?: string
  message?: string
  runDir?: string
  error?: string
  progress?: ExecutionItemProgress
  items?: Array<{
    itemId: string
    leadId: string
    platform: string
    flowSlug: string
  }>
}

// ============================================================================
// Flow Types
// ============================================================================

export interface FlowInfo {
  slug: string
  name: string
  file: string
  stepsCount: number
  platform: string
  description?: string
}

export interface PlatformFlows {
  platform: string
  platformName: string
  flows: FlowInfo[]
}

// ============================================================================
// Run History Types
// ============================================================================

export interface FlowRun {
  id: string
  slug: string
  platform: string
  leadId?: string
  leadName?: string
  status: 'success' | 'error' | 'running' | 'stopped'
  startedAt: string
  finishedAt?: string
  durationMs?: number
  runDir: string
  error?: string
  mode: ExecutionMode
  stepsTotal?: number
  stepsCompleted?: number
}

export interface RunManifest {
  run: {
    id: string
    slug: string
    platform: string
    startedAt: string
    finishedAt?: string
    mode: ExecutionMode
    chrome?: string
    profileDir?: string | null
  }
  env: {
    os: string
    node: string
  }
  options: {
    outRoot: string
    mode: ExecutionMode
    keepOpen?: boolean
    dom?: string
  }
  steps: RunStepResult[]
  lead?: {
    name?: string
    id?: string
  }
  error?: {
    message: string
    stack?: string
    step?: number
  }
}

export interface RunStepResult {
  index: number
  type: string
  label?: string
  ok: boolean
  ms: number
  screenshot?: string
  error?: {
    message: string
    stack?: string
  }
}

// ============================================================================
// Run History (localStorage persistence)
// ============================================================================

export type RunHistoryStatus = 'completed' | 'partial' | 'failed' | 'stopped'

export interface ExecutionHistoryItem {
  id: string
  leadId: string
  leadName: string
  platform: string
  platformName: string
  flowSlug: string
  flowName: string
  status: 'success' | 'error' | 'pending' | 'running' | 'cancelled'
  runDir?: string
  error?: string
  startedAt: string
  completedAt?: string
  durationMs?: number
}

export interface RunHistoryItem {
  runId: string
  startedAt: string
  completedAt: string
  durationMs: number
  totalItems: number
  successItems: number
  errorItems: number
  pendingItems: number
  cancelledItems: number
  status: RunHistoryStatus
  settings: ExecutionSettings
  items: ExecutionHistoryItem[]
}

// ============================================================================
// Validation & Compatibility
// ============================================================================

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  itemId: string
  leadId: string
  platform: string
  reason: string
  details?: string
}

export interface ValidationWarning {
  itemId: string
  leadId: string
  platform: string
  message: string
}

// ============================================================================
// IPC Response Types
// ============================================================================

export interface IpcResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ListFlowsResponse {
  success: boolean
  data: PlatformFlows[]
}

export interface GetHistoryResponse {
  success: boolean
  data: FlowRun[]
}

export interface GetRunDetailsResponse {
  success: boolean
  data: RunManifest
}

export interface StopExecutionResponse {
  success: boolean
  message: string
}

export interface MakeVisibleResponse {
  success: boolean
  message: string
}

// ============================================================================
// Statistics
// ============================================================================

export interface ExecutionStats {
  totalRuns: number
  successRate: number
  averageDuration: number
  byPlatform: Record<string, PlatformStats>
  recentRuns: FlowRun[]
}

export interface PlatformStats {
  platform: string
  totalRuns: number
  successCount: number
  errorCount: number
  averageDuration: number
}

// ============================================================================
// Progress Calculation
// ============================================================================

export interface ProgressSummary {
  completed: number
  total: number
  percentage: number
  successCount: number
  errorCount: number
  pendingCount: number
  runningCount: number
}

// ============================================================================
// Utility Types
// ============================================================================

export type FlowOverrides = Map<string, string> // platformSlug -> flowSlug

export interface AutomationState {
  leads: any[]
  platforms: any[]
  flows: PlatformFlows[]
  selectedLeads: Set<string>
  selectedPlatforms: Set<string>
  flowOverrides: FlowOverrides
  executionMode: 'auto' | 'manual'
  settings: ExecutionSettings
  currentRun: ExecutionRun | null
  isLoading: boolean
  error: string | null
}
