import React from 'react'
import { Settings, Minus, Plus } from 'lucide-react'
import type { AdvancedSettings } from '../../../hooks/useAutomation'

interface SettingsExecutionSectionProps {
  settings: AdvancedSettings
  onUpdateSetting: <K extends keyof AdvancedSettings>(
    key: K,
    value: AdvancedSettings[K]
  ) => void
}

export default function SettingsExecutionSection({
  settings,
  onUpdateSetting
}: SettingsExecutionSectionProps) {
  return (
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
              value={settings.mode}
              onChange={(e) => onUpdateSetting('mode', e.target.value as any)}
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
              max={10}
              value={settings.concurrency}
              onChange={(e) => onUpdateSetting('concurrency', Math.max(1, Math.min(10, parseInt(e.target.value) || 4)))}
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Exécutions simultanées (1-10, recommandé: 4)
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
                checked={settings.keepBrowserOpen}
                onChange={(e) => onUpdateSetting('keepBrowserOpen', e.target.checked)}
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
                checked={settings.showPreviewBeforeRun}
                onChange={(e) => onUpdateSetting('showPreviewBeforeRun', e.target.checked)}
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
                  checked={settings.retryFailed}
                  onChange={(e) => onUpdateSetting('retryFailed', e.target.checked)}
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
                    onClick={() => onUpdateSetting('maxRetries', Math.max(1, settings.maxRetries - 1))}
                    disabled={settings.maxRetries <= 1}
                    className="w-6 h-6 flex items-center justify-center rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{settings.maxRetries}</span>
                  <button
                    type="button"
                    onClick={() => onUpdateSetting('maxRetries', Math.min(5, settings.maxRetries + 1))}
                    disabled={settings.maxRetries >= 5}
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
    </div>
  )
}
