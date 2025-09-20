export type Theme = 'light' | 'dark'

export type SettingKey = 'theme' | 'chrome_path'

export type Settings = {
  theme?: Theme
  chrome_path?: string
}
