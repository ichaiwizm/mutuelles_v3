import React from 'react'

interface CivilitySwitchProps {
  value: string
  onChange: (value: string) => void
  error?: string
}

export default function CivilitySwitch({ value, onChange, error }: CivilitySwitchProps) {
  const isMonsieur = value === 'MONSIEUR'

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Civilité
      </label>
      <div className="flex rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 p-0.5">
        <button
          type="button"
          onClick={() => onChange('MONSIEUR')}
          className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${
            isMonsieur
              ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          M.
        </button>
        <button
          type="button"
          onClick={() => onChange('MADAME')}
          className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${
            !isMonsieur
              ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          Mme
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
