import React from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'light' | 'dark'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

function readSavedTheme(): Theme {
  const saved = (localStorage.getItem('theme') || '').toLowerCase()
  return saved === 'dark' ? 'dark' : 'light'
}

export default function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme>(() => readSavedTheme())

  React.useEffect(() => {
    window.api.settings
      .getTheme()
      .then((t) => t && setTheme(t))
  }, [])

  React.useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('theme', theme)
    window.api.settings.setTheme(theme)
  }, [theme])

  const Icon = theme === 'light' ? Sun : Moon
  const label = theme === 'light' ? 'Clair' : 'Sombre'

  return (
    <button
      title={`Thème : ${label} (cliquer pour changer)`}
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 text-sm"
    >
      <Icon size={16} /> {label}
    </button>
  )
}
