import React, { useState } from 'react'
import { Save, RotateCcw } from 'lucide-react'
import Modal from '../../Modal'
import SettingsExecutionSection from './SettingsExecutionSection'
import SettingsVisibilitySection from './SettingsVisibilitySection'
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Paramètres avancés"
      size="medium"
    >
      <div className="space-y-5">
        {/* Execution Settings */}
        <SettingsExecutionSection
          settings={localSettings}
          onUpdateSetting={updateSetting}
        />

        {/* Visibility Settings */}
        <SettingsVisibilitySection
          settings={localSettings}
          platforms={platforms}
          flows={flows}
          onUpdateSetting={updateSetting}
        />

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
