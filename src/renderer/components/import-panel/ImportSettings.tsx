/**
 * ImportSettings - Popover de paramètres pour l'import
 *
 * Contient:
 * - Période de récupération (date range)
 * - Option automation (UI only)
 * - Déconnexion du compte Gmail
 */

import React, { useState, useEffect } from 'react'
import { EmailDateRangePicker } from './email/EmailDateRangePicker'
import { KnownSendersManager } from './email/KnownSendersManager'
import type { KnownSender } from '../../../shared/types/email'

interface ImportSettingsProps {
  // Date range
  selectedDays: number
  onDaysChange: (days: number) => void

  // Account
  email: string | null
  emailConfigId?: number
  onDisconnect: () => void
  isDisconnecting?: boolean
}

export function ImportSettings({
  selectedDays,
  onDaysChange,
  email,
  emailConfigId,
  onDisconnect,
  isDisconnecting = false
}: ImportSettingsProps) {
  const [knownSenders, setKnownSenders] = useState<KnownSender[]>([])

  useEffect(() => {
    if (emailConfigId) {
      loadKnownSenders()
    }
  }, [emailConfigId])

  const loadKnownSenders = async () => {
    if (!emailConfigId) return
    try {
      const result = await window.api.email.getConfig(emailConfigId)
      if (result.success && result.data) {
        setKnownSenders(result.data.knownSenders || [])
      }
    } catch (error) {
      console.error('Erreur chargement known senders:', error)
    }
  }

  const handleUpdateSenders = async (senders: KnownSender[]) => {
    if (!emailConfigId) return
    try {
      await window.api.email.updateKnownSenders({
        configId: emailConfigId,
        knownSenders: senders
      })
      setKnownSenders(senders)
    } catch (error) {
      console.error('Erreur mise à jour senders:', error)
      alert('Erreur lors de la mise à jour')
    }
  }

  const handleAnalyze = async () => {
    if (!emailConfigId) return
    try {
      const result = await window.api.email.analyzeSenders(emailConfigId)
      if (result.success && result.data && result.data.length > 0) {
        // Ajouter directement tous les expéditeurs avec ≥2 occurrences
        const newSenders = result.data.map((s: any) => ({
          pattern: s.pattern,
          type: s.type,
          bonus: 50
        }))
        const allSenders = [...knownSenders, ...newSenders]
        await handleUpdateSenders(allSenders)
        alert(`✓ ${result.data.length} expéditeur(s) ajouté(s) automatiquement`)
      } else {
        alert('Aucun expéditeur fréquent trouvé')
      }
    } catch (error) {
      console.error('Erreur analyse:', error)
      alert('Erreur lors de l\'analyse')
    }
  }

  return (
    <div className="space-y-5">
      {/* Période de récupération */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
          Période de récupération
        </label>
        <EmailDateRangePicker
          selectedDays={selectedDays}
          onDaysChange={onDaysChange}
        />
      </div>

      {/* Expéditeurs connus */}
      {emailConfigId && (
        <>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              Expéditeurs de confiance
            </label>
            <KnownSendersManager
              knownSenders={knownSenders}
              onUpdate={handleUpdateSenders}
              onAnalyze={handleAnalyze}
            />
          </div>
        </>
      )}

      {/* Compte Gmail */}
      {email && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Compte Gmail
          </label>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {email}
            </span>
            <button
              onClick={onDisconnect}
              disabled={isDisconnecting}
              className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
            >
              {isDisconnecting ? 'Déconnexion...' : 'Déconnecter'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
