import type { BrowserWindow } from 'electron'

export type Mode = 'headless' | 'dev' | 'dev_private'

export type RunRequest = {
  scenarioId?: string
  platformSlugs?: string[]
  leadIds: string[]
  flowOverrides?: Record<string, string>
  options?: {
    mode?: Mode
    concurrency?: number
    keepBrowserOpen?: boolean
    retryFailed?: boolean
    maxRetries?: number
  }
}

export type RunProgressEvent = {
  type:
    | 'run-start'
    | 'items-queued'
    | 'item-start'
    | 'item-progress'
    | 'item-success'
    | 'item-error'
    | 'run-done'
    | 'run-cancelled'
    | 'item-requeued'
  runId: string
  itemId?: string
  leadId?: string
  platform?: string
  flowSlug?: string
  message?: string
  runDir?: string
  currentStep?: number
  totalSteps?: number
  stepMessage?: string
  items?: Array<{
    itemId: string
    leadId: string
    platform: string
    flowSlug: string
  }>
}

export type TaskDef = {
  itemId: string
  leadId: string
  platform: string
  flowFile: string
  flowSlug: string
  fieldsFile: string
  username: string
  password: string
}

export type RunContext = {
  queue: { add: <T>(fn: () => Promise<T>) => Promise<T>; stop: () => number; isRunning: boolean }
  startedAt: Date
  sender?: BrowserWindow
  // For requeue support
  taskDefs: Map<string, TaskDef>
  activeTasks: number
  mode: Mode
  keepOpen: boolean
  retryFailed: boolean
  maxRetries: number
  leadsSvc: any
  runId: string
  executeWithRetry: (def: TaskDef, attempt?: number) => Promise<void>
  // For stopping execution
  isStopped: boolean
  activeBrowsers: Map<string, { browser: any; context: any; itemId: string }>
  // For per-item cancellation
  cancelledItems: Set<string>
  // For per-item pause/resume (cooperative)
  pausedItems: Set<string>
  // Display mode and window tracking
  displayMode: 'headless' | 'headless-minimized' | 'visible'
  windowInfos: Map<string, { windowId: number; state: 'normal' | 'minimized' | 'maximized' | 'fullscreen'; targetId: string }>
}

