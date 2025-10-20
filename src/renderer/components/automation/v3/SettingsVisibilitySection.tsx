import React, { useState } from 'react'
import { Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react'
import type { AdvancedSettings, Platform, Flow } from '../../../hooks/useAutomation'

interface SettingsVisibilitySectionProps {
  settings: AdvancedSettings
  platforms: Platform[]
  flows: Flow[]
  onUpdateSetting: <K extends keyof AdvancedSettings>(
    key: K,
    value: AdvancedSettings[K]
  ) => void
}

export default function SettingsVisibilitySection({
  settings,
  platforms,
  flows,
  onUpdateSetting
}: SettingsVisibilitySectionProps) {
  const [collapsedPlatforms, setCollapsedPlatforms] = useState<Set<string>>(new Set())

  const togglePlatformCollapse = (platformSlug: string) => {
    setCollapsedPlatforms(prev => {
      const next = new Set(prev)
      if (next.has(platformSlug)) {
        next.delete(platformSlug)
      } else {
        next.add(platformSlug)
      }
      return next
    })
  }

  const getPlatformFlows = (platformSlug: string) => {
    return flows.filter(f => f.platform === platformSlug)
  }

  const isPlatformHidden = (platformSlug: string) => {
    const platformFlows = getPlatformFlows(platformSlug)
    const hiddenCount = platformFlows.filter(f => settings.hiddenFlows.includes(f.slug)).length
    return hiddenCount === platformFlows.length
  }

  const isPlatformIndeterminate = (platformSlug: string) => {
    const platformFlows = getPlatformFlows(platformSlug)
    const hiddenCount = platformFlows.filter(f => settings.hiddenFlows.includes(f.slug)).length
    return hiddenCount > 0 && hiddenCount < platformFlows.length
  }

  const togglePlatformVisibility = (platformSlug: string) => {
    const platformFlows = getPlatformFlows(platformSlug)
    const isHidden = isPlatformHidden(platformSlug)

    const newHiddenFlows = [...settings.hiddenFlows]
    platformFlows.forEach(flow => {
      const index = newHiddenFlows.indexOf(flow.slug)
      if (isHidden) {
        // Show all flows
        if (index !== -1) {
          newHiddenFlows.splice(index, 1)
        }
      } else {
        // Hide all flows
        if (index === -1) {
          newHiddenFlows.push(flow.slug)
        }
      }
    })

    onUpdateSetting('hiddenFlows', newHiddenFlows)
  }

  const toggleFlowVisibility = (flowSlug: string) => {
    const newHiddenFlows = settings.hiddenFlows.includes(flowSlug)
      ? settings.hiddenFlows.filter(slug => slug !== flowSlug)
      : [...settings.hiddenFlows, flowSlug]
    onUpdateSetting('hiddenFlows', newHiddenFlows)
  }

  const hideAll = () => {
    onUpdateSetting('hiddenFlows', flows.map(f => f.slug))
  }

  const showAll = () => {
    onUpdateSetting('hiddenFlows', [])
  }

  return (
    <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Eye size={16} />
          Filtrage de visibilité
        </h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-neutral-600 dark:text-neutral-400">Activer</span>
          <input
            type="checkbox"
            checked={settings.enableVisibilityFiltering}
            onChange={(e) => onUpdateSetting('enableVisibilityFiltering', e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          />
        </label>
      </div>

      {settings.enableVisibilityFiltering && (
        <>
          <p className="text-xs text-neutral-500 mb-3">
            Masquer des flows pour simplifier l'interface du sélecteur
          </p>

          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={hideAll}
              className="px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              Tout masquer
            </button>
            <button
              type="button"
              onClick={showAll}
              className="px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              Tout afficher
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1 border border-neutral-200 dark:border-neutral-700 rounded-md p-2 bg-neutral-50/50 dark:bg-neutral-900/50">
            {platforms.length === 0 ? (
              <div className="text-xs text-neutral-500 text-center py-2">
                Aucune plateforme
              </div>
            ) : (
              platforms.map((platform) => {
                const platformFlows = getPlatformFlows(platform.slug)
                const isCollapsed = collapsedPlatforms.has(platform.slug)
                const isHidden = isPlatformHidden(platform.slug)
                const isIndeterminate = isPlatformIndeterminate(platform.slug)

                return (
                  <div key={platform.slug} className="space-y-1">
                    {/* Platform header */}
                    <div className="flex items-center gap-1.5 p-1.5 hover:bg-white dark:hover:bg-neutral-800 rounded transition-colors">
                      <button
                        type="button"
                        onClick={() => togglePlatformCollapse(platform.slug)}
                        className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
                      >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <label className="flex items-center gap-2 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isHidden}
                          ref={(el) => {
                            if (el) el.indeterminate = isIndeterminate
                          }}
                          onChange={() => togglePlatformVisibility(platform.slug)}
                          className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                        />
                        {isHidden ? (
                          <EyeOff size={13} className="text-neutral-400 flex-shrink-0" />
                        ) : (
                          <Eye size={13} className="text-neutral-600 flex-shrink-0" />
                        )}
                        <span className="text-xs font-medium flex-1 truncate">{platform.name}</span>
                        <span className="text-[10px] text-neutral-400">
                          {platformFlows.length} flow{platformFlows.length > 1 ? 's' : ''}
                        </span>
                      </label>
                    </div>

                    {/* Platform flows */}
                    {!isCollapsed && platformFlows.length > 0 && (
                      <div className="ml-6 space-y-0.5">
                        {platformFlows.map((flow) => {
                          const isFlowHidden = settings.hiddenFlows.includes(flow.slug)
                          return (
                            <label
                              key={flow.slug}
                              className="flex items-center gap-2 p-1.5 hover:bg-white dark:hover:bg-neutral-800 rounded cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isFlowHidden}
                                onChange={() => toggleFlowVisibility(flow.slug)}
                                className="w-3 h-3 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                              />
                              {isFlowHidden ? (
                                <EyeOff size={12} className="text-neutral-400 flex-shrink-0" />
                              ) : (
                                <Eye size={12} className="text-neutral-600 flex-shrink-0" />
                              )}
                              <span className="text-xs flex-1 truncate">{flow.name}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
