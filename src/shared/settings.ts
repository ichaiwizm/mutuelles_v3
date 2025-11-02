export type Theme = 'light' | 'dark'

export type AdvancedSettings = {
  mode: 'headless' | 'headless-minimized' | 'visible'
  keepBrowserOpen: boolean
  concurrency: number
  showPreviewBeforeRun: boolean
  retryFailed: boolean
  maxRetries: number
  enableVisibilityFiltering: boolean
  hiddenPlatforms: string[]
  hiddenFlows: string[]
}

export const DEFAULT_AUTOMATION_SETTINGS: AdvancedSettings = {
  mode: 'headless-minimized',
  keepBrowserOpen: false,
  concurrency: 3,
  showPreviewBeforeRun: true,
  retryFailed: true,
  maxRetries: 2,
  enableVisibilityFiltering: true,
  hiddenPlatforms: [],
  hiddenFlows: ['alptis_login_hl', 'swisslifeone_login', 'swisslifeone_slsis_inspect']
}

export type SettingKey = 'theme' | 'chrome_path' | 'automation-settings'

export type Settings = {
  theme?: Theme
  chrome_path?: string
  'automation-settings'?: AdvancedSettings
}
