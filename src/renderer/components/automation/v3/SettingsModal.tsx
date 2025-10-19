import React, { useState } from 'react'
import { Settings, Save, RotateCcw, Eye, EyeOff } from 'lucide-react'
import Modal from '../../Modal'
import type { AdvancedSettings, Platform, Flow } from '../../../hooks/useAutomation'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: AdvancedSettings
  onSave: (settings: AdvancedSettings) => void
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

  // Sync with parent settings when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings)
    }
  }, [isOpen, settings])

  const handleSave = () => {
    onSave(localSettings)
    onClose()
  }

  const handleReset = () => {
    onReset()
    onClose()
  }

  const updateSetting = <K extends keyof AdvancedSettings>(
    key: K,
    value: AdvancedSettings[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
  }

  const togglePlatformVisibility = (platformSlug: string) => {
    const newHiddenPlatforms = localSettings.hiddenPlatforms.includes(platformSlug)
      ? localSettings.hiddenPlatforms.filter(slug => slug !== platformSlug)
      : [...localSettings.hiddenPlatforms, platformSlug]
    updateSetting('hiddenPlatforms', newHiddenPlatforms)
  }

  const toggleFlowVisibility = (flowSlug: string) => {
    const newHiddenFlows = localSettings.hiddenFlows.includes(flowSlug)
      ? localSettings.hiddenFlows.filter(slug => slug !== flowSlug)
      : [...localSettings.hiddenFlows, flowSlug]
    updateSetting('hiddenFlows', newHiddenFlows)
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
                onChange={(e) => updateSetting('concurrency', Math.max(1, Math.min(15, parseInt(e.target.value) || 2)))}
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Exécutions simultanées (1-15)
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

              {localSettings.retryFailed && (
                <div className="ml-6">
                  <select
                    value={localSettings.maxRetries}
                    onChange={(e) => updateSetting('maxRetries', parseInt(e.target.value) as 1 | 2 | 3)}
                    className="w-full px-2 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1 tentative</option>
                    <option value={2}>2 tentatives</option>
                    <option value={3}>3 tentatives</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Visibility Settings */}
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Eye size={16} />
            Visibilité
          </h3>
          <p className="text-xs text-neutral-500 mb-3">
            Masquer des plateformes ou flows pour simplifier l'interface
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* Platform visibility */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Plateformes</label>
              <div className="max-h-48 overflow-y-auto space-y-1 border border-neutral-200 dark:border-neutral-700 rounded-md p-2 bg-neutral-50/50 dark:bg-neutral-900/50">
                {platforms.length === 0 ? (
                  <div className="text-xs text-neutral-500 text-center py-2">
                    Aucune plateforme
                  </div>
                ) : (
                  platforms.map((platform) => {
                    const isHidden = localSettings.hiddenPlatforms.includes(platform.slug)
                    return (
                      <label
                        key={platform.slug}
                        className="flex items-center gap-2 p-1.5 hover:bg-white dark:hover:bg-neutral-800 rounded cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isHidden}
                          onChange={() => togglePlatformVisibility(platform.slug)}
                          className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                        />
                        {isHidden ? <EyeOff size={13} className="text-neutral-400 flex-shrink-0" /> : <Eye size={13} className="text-neutral-600 flex-shrink-0" />}
                        <span className="text-xs flex-1 truncate">{platform.name}</span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>

            {/* Flow visibility */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Flows</label>
              <div className="max-h-48 overflow-y-auto space-y-1 border border-neutral-200 dark:border-neutral-700 rounded-md p-2 bg-neutral-50/50 dark:bg-neutral-900/50">
                {flows.length === 0 ? (
                  <div className="text-xs text-neutral-500 text-center py-2">
                    Aucun flow
                  </div>
                ) : (
                  flows.map((flow) => {
                    const isHidden = localSettings.hiddenFlows.includes(flow.slug)
                    return (
                      <label
                        key={flow.slug}
                        className="flex items-center gap-2 p-1.5 hover:bg-white dark:hover:bg-neutral-800 rounded cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isHidden}
                          onChange={() => toggleFlowVisibility(flow.slug)}
                          className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                        />
                        {isHidden ? <EyeOff size={13} className="text-neutral-400 flex-shrink-0" /> : <Eye size={13} className="text-neutral-600 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{flow.name}</div>
                          <div className="text-[10px] text-neutral-500 truncate leading-tight">{flow.platform}</div>
                        </div>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          </div>
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
