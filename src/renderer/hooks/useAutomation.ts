import { useState, useEffect, useMemo, useCallback } from 'react'

export type Lead = {
  id: string
  data: {
    subscriber?: {
      firstName?: string
      lastName?: string
      civility?: string
      email?: string
      telephone?: string
    }
  }
  createdAt?: string
  metadata?: Record<string, any>
}

export type Platform = {
  id: number
  slug: string
  name: string
  selected: boolean
  has_creds: boolean
}

export type Flow = {
  platform: string
  slug: string
  name: string
  file: string
}

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

export type AdvancedSettings = {
  // EXECUTION
  mode: 'headless' | 'headless-minimized' | 'visible'
  keepBrowserOpen: boolean
  concurrency: number

  // PREVIEW
  showPreviewBeforeRun: boolean

  // RETRY
  retryFailed: boolean
  maxRetries: number

  // VISIBILITY
  enableVisibilityFiltering: boolean
  hiddenPlatforms: string[]
  hiddenFlows: string[]
}

const DEFAULT_SETTINGS: AdvancedSettings = {
  mode: 'headless',
  keepBrowserOpen: false,
  concurrency: 6,
  showPreviewBeforeRun: true,
  retryFailed: true,
  maxRetries: 2,
  enableVisibilityFiltering: true,
  hiddenPlatforms: [],
  // Par défaut, seuls alptis_sante_select_pro_full et swisslifeone_slsis sont visibles
  hiddenFlows: ['alptis_login_hl', 'swisslifeone_login', 'swisslifeone_slsis_inspect']
}

