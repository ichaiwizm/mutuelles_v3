import { useState, useCallback, useRef, useEffect } from 'react'
import type { AdvancedSettings } from './useSettings'
import { notificationBatcher } from '../../services/notificationBatcher'

export type ExecutionItem = {
  id: string
  leadId: string
  leadName: string
  platform: string
  platformName: string
  flowSlug?: string
  flowName?: string
  status: 'pending' | 'running' | 'success' | 'error'
  runDir?: string
  message?: string
  startedAt?: Date
  completedAt?: Date
  currentStep?: number
  totalSteps?: number
}

export type Lead = {
  id: string
  data: {
    subscriber?: {
      firstName?: string
      lastName?: string
    }
  }
}

export type Platform = {
  id: number
  slug: string
  name: string
}

export type Flow = {
  platform: string
  slug: string
  name: string
  file: string
}

/**
 * Hook for managing execution state and progress tracking
 *
 * Responsibilities:
 * - Manage execution items (pending, running, success, error)
 * - Handle IPC progress events (items-queued, item-start, item-progress, item-success, item-error)
 * - Stream execution updates in real-time
 * - Coordinate with history hook to save completed runs
 * - Handle run lifecycle (start, progress, completion, cancellation)
 *
 * @param leads - Available leads
 * @param flows - Available flows
 * @param platforms - Available platforms
 * @param settings - Automation settings
 * @param onRunComplete - Callback when run completes or is cancelled
 * @returns Execution state and control functions
 */
