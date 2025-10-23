import React, { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, AlertCircle, Eye } from 'lucide-react'
import type { Platform, Flow } from '../../../hooks/useAutomation'

interface FlowPlatformListProps {
  platforms: Platform[]
  flowsByPlatform: Record<string, Flow[]>
  selectedFlowIds: Set<string>
  onToggleFlow: (flowId: string) => void
  onTogglePlatform: (platformSlug: string) => void
  onViewFlow: (flow: Flow) => void
  getDefaultFlow: (platformFlows: Flow[]) => Flow | undefined
  hiddenButSelectedFlows: Flow[]
}

export default function FlowPlatformList({
  platforms,
  flowsByPlatform,
  selectedFlowIds,
  onToggleFlow,
  onTogglePlatform,
  onViewFlow,
  getDefaultFlow,
  hiddenButSelectedFlows
}: FlowPlatformListProps) {
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set())

  const toggleExpanded = (platformSlug: string) => {
    const newExpanded = new Set(expandedPlatforms)
    if (newExpanded.has(platformSlug)) {
      newExpanded.delete(platformSlug)
    } else {
      newExpanded.add(platformSlug)
    }
    setExpandedPlatforms(newExpanded)
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

  return (
    <>
      {/* Warning: Hidden but selected flows */}
      {hiddenButSelectedFlows.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1 flex items-center gap-1.5">
                <AlertCircle size={14} className="text-amber-700 dark:text-amber-300" />
                Flows cachés sélectionnés
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-300">
                {hiddenButSelectedFlows.length} flow{hiddenButSelectedFlows.length > 1 ? 's' : ''} caché{hiddenButSelectedFlows.length > 1 ? 's' : ''} {hiddenButSelectedFlows.length > 1 ? 'sont encore sélectionnés' : 'est encore sélectionné'} :
                {' '}
                <span className="font-medium">
                  {hiddenButSelectedFlows.map(f => f.name).join(', ')}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                hiddenButSelectedFlows.forEach(flow => onToggleFlow(flow.slug))
              }}
              className="px-3 py-1.5 text-xs font-medium bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 rounded hover:bg-amber-300 dark:hover:bg-amber-800 transition-colors flex-shrink-0"
            >
              Désélectionner
            </button>
          </div>
        </div>
      )}

      {/* Platform list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {platforms.length === 0 ? (
          <div className="text-sm text-neutral-500 text-center py-8">
            Aucune plateforme disponible
          </div>
        ) : (
          platforms.map((platform) => {
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
    </>
  )
}