export function useAutomation() {
  // Data
  const [leads, setLeads] = useState<Lead[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [flows, setFlows] = useState<Flow[]>([])

  // Selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())
  const [selectedFlowIds, setSelectedFlowIds] = useState<Set<string>>(new Set())

  // Execution
  const [executionItems, setExecutionItems] = useState<Map<string, ExecutionItem>>(new Map())
  const [runId, setRunId] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)

  // Settings
  const [settings, setSettings] = useState<AdvancedSettings>(() => {
    const stored = localStorage.getItem('automation-settings')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Merge avec les defaults pour ajouter les nouvelles clés
        const merged = { ...DEFAULT_SETTINGS, ...parsed }

        // Migration : si enableVisibilityFiltering n'existe pas, utiliser les nouveaux defaults
        if (parsed.enableVisibilityFiltering === undefined) {
          merged.enableVisibilityFiltering = DEFAULT_SETTINGS.enableVisibilityFiltering
          merged.hiddenFlows = DEFAULT_SETTINGS.hiddenFlows
        }

        return merged
      } catch {
        return DEFAULT_SETTINGS
      }
    }
    return DEFAULT_SETTINGS
  })

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  // Persist settings
  useEffect(() => {
    localStorage.setItem('automation-settings', JSON.stringify(settings))
  }, [settings])

  async function loadData() {
    try {
      // Load platforms
      const platformsList = await window.api.catalog.list()
      setPlatforms(platformsList.filter(p => p.selected))

      // Load leads
      const leadsResponse = await window.api.leads.list({}, { limit: 100 })
      if (leadsResponse.success) {
        setLeads(leadsResponse.data.items || [])
      }

      // Load flows
      const flowsList = await window.api.adminHL.listHLFlows()
      setFlows(flowsList)
    } catch (error) {
      console.error('Failed to load automation data:', error)
    }
  }

  // Selection helpers
  const toggleLead = useCallback((leadId: string) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev)
      if (next.has(leadId)) {
        next.delete(leadId)
      } else {
        next.add(leadId)
      }
      return next
    })
  }, [])

  const toggleFlow = useCallback((flowId: string) => {
    setSelectedFlowIds(prev => {
      const next = new Set(prev)
      if (next.has(flowId)) {
        next.delete(flowId)
      } else {
        next.add(flowId)
      }
      return next
    })
  }, [])

  const togglePlatform = useCallback((platformSlug: string) => {
    const platformFlows = flows.filter(f => f.platform === platformSlug)
    const platformFlowIds = platformFlows.map(f => f.slug)

    setSelectedFlowIds(prev => {
      const next = new Set(prev)
      const allSelected = platformFlowIds.every(id => next.has(id))

      if (allSelected) {
        // Deselect all flows of this platform
        platformFlowIds.forEach(id => next.delete(id))
      } else {
        // Select all flows of this platform
        platformFlowIds.forEach(id => next.add(id))
      }
      return next
    })
  }, [flows])

  const selectAllLeads = useCallback(() => {
    setSelectedLeadIds(new Set(leads.map(l => l.id)))
  }, [leads])

  const clearLeadSelection = useCallback(() => {
    setSelectedLeadIds(new Set())
  }, [])

  // Computed values
  const selectedLeads = useMemo(
    () => leads.filter(l => selectedLeadIds.has(l.id)),
    [leads, selectedLeadIds]
  )

  const selectedFlows = useMemo(
    () => flows.filter(f => selectedFlowIds.has(f.slug)),
    [flows, selectedFlowIds]
  )

  const totalExecutions = useMemo(
    () => selectedLeadIds.size * selectedFlowIds.size,
    [selectedLeadIds, selectedFlowIds]
  )

  // Get lead name helper
  const getLeadName = useCallback((leadId: string): string => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return leadId.slice(0, 8)
    const firstName = lead.data?.subscriber?.firstName || ''
    const lastName = lead.data?.subscriber?.lastName || ''
    return `${firstName} ${lastName}`.trim() || leadId.slice(0, 8)
  }, [leads])

  // Run automation
  const startRun = useCallback(async (mode: 'headless' | 'dev' | 'dev_private' = 'headless') => {
    if (selectedLeadIds.size === 0 || selectedFlowIds.size === 0) {
      throw new Error('Vous devez sélectionner au moins un lead et un flow')
    }

    setIsRunning(true)
    setExecutionItems(new Map())

    try {
      const payload = {
        leadIds: Array.from(selectedLeadIds),
        flowIds: Array.from(selectedFlowIds),
        options: {
          mode,
          concurrency: settings.concurrency
        }
      }

      const { runId: newRunId } = await window.api.scenarios.run(payload)
      setRunId(newRunId)

      // Listen for progress events
      const unsubscribe = window.api.scenarios.onProgress(newRunId, (event: any) => {
        if (event.type === 'item-start' && event.itemId) {
          setExecutionItems(prev => {
            const next = new Map(prev)
            const lead = leads.find(l => l.id === event.leadId)
            const flow = flows.find(f => f.slug === event.flowSlug)
            const platform = platforms.find(p => p.slug === flow?.platform || event.platform)
            const leadName = lead ? `${lead.data?.subscriber?.firstName || ''} ${lead.data?.subscriber?.lastName || ''}`.trim() || event.leadId.slice(0, 8) : event.leadId.slice(0, 8)
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
            return next
          })
        }

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

        if (event.type === 'item-success' && event.itemId) {
          setExecutionItems(prev => {
            const next = new Map(prev)
            const item = next.get(event.itemId)
            if (item) {
              next.set(event.itemId, {
                ...item,
                status: 'success',
                runDir: event.runDir,
                completedAt: new Date()
              })
            }
            return next
          })
        }

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
            }
            return next
          })
        }

        if (event.type === 'run-done') {
          setIsRunning(false)
          unsubscribe()
        }
      })

      return newRunId
    } catch (error) {
      setIsRunning(false)
      throw error
    }
  }, [selectedLeadIds, selectedFlowIds, settings.concurrency, leads, flows, platforms])

  // Update settings
  const updateSettings = useCallback((partial: Partial<AdvancedSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }))
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [])

  return {
    // Data
    leads,
    platforms,
    flows,

    // Selection
    selectedLeadIds,
    selectedFlowIds,
    selectedLeads,
    selectedFlows,
    toggleLead,
    toggleFlow,
    togglePlatform,
    selectAllLeads,
    clearLeadSelection,

    // Execution
    executionItems,
    runId,
    isRunning,
    totalExecutions,
    startRun,

    // Helpers
    getLeadName,

    // Settings
    settings,
    updateSettings,
    resetSettings
  }
}
