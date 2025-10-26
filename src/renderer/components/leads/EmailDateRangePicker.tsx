/**
 * EmailDateRangePicker - Sélecteur de période pour l'import d'emails
 *
 * Permet de choisir :
 * - Presets (7, 15, 30, 60, 90, 365 jours)
 * - Plage personnalisée (future feature)
 */

import React from 'react'

interface EmailDateRangePickerProps {
  selectedDays: number
  onDaysChange: (days: number) => void
  disabled?: boolean
}

const PRESET_OPTIONS = [
  { label: '7 jours', value: 7 },
  { label: '15 jours', value: 15 },
  { label: '30 jours', value: 30 },
  { label: '60 jours', value: 60 },
  { label: '90 jours', value: 90 },
  { label: '1 an (dev)', value: 365 }
]

export function EmailDateRangePicker({
  selectedDays,
  onDaysChange,
  disabled = false
}: EmailDateRangePickerProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Période de récupération
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onDaysChange(option.value)}
              disabled={disabled}
              className={`
                px-3 py-2 text-sm font-medium rounded-md border transition-colors
                ${
                  selectedDays === option.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400">
        Les emails des {selectedDays} derniers jours seront récupérés
        {selectedDays === 365 && ' (limité en production)'}
      </div>
    </div>
  )
}
