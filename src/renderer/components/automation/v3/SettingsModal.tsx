import React, { useState } from 'react'
import { Settings, Save, RotateCcw, Eye, EyeOff, Minus, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import Modal from '../../Modal'
import type { AdvancedSettings, Platform, Flow } from '../../../hooks/useAutomation'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: AdvancedSettings
  onSave: (settings: AdvancedSettings, newlyHiddenFlows?: string[]) => void
  onReset: () => void
  platforms: Platform[]
  flows: Flow[]
}

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
  onReset,
  platforms,
  flows
}: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<AdvancedSettings>(settings)
  const [collapsedPlatforms, setCollapsedPlatforms] = useState<Set<string>>(new Set())

  // Sync with parent settings when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings)
    }
  }, [isOpen, settings])

  const handleSave = () => {
    // Calculate newly hidden flows (flows that were visible before but are now hidden)
    const newlyHiddenFlows = localSettings.hiddenFlows.filter(
      slug => !settings.hiddenFlows.includes(slug)
    )

    console.log('[SettingsModal] Newly hidden flows:', newlyHiddenFlows)

    onSave(localSettings, newlyHiddenFlows)
    onClose()
  }

  const handleReset = () => {
    onReset()
  }

  const updateSetting = <K extends keyof AdvancedSettings>(
    key: K,
    value: AdvancedSettings[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
  }

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
    const hiddenCount = platformFlows.filter(f => localSettings.hiddenFlows.includes(f.slug)).length
    return hiddenCount === platformFlows.length
  }

  const isPlatformIndeterminate = (platformSlug: string) => {
    const platformFlows = getPlatformFlows(platformSlug)
    const hiddenCount = platformFlows.filter(f => localSettings.hiddenFlows.includes(f.slug)).length
    return hiddenCount > 0 && hiddenCount < platformFlows.length
  }

  const togglePlatformVisibility = (platformSlug: string) => {
    const platformFlows = getPlatformFlows(platformSlug)
    const isHidden = isPlatformHidden(platformSlug)

    const newHiddenFlows = [...localSettings.hiddenFlows]
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

    updateSetting('hiddenFlows', newHiddenFlows)
  }

  const toggleFlowVisibility = (flowSlug: string) => {
    const newHiddenFlows = localSettings.hiddenFlows.includes(flowSlug)
      ? localSettings.hiddenFlows.filter(slug => slug !== flowSlug)
      : [...localSettings.hiddenFlows, flowSlug]
    updateSetting('hiddenFlows', newHiddenFlows)
  }

  const hideAll = () => {
    updateSetting('hiddenFlows', flows.map(f => f.slug))
  }

  const showAll = () => {
    updateSetting('hiddenFlows', [])
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Paramètres avancés"
      size="medium"
    >
      <div className="space-y-5">
        {/* Section 1: Mode d'exécution & Concurrence */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Settings size={16} />
            Configuration
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Mode du navigateur
              </label>
              <select
                value={localSettings.mode}
                onChange={(e) => updateSetting('mode', e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="headless">En arrière-plan (headless)</option>
                <option value="headless-minimized">Fenêtre minimisée</option>
                <option value="visible">Fenêtre visible</option>
              </select>
              <p className="text-xs text-neutral-500 mt-1">
                Mode d'affichage du navigateur
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Concurrence
              </label>
              <input
                type="number"
                min={1}
                max={15}
                value={localSettings.concurrency}
                onChange={(e) => updateSetting('concurrency', Math.max(1, Math.min(15, parseInt(e.target.value) || 6)))}
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Exécutions simultanées (1-15, recommandé: 6)
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Options d'exécution */}
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <h3 className="text-sm font-semibold mb-3">Options d'exécution</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.keepBrowserOpen}
                  onChange={(e) => updateSetting('keepBrowserOpen', e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium">Garder le navigateur ouvert</div>
                  <div className="text-xs text-neutral-500">
                    Ne pas fermer après l'exécution
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.showPreviewBeforeRun}
                  onChange={(e) => updateSetting('showPreviewBeforeRun', e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium">Afficher la preview</div>
                  <div className="text-xs text-neutral-500">
                    Confirmer avant de démarrer
                  </div>
                </div>
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.retryFailed}
                    onChange={(e) => updateSetting('retryFailed', e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Réessayer en cas d'erreur</div>
                    <div className="text-xs text-neutral-500">
                      Relancer automatiquement
                    </div>
                  </div>
                </label>

                <div className="ml-6 mt-2 flex items-center gap-2">
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">Tentatives:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateSetting('maxRetries', Math.max(1, localSettings.maxRetries - 1))}
                      disabled={localSettings.maxRetries <= 1}
                      className="w-6 h-6 flex items-center justify-center rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{localSettings.maxRetries}</span>
                    <button
                      type="button"
                      onClick={() => updateSetting('maxRetries', Math.min(5, localSettings.maxRetries + 1))}
                      disabled={localSettings.maxRetries >= 5}
                      className="w-6 h-6 flex items-center justify-center rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Visibility Settings */}
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
                checked={localSettings.enableVisibilityFiltering}
                onChange={(e) => updateSetting('enableVisibilityFiltering', e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>

          {localSettings.enableVisibilityFiltering && (
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
                              const isFlowHidden = localSettings.hiddenFlows.includes(flow.slug)
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

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <RotateCcw size={16} />
            Réinitialiser
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm font-medium border border-neutral-300 dark:border-neutral-700 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              <Save size={16} />
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
