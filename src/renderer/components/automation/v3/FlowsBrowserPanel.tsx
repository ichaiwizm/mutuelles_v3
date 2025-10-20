import React, { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronRight, CheckCircle, AlertCircle, Eye } from 'lucide-react'
import type { Platform, Flow, AdvancedSettings } from '../../../hooks/useAutomation'

interface FlowsBrowserPanelProps {
  platforms: Platform[]
  flows: Flow[]
  selectedFlowIds: Set<string>
  onToggleFlow: (flowId: string) => void
  onTogglePlatform: (platformSlug: string) => void
  onViewFlow: (flow: Flow) => void
  settings?: AdvancedSettings
}

export default function FlowsBrowserPanel({
  platforms,
  flows,
  selectedFlowIds,
  onToggleFlow,
  onTogglePlatform,
  onViewFlow,
  settings
}: FlowsBrowserPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set())

  // Apply visibility filters
  const visiblePlatforms = useMemo(() => {
    if (!settings?.enableVisibilityFiltering) return platforms
    if (!settings?.hiddenPlatforms || settings.hiddenPlatforms.length === 0) return platforms
    return platforms.filter(p => !settings.hiddenPlatforms.includes(p.slug))
  }, [platforms, settings?.hiddenPlatforms, settings?.enableVisibilityFiltering])

  const visibleFlows = useMemo(() => {
    if (!settings?.enableVisibilityFiltering) return flows

    let filtered = flows

    // Filter by hidden platforms (hide flows belonging to hidden platforms)
    if (settings?.hiddenPlatforms && settings.hiddenPlatforms.length > 0) {
      filtered = filtered.filter(f => !settings.hiddenPlatforms.includes(f.platform))
    }

    // Filter by hidden flows
    if (settings?.hiddenFlows && settings.hiddenFlows.length > 0) {
      filtered = filtered.filter(f => !settings.hiddenFlows.includes(f.slug))
    }

    return filtered
  }, [flows, settings?.hiddenFlows, settings?.hiddenPlatforms, settings?.enableVisibilityFiltering])

  // Filter flows by search query
  const filteredFlows = useMemo(() => {
    if (!searchQuery.trim()) return visibleFlows

    const query = searchQuery.toLowerCase()
    return visibleFlows.filter(
      (flow) =>
        flow.name.toLowerCase().includes(query) || flow.slug.toLowerCase().includes(query)
    )
  }, [visibleFlows, searchQuery])

  // Group flows by platform
  const flowsByPlatform = useMemo(() => {
    const groups: Record<string, Flow[]> = {}
    filteredFlows.forEach((flow) => {
      if (!groups[flow.platform]) {
        groups[flow.platform] = []
      }
      groups[flow.platform].push(flow)
    })
    return groups
  }, [filteredFlows])

  // Get default (best) flow for a platform using intelligent scoring
  const getDefaultFlow = (platformFlows: Flow[]): Flow | undefined => {
    if (platformFlows.length === 0) return undefined

    const scored = platformFlows.map((flow) => {
      const name = (flow.name + ' ' + flow.slug).toLowerCase()
      let score = 0

      // Avoid these types of flows
      if (name.includes('login') || name.includes('inspect')) score -= 10

      // Prefer these keywords
      if (name.includes('full')) score += 5
      if (name.includes('sante')) score += 5
      if (name.includes('select')) score += 3
      if (name.includes('pro')) score += 3
      if (name.includes('slsis')) score += 5

      return { flow, score }
    })

    scored.sort((a, b) => b.score - a.score)
    return scored[0]?.flow || platformFlows[0]
  }

  // Get platform checkbox state (for indeterminate logic)
  const getPlatformCheckboxState = (platformSlug: string) => {
    const platformFlows = flowsByPlatform[platformSlug] || []
    const selectedCount = platformFlows.filter(f => selectedFlowIds.has(f.slug)).length

    return {
      checked: selectedCount === platformFlows.length && platformFlows.length > 0,
      indeterminate: selectedCount > 0 && selectedCount < platformFlows.length
    }
  }

  const toggleExpanded = (platformSlug: string) => {
    const newExpanded = new Set(expandedPlatforms)
    if (newExpanded.has(platformSlug)) {
      newExpanded.delete(platformSlug)
    } else {
      newExpanded.add(platformSlug)
    }
    setExpandedPlatforms(newExpanded)
  }

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Flows par Plateforme</h3>
        <div className="text-sm text-neutral-500">
          {selectedFlowIds.size} / {flows.length} sélectionnés
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          size={16}
        />
        <input
          type="text"
          placeholder="Rechercher un flow..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Platform list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {visiblePlatforms.length === 0 ? (
          <div className="text-sm text-neutral-500 text-center py-8">
            {settings?.hiddenPlatforms && settings.hiddenPlatforms.length > 0
              ? 'Toutes les plateformes sont masquées'
              : 'Aucune plateforme disponible'}
          </div>
        ) : (
          visiblePlatforms.map((platform) => {
            const platformFlows = flowsByPlatform[platform.slug] || []
            const isExpanded = expandedPlatforms.has(platform.slug)
            const checkboxState = getPlatformCheckboxState(platform.slug)
            const defaultFlow = getDefaultFlow(platformFlows)

            return (
              <div
                key={platform.slug}
                className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden"
              >
                {/* Platform header */}
                <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800">
                  <input
                    type="checkbox"
                    checked={checkboxState.checked}
                    ref={(el) => {
                      if (el) el.indeterminate = checkboxState.indeterminate
                    }}
                    onChange={() => onTogglePlatform(platform.slug)}
                    className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                  />

                  <button
                    onClick={() => toggleExpanded(platform.slug)}
                    className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                  >
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{platform.name}</div>
                    {defaultFlow && (
                      <div className="text-xs text-neutral-500 truncate mt-0.5">
                        Défaut: {defaultFlow.name}
                      </div>
                    )}
                  </div>

                  {/* Credential badge */}
                  {platform.has_creds ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                      <CheckCircle size={12} />
                      OK
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-medium">
                      <AlertCircle size={12} />
                      Manquant
                    </div>
                  )}

                  <span className="text-xs text-neutral-500 flex-shrink-0">
                    {platformFlows.length} flow{platformFlows.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Flows list (when expanded) */}
                {isExpanded && platformFlows.length > 0 && (
                  <div className="px-3 pb-3 pt-2 pl-8 space-y-2 bg-white dark:bg-neutral-900">
                    {platformFlows.map((flow) => {
                      const isDefault = flow.slug === defaultFlow?.slug
                      const isSelected = selectedFlowIds.has(flow.slug)

                      return (
                        <div
                          key={flow.slug}
                          className={`flex items-center gap-3 p-2 rounded border transition-colors ${
                            isDefault
                              ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950'
                              : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleFlow(flow.slug)}
                            className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-sm truncate">{flow.name}</div>
                              {isDefault && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-200 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex-shrink-0">
                                  Défaut
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-neutral-500 mt-0.5">{flow.slug}</div>
                          </div>

                          <button
                            onClick={() => onViewFlow(flow)}
                            className="ml-3 px-3 py-1.5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex-shrink-0 flex items-center gap-1.5"
                          >
                            <Eye size={14} />
                            Voir
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* No flows message */}
                {isExpanded && platformFlows.length === 0 && (
                  <div className="px-3 pb-3 pt-2 pl-12 text-xs text-neutral-500">
                    Aucun flow disponible
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {searchQuery && filteredFlows.length < flows.length && (
        <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 text-center">
          {filteredFlows.length} sur {flows.length} flows affichés
        </div>
      )}
    </div>
  )
}
