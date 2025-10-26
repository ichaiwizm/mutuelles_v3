/**
 * ImportSettings - Popover de paramètres pour l'import
 *
 * Contient:
 * - Période de récupération (date range)
 * - Option automation (UI only)
 * - Déconnexion du compte Gmail
 */

import React from 'react'
import { EmailDateRangePicker } from './email/EmailDateRangePicker'

interface ImportSettingsProps {
  // Date range
  selectedDays: number
  onDaysChange: (days: number) => void

  // Account
  email: string | null
  onDisconnect: () => void
  isDisconnecting?: boolean
}

export function ImportSettings({
  selectedDays,
  onDaysChange,
  email,
  onDisconnect,
  isDisconnecting = false
}: ImportSettingsProps) {
  return (
    <div className="w-80 p-4 space-y-4">
      {/* Header */}
      <div>
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
          Paramètres d'import
        </h3>
      </div>

      {/* Période de récupération */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Période de récupération
        </label>
        <EmailDateRangePicker
          selectedDays={selectedDays}
          onDaysChange={onDaysChange}
        />
      </div>

      {/* Automation (UI only) */}
      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
        <label className="flex items-start gap-3 cursor-not-allowed">
          <input
            type="checkbox"
            checked={false}
            disabled
            className="mt-0.5 h-4 w-4 text-blue-600 rounded border-gray-300 disabled:opacity-50"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Import automatique
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                Prochainement
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Récupère automatiquement les nouveaux leads chaque jour
            </p>
          </div>
        </label>
      </div>

      {/* Separator */}
      <div className="border-t border-gray-200 dark:border-gray-700"></div>

      {/* Compte Gmail */}
      {email && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Compte Gmail
          </h4>
          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
              {email}
            </span>
            <button
              onClick={onDisconnect}
              disabled={isDisconnecting}
              className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ml-2 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDisconnecting ? 'Déconnexion...' : 'Déconnecter'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
