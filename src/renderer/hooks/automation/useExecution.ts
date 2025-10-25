import { useState, useCallback, useEffect, useRef } from 'react'
import type { AdvancedSettings } from '../../../shared/settings'
import type { ExecutionItem } from '../../../shared/types/automation'
import { notificationBatcher } from '../../services/notificationBatcher'

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

export type ExecutionRun = {
  id: string
  status: 'running' | 'completed' | 'failed' | 'stopped'
  mode: string
  concurrency: number | null
  total_items: number
  success_items: number
  error_items: number
  pending_items: number
  cancelled_items: number
  started_at: string
  completed_at: string | null
  duration_ms: number | null
}

/**
 * Hook for managing execution state via DB polling
 *
 * Responsibilities:
 * - Poll database for execution state every 2.5 seconds
 * - Display real-time execution progress from DB
 * - Handle run lifecycle (start, poll, completion)
 * - Recover state after page refresh
 *
 * @param leads - Available leads
 * @param flows - Available flows
 * @param platforms - Available platforms
 * @param settings - Automation settings
 * @param onRunComplete - Callback when run completes
 * @returns Execution state and control functions
 */
export function useExecution(
  leads: Lead[],
  flows: Flow[],
  platforms: Platform[],
  settings: AdvancedSettings,
  onRunComplete: (runId: string) => void
) {
  // Execution state from database
  const [activeRun, setActiveRun] = useState<ExecutionRun | null>(null)
  const [items, setItems] = useState<ExecutionItem[]>([])
  const [runId, setRunId] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)

  // Debounce for event-driven polls
  const lastPollRef = useRef<number>(0)
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Poll database for current run state
   */
  const pollRunState = useCallback(async (currentRunId: string) => {
    if (!currentRunId) return

    try {
      const [runRes, itemsRes] = await Promise.all([
        window.api.scenarios.getActiveRun(currentRunId),
        window.api.scenarios.getRunItems(currentRunId)
      ])

      if (runRes.success && runRes.data) {
        setActiveRun(runRes.data)

        // Check if run is complete
        if (runRes.data.status === 'completed' || runRes.data.status === 'failed' || runRes.data.status === 'stopped') {
          setIsRunning(false)

          // Notify failures (exclude cancelled items - those are user-initiated stops)
          if (itemsRes.success && itemsRes.data) {
            const failures = itemsRes.data
              .filter((item: any) => item.status === 'error')  // Only real errors, not cancelled
              .map((item: any) => ({
                leadName: item.lead_name || item.lead_id,
                platform: item.platform_name || item.platform,
                error: item.error_message
              }))

            // Send each failure individually (not as array)
            failures.forEach(failure => {
              notificationBatcher.addFailure(failure)
            })
          }

          // Callback to update history
          onRunComplete(currentRunId)
        }
      }

      if (itemsRes.success && itemsRes.data) {
        // Transform DB items to ExecutionItem format
        const transformedItems: ExecutionItem[] = itemsRes.data.map((item: any) => ({
          id: item.id,
          runId: item.run_id,  // Map run_id from database
          leadId: item.lead_id || '',
          leadName: item.lead_name || item.lead_id || '',
          platform: item.platform,
          platformName: item.platform_name || item.platform,
          flowSlug: item.flow_slug || undefined,
          flowName: item.flow_name || item.flow_slug || undefined,
          status: item.status,
          runDir: item.run_dir || undefined,
          message: item.error_message || undefined,
          startedAt: item.started_at ? new Date(item.started_at) : undefined,
          completedAt: item.completed_at ? new Date(item.completed_at) : undefined,
          currentStep: item.current_step || undefined,
          totalSteps: item.total_steps || undefined,
          durationMs: item.duration_ms || undefined,
          attemptNumber: item.attempt_number || undefined
        }))

        setItems(transformedItems)
      }
    } catch (error) {
      // Silent failure; UI will retry on next tick
    }
  }, [onRunComplete])

  /**
   * Subscribe to runner progress events for real-time updates
   * On each event, trigger a debounced poll to sync from DB (source of truth)
   */
  useEffect(() => {
    if (!runId || !isRunning) return

    const unsubscribe = window.api.scenarios.onProgress(runId, (evt: any) => {
      const now = Date.now()
      const since = now - (lastPollRef.current || 0)
      const schedulePoll = () => {
        if (pendingTimerRef.current) return
        pendingTimerRef.current = setTimeout(async () => {
          pendingTimerRef.current = null
          lastPollRef.current = Date.now()
          await pollRunState(runId)
        }, 200)
      }

      // For terminal events, update immediately
      if (evt?.type === 'run-done' || evt?.type === 'run-cancelled') {
        setIsRunning(false)
        pollRunState(runId)
          .finally(() => onRunComplete(runId))
        return
      }

      // For frequent progress events, debounce to reduce load
      if (since > 400) {
        lastPollRef.current = now
        void pollRunState(runId)
      } else {
        schedulePoll()
      }
    })

    return () => {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current)
        pendingTimerRef.current = null
      }
      unsubscribe?.()
    }
  }, [runId, isRunning, pollRunState, onRunComplete])

  /**
   * Polling effect - runs every 2.5 seconds when a run is active
   */
  useEffect(() => {
    if (!runId || !isRunning) {
      return
    }

    // Poll immediately
    pollRunState(runId)

    // Then poll every 2.5 seconds
    const interval = setInterval(() => {
      pollRunState(runId)
    }, 2500)

    return () => {
      clearInterval(interval)
    }
  }, [runId, isRunning, pollRunState])

  /**
   * Safety: if all items are in a terminal state, consider run finished even
   * if an event was missed. This prevents the UI from staying stuck in
   * "en cours" with a Stop button.
   */
  useEffect(() => {
    if (!isRunning || !runId) return
    if (items.length === 0) return
    const allDone = items.every((it) => it.status === 'success' || it.status === 'error' || it.status === 'cancelled')
    if (allDone) {
      setIsRunning(false)
      // Try to pick up final DB status (finalizer may take a tick)
      const attemptPoll = async () => {
        try { await pollRunState(runId) } catch {}
        // If finalizer not done yet, poll once more shortly after
        setTimeout(() => { void pollRunState(runId) }, 300)
      }
      void attemptPoll()
    }
  }, [items, isRunning, runId, pollRunState])

  /**
   * Start a new automation run
   */
  const startRun = useCallback(async (
    selectedLeadIds: Set<string>,
    selectedFlows: Flow[],
    mode: 'headless' | 'dev' | 'dev_private' = 'headless'
  ) => {
    if (selectedLeadIds.size === 0 || selectedFlows.length === 0) {
      throw new Error('Vous devez sélectionner au moins un lead et un flow')
    }

    // Reset state
    setItems([])
    setActiveRun(null)

    try {
      // Filter out hidden flows if visibility filtering is enabled
      let flowsToExecute = selectedFlows
      if (settings.enableVisibilityFiltering && settings.hiddenFlows.length > 0) {
        const beforeCount = flowsToExecute.length
        flowsToExecute = flowsToExecute.filter(f => !settings.hiddenFlows.includes(f.slug))
        const filteredCount = beforeCount - flowsToExecute.length

        // silent

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

      // Set state to start polling
      setRunId(newRunId)
      setIsRunning(true)
      lastPollRef.current = 0

      // silent
    } catch (error) {
      setIsRunning(false)
      throw error
    }
  }, [settings])

  /**
   * Stop the current run
   */
  const stopRun = useCallback(async () => {
    if (!runId) {
      throw new Error('Aucune exécution en cours')
    }

    // silent

    const result = await window.api.scenarios.stop(runId)

    if (result.success) {
      // Runner emits a terminal event; we let the event finalize and call onRunComplete
      // Do a light poll just in case events are missed
      await pollRunState(runId)
      setIsRunning(false)
    }

    return result
  }, [runId, pollRunState])

  /**
   * Stop a single execution item (pending or running)
   */
  const stopItem = useCallback(async (itemId: string) => {
    if (!runId) {
      throw new Error('Aucune exécution en cours')
    }
    const result = await window.api.scenarios.stopItem(runId, itemId)
    // Light poll to reflect cancellation quickly
    try { await pollRunState(runId) } catch {}
    return result
  }, [runId, pollRunState])

  /**
   * Requeue a single failed item
   */
  const requeueItem = useCallback(async (itemId: string) => {
    if (!runId) {
      throw new Error('Aucune exécution en cours')
    }

    // silent

    const result = await window.api.scenarios.requeueItem(runId, itemId)

    if (result.success) {
      // Poll immediately to show updated state
      await pollRunState(runId)
    }

    return result
  }, [runId, pollRunState])

  /**
   * Requeue multiple failed items
   */
  const requeueItems = useCallback(async (itemIds: string[]) => {
    if (!runId) {
      throw new Error('Aucune exécution en cours')
    }

    // silent

    const result = await window.api.scenarios.requeueItems(runId, itemIds)

    if (result.success) {
      // Poll immediately to show updated state
      await pollRunState(runId)
    }

    return result
  }, [runId, pollRunState])

  /**
   * Get error items from current execution
   */
  const getErrorItems = useCallback(() => {
    return items.filter(item => item.status === 'error')
  }, [items])

  /**
   * Clear execution state (when user navigates away)
   */
  const clearExecution = useCallback(() => {
    // silent
    setItems([])
    setActiveRun(null)
    setRunId('')
    setIsRunning(false)
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current)
      pendingTimerRef.current = null
    }
  }, [])

  return {
    // State
    activeRun,
    items,
    runId,
    isRunning,

    // Actions
    startRun,
    stopRun,
    requeueItem,
    requeueItems,
    stopItem,
    clearExecution,

    // Helpers
    getErrorItems
  }
}
