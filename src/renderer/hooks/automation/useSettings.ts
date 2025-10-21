import { useState, useEffect, useCallback } from 'react'

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
  concurrency: 4,
  showPreviewBeforeRun: true,
  retryFailed: true,
  maxRetries: 2,
  enableVisibilityFiltering: true,
  hiddenPlatforms: [],
  hiddenFlows: ['alptis_login_hl', 'swisslifeone_login', 'swisslifeone_slsis_inspect']
}

const STORAGE_KEY = 'automation-settings'

/**
 * Hook for managing automation settings with localStorage persistence
 *
 * @returns Settings state and update functions
 */
export function useSettings() {
  const [settings, setSettings] = useState<AdvancedSettings>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Merge with defaults to add new keys
        const merged = { ...DEFAULT_SETTINGS, ...parsed }

        // Migration: if enableVisibilityFiltering doesn't exist, use new defaults
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

  // Persist to localStorage when settings change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  // Update settings (partial update supported)
  const updateSettings = useCallback((partial: Partial<AdvancedSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }))
  }, [])

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [])

  return {
    settings,
    updateSettings,
    resetSettings
  }
}
