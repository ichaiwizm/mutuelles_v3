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
      <div className="space-y-6">
        {/* Section 1: Mode d'exécution */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Settings size={16} />
            Mode d'exécution
          </h3>
          <div className="space-y-4">
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
                <option value="headless-minimized">Fenêtre minimisée (faux headless)</option>
                <option value="visible">Fenêtre visible</option>
              </select>
              <p className="text-xs text-neutral-500 mt-1">
                Headless minimisé permet d'ouvrir la fenêtre pendant l'exécution
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Après exécution */}
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <h3 className="text-sm font-semibold mb-3">Après exécution</h3>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.keepBrowserOpen}
                  onChange={(e) => updateSetting('keepBrowserOpen', e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium">Garder le navigateur ouvert</div>
                  <div className="text-xs text-neutral-500">
                    Ne pas fermer le navigateur après l'exécution
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Gestion des erreurs */}
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <h3 className="text-sm font-semibold mb-3">Gestion des erreurs</h3>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.retryFailed}
                  onChange={(e) => updateSetting('retryFailed', e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium">Réessayer en cas d'erreur</div>
                  <div className="text-xs text-neutral-500">
                    Relancer automatiquement les exécutions échouées
                  </div>
                </div>
              </label>
            </div>

            {localSettings.retryFailed && (
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Nombre maximal de tentatives
                </label>
                <select
                  value={localSettings.maxRetries}
                  onChange={(e) => updateSetting('maxRetries', parseInt(e.target.value) as 1 | 2 | 3)}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 tentative</option>
                  <option value={2}>2 tentatives</option>
                  <option value={3}>3 tentatives</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Interface */}
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <h3 className="text-sm font-semibold mb-3">Interface</h3>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.showPreviewBeforeRun}
                  onChange={(e) => updateSetting('showPreviewBeforeRun', e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium">Afficher la preview avant lancement</div>
                  <div className="text-xs text-neutral-500">
                    Confirmer la matrice d'exécution avant de démarrer
                  </div>
                </div>
              </label>
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
                Nombre d'exécutions simultanées (1-15)
              </p>
            </div>
          </div>
        </div>

        {/* Visibility Settings */}
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Eye size={16} />
            Visibilité
          </h3>
          <p className="text-xs text-neutral-500 mb-3">
            Masquer des plateformes ou flows pour simplifier l'interface
          </p>

          {/* Platform visibility */}
          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium">Plateformes</label>
            <div className="max-h-40 overflow-y-auto space-y-1 border border-neutral-200 dark:border-neutral-700 rounded-md p-2">
              {platforms.length === 0 ? (
                <div className="text-xs text-neutral-500 text-center py-2">
                  Aucune plateforme disponible
                </div>
              ) : (
                platforms.map((platform) => {
                  const isHidden = localSettings.hiddenPlatforms.includes(platform.slug)
                  return (
                    <label
                      key={platform.slug}
                      className="flex items-center gap-2 p-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isHidden}
                        onChange={() => togglePlatformVisibility(platform.slug)}
                        className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                      />
                      {isHidden ? <EyeOff size={14} className="text-neutral-400" /> : <Eye size={14} className="text-neutral-600" />}
                      <span className="text-sm flex-1">{platform.name}</span>
                      {isHidden && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400">
                          Masqué
                        </span>
                      )}
                    </label>
                  )
                })
              )}
            </div>
          </div>

          {/* Flow visibility */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Flows</label>
            <div className="max-h-60 overflow-y-auto space-y-1 border border-neutral-200 dark:border-neutral-700 rounded-md p-2">
              {flows.length === 0 ? (
                <div className="text-xs text-neutral-500 text-center py-2">
                  Aucun flow disponible
                </div>
              ) : (
                flows.map((flow) => {
                  const isHidden = localSettings.hiddenFlows.includes(flow.slug)
                  return (
                    <label
                      key={flow.slug}
                      className="flex items-center gap-2 p-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isHidden}
                        onChange={() => toggleFlowVisibility(flow.slug)}
                        className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                      />
                      {isHidden ? <EyeOff size={14} className="text-neutral-400" /> : <Eye size={14} className="text-neutral-600" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{flow.name}</div>
                        <div className="text-xs text-neutral-500 truncate">{flow.platform}</div>
                      </div>
                      {isHidden && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 flex-shrink-0">
                          Masqué
                        </span>
                      )}
                    </label>
                  )
                })
              )}
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