export function useExecution(
  leads: Lead[],
  flows: Flow[],
  platforms: Platform[],
  settings: AdvancedSettings,
  onRunComplete: (executionItems: Map<string, ExecutionItem>, runId: string) => void
) {
  // Execution state
  const [executionItems, setExecutionItems] = useState<Map<string, ExecutionItem>>(new Map())
  const [runId, setRunId] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)

  // Ref to store the unsubscribe function for cleanup
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Ref to store the latest executionItems to avoid stale closure in callbacks
  const executionItemsRef = useRef<Map<string, ExecutionItem>>(new Map())

  /**
   * Keep ref in sync with state to avoid stale closure issues
   */
  useEffect(() => {
    executionItemsRef.current = executionItems
  }, [executionItems])

  /**
   * Cleanup IPC listener on unmount
   */
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        console.log('[useExecution] Cleaning up IPC listener on unmount')
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [])

  /**
   * Start a new automation run
   *
   * @param selectedLeadIds - IDs of leads to execute
   * @param selectedFlows - Flows to execute
   * @param mode - Execution mode (headless, dev, dev_private)
   */
  const startRun = useCallback(async (
    selectedLeadIds: Set<string>,
    selectedFlows: Flow[],
    mode: 'headless' | 'dev' | 'dev_private' = 'headless'
  ) => {
    if (selectedLeadIds.size === 0 || selectedFlows.length === 0) {
      throw new Error('Vous devez sélectionner au moins un lead et un flow')
    }

    setIsRunning(true)
    setExecutionItems(new Map()) // Clear previous execution items
    console.log('[useExecution] Cleared execution items, starting new run')

    try {
      // Filter out hidden flows if visibility filtering is enabled
      let flowsToExecute = selectedFlows
      if (settings.enableVisibilityFiltering && settings.hiddenFlows.length > 0) {
        const beforeCount = flowsToExecute.length
        flowsToExecute = flowsToExecute.filter(f => !settings.hiddenFlows.includes(f.slug))
        const filteredCount = beforeCount - flowsToExecute.length

        if (filteredCount > 0) {
          console.warn('[useExecution] Filtered out', filteredCount, 'hidden flows from execution')
        }

        if (flowsToExecute.length === 0) {
          throw new Error('Aucun flow visible sélectionné. Veuillez afficher des flows ou désactiver le filtrage.')
        }
      }

      // Build flowOverrides mapping platform -> flowSlug
      const flowOverrides: Record<string, string> = {}
      const platformCounts: Record<string, number> = {}

      flowsToExecute.forEach(flow => {
        platformCounts[flow.platform] = (platformCounts[flow.platform] || 0) + 1
        flowOverrides[flow.platform] = flow.slug
      })

      // Check for multiple flows per platform
      const multiFlowPlatforms = Object.entries(platformCounts)
        .filter(([_, count]) => count > 1)
        .map(([platform]) => platform)

      if (multiFlowPlatforms.length > 0) {
        throw new Error(
          `Plusieurs flows sélectionnés pour: ${multiFlowPlatforms.join(', ')}. ` +
          'Veuillez ne sélectionner qu\'un seul flow par plateforme.'
        )
      }

      // Build execution payload
      const payload = {
        leadIds: Array.from(selectedLeadIds),
        flowOverrides,
        options: {
          mode,
          concurrency: settings.concurrency,
          keepBrowserOpen: settings.keepBrowserOpen,
          retryFailed: settings.retryFailed,
          maxRetries: settings.maxRetries
        }
      }

      // Start the run via IPC
      const { runId: newRunId } = await window.api.scenarios.run(payload)
      setRunId(newRunId)

      // Clean up previous listener if exists
      if (unsubscribeRef.current) {
        console.log('[useExecution] Cleaning up previous listener before starting new run')
        unsubscribeRef.current()
      }

      // Listen for progress events
      const unsubscribe = window.api.scenarios.onProgress(newRunId, (event: any) => {
        console.log(
          '[useExecution] Received event:',
          event.type,
          event.itemId?.slice(0, 8) || '',
          event.currentStep !== undefined ? `step ${event.currentStep}/${event.totalSteps}` : ''
        )

        // Handle items-queued: create all items in 'pending' status
        if (event.type === 'items-queued' && event.items) {
          setExecutionItems(prev => {
            const next = new Map(prev)

            for (const queuedItem of event.items) {
              const lead = leads.find(l => l.id === queuedItem.leadId)
              const flow = flows.find(f => f.slug === queuedItem.flowSlug)
              const platform = platforms.find(p => p.slug === flow?.platform || queuedItem.platform)

              const leadName = lead
                ? `${lead.data?.subscriber?.firstName || ''} ${lead.data?.subscriber?.lastName || ''}`.trim() || queuedItem.leadId.slice(0, 8)
                : queuedItem.leadId.slice(0, 8)

              next.set(queuedItem.itemId, {
                id: queuedItem.itemId,
                leadId: queuedItem.leadId,
                leadName: leadName,
                platform: flow?.platform || queuedItem.platform,
                platformName: platform?.name || queuedItem.platform,
                flowSlug: queuedItem.flowSlug,
                flowName: flow?.name || queuedItem.flowSlug,
                status: 'pending'
              })
            }

            return next
          })
        }

        // Handle item-start: update pending item to running
        if (event.type === 'item-start' && event.itemId) {
          setExecutionItems(prev => {
            const next = new Map(prev)
            const existingItem = next.get(event.itemId)

            if (existingItem) {
              // Update existing pending item to running
              next.set(event.itemId, {
                ...existingItem,
                status: 'running',
                startedAt: new Date()
              })
            } else {
              // Fallback: create new item if not in pending (shouldn't happen normally)
              const lead = leads.find(l => l.id === event.leadId)
              const flow = flows.find(f => f.slug === event.flowSlug)
              const platform = platforms.find(p => p.slug === flow?.platform || event.platform)

              const leadName = lead
                ? `${lead.data?.subscriber?.firstName || ''} ${lead.data?.subscriber?.lastName || ''}`.trim() || event.leadId.slice(0, 8)
                : event.leadId.slice(0, 8)

              next.set(event.itemId, {
                id: event.itemId,
                leadId: event.leadId,
                leadName: leadName,
                platform: flow?.platform || event.platform,
                platformName: platform?.name || event.platform,
                flowSlug: event.flowSlug,
                flowName: flow?.name || event.flowSlug,
                status: 'running',
                startedAt: new Date()
              })
            }

            return next
          })
        }

        // Handle item-progress: update step progress
        if (event.type === 'item-progress' && event.itemId) {
          setExecutionItems(prev => {
            const next = new Map(prev)
            const item = next.get(event.itemId)

            if (item) {
              next.set(event.itemId, {
                ...item,
                currentStep: event.currentStep,
                totalSteps: event.totalSteps
              })
            }

            return next
          })
        }

        // Handle item-success: mark as completed successfully
        if (event.type === 'item-success' && event.itemId) {
          setExecutionItems(prev => {
            const next = new Map(prev)
            const item = next.get(event.itemId)

            if (item) {
              next.set(event.itemId, {
                ...item,
                status: 'success',
                runDir: event.runDir,
                completedAt: new Date(),
                // Ensure final progress is 100%
                currentStep: item.totalSteps || item.currentStep
              })
            }

            return next
          })

          // Force re-render after a small delay to ensure state is applied
          setTimeout(() => {
            setExecutionItems(prev => new Map(prev))
          }, 100)
        }

        // Handle item-error: mark as failed with error message
        if (event.type === 'item-error' && event.itemId) {
          setExecutionItems(prev => {
            const next = new Map(prev)
            const item = next.get(event.itemId)

            if (item) {
              next.set(event.itemId, {
                ...item,
                status: 'error',
                message: event.message,
                completedAt: new Date()
              })

              // Send failure notification
              notificationBatcher.addFailure({
                leadName: item.leadName,
                platform: item.platformName,
                error: event.message
              })
            }

            return next
          })
        }

        // Handle run-done: run completed
        if (event.type === 'run-done') {
          setIsRunning(false)
          unsubscribe()
          unsubscribeRef.current = null

          // Notify parent to save to history (using ref to get latest state)
          onRunComplete(executionItemsRef.current, newRunId)

          // IMPORTANT: Do NOT clear executionItems - keep them visible
        }

        // Handle run-cancelled: run was stopped
        if (event.type === 'run-cancelled') {
          setIsRunning(false)
          unsubscribe()
          unsubscribeRef.current = null

          // Notify parent to save to history (even if cancelled, using ref to get latest state)
          onRunComplete(executionItemsRef.current, newRunId)

          // IMPORTANT: Do NOT clear executionItems - keep them visible
        }
      })

      // Store unsubscribe for cleanup
      unsubscribeRef.current = unsubscribe

      return newRunId
    } catch (error) {
      setIsRunning(false)
      throw error
    }
  }, [leads, flows, platforms, settings, onRunComplete])

  /**
   * Clear completed execution items (success/error only)
   * Keep running and pending items
   */
  const clearCompletedExecutions = useCallback(() => {
    setExecutionItems(prev => {
      const next = new Map()
      // Keep only running and pending items
      for (const [id, item] of prev.entries()) {
        if (item.status === 'running' || item.status === 'pending') {
          next.set(id, item)
        }
      }
      return next
    })
  }, [])

  return {
    executionItems,
    runId,
    isRunning,
    startRun,
    clearCompletedExecutions
  }
}
