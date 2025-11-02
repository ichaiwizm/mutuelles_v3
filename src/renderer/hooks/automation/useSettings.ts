import { useState, useEffect, useCallback } from 'react'
import type { AdvancedSettings } from '../../../shared/settings'
import { DEFAULT_AUTOMATION_SETTINGS } from '../../../shared/settings'
import { createLogger } from '../../services/logger'

const logger = createLogger('useSettings')

/**
 * Hook for managing automation settings with database persistence
 *
 * @returns Settings state and update functions
 */
export function useSettings() {
  const [settings, setSettings] = useState<AdvancedSettings>(DEFAULT_AUTOMATION_SETTINGS)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load settings from database on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const dbSettings = await window.api.settings.getAutomationSettings()
        setSettings(dbSettings)
        setIsLoaded(true)
      } catch (error) {
        logger.error('Failed to load automation settings from DB:', error)
        setSettings(DEFAULT_AUTOMATION_SETTINGS)
        setIsLoaded(true)
      }
    }

    loadSettings()
  }, [])

  // Update settings (partial update supported)
  const updateSettings = useCallback(async (partial: Partial<AdvancedSettings>) => {
    const newSettings = { ...settings, ...partial }
    setSettings(newSettings)

    try {
      await window.api.settings.setAutomationSettings(newSettings)
    } catch (error) {
      logger.error('Failed to save automation settings to DB:', error)
      // Revert on error
      setSettings(settings)
    }
  }, [settings])

  // Reset to defaults
  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_AUTOMATION_SETTINGS)

    try {
      await window.api.settings.setAutomationSettings(DEFAULT_AUTOMATION_SETTINGS)
    } catch (error) {
      logger.error('Failed to reset automation settings in DB:', error)
    }
  }, [])

  return {
    settings,
    updateSettings,
    resetSettings,
    isLoaded
  }
}
