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

const STORAGE_KEY_DAYS = 'email_import_days'

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
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeProgress, setAnalyzeProgress] = useState('')

  // Persistance centralisée dans ImportPanel (suppression ici)

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

    setIsAnalyzing(true)
    setAnalyzeProgress('Connexion à Gmail...')

    // Préparer les filtres pour la récupération
    const filters = {
      days: selectedDays
    }

    try {
      setAnalyzeProgress(`Récupération des emails des ${selectedDays} derniers jours...`)

      const result = await window.api.email.analyzeSenders({
        configId: emailConfigId,
        filters
      })

      console.log('[DEBUG] Analyze result:', result)

      if (result.success && result.data && result.data.length > 0) {
        console.log('[DEBUG] Found senders:', result.data)

        setAnalyzeProgress('Analyse des expéditeurs...')

        // Filtrer les emails déjà existants
        const existingEmails = new Set(knownSenders.map(s => s.email.toLowerCase()))
        const newSenders = result.data
          .filter((s: any) => !existingEmails.has(s.email.toLowerCase()))
          .map((s: any) => ({ email: s.email }))

        console.log('[DEBUG] New senders after filter:', newSenders)

        if (newSenders.length > 0) {
          setAnalyzeProgress('Ajout des expéditeurs...')
          const allSenders = [...knownSenders, ...newSenders]
          await handleUpdateSenders(allSenders)

          setAnalyzeProgress('')
          setIsAnalyzing(false)

          alert(`✅ Analyse terminée !\n\n${newSenders.length} expéditeur(s) ajouté(s) automatiquement.\n\nCes emails seront automatiquement détectés comme leads lors des prochains imports.`)
        } else {
          setAnalyzeProgress('')
          setIsAnalyzing(false)
          alert('✓ Analyse terminée\n\nTous les expéditeurs fréquents sont déjà configurés.')
        }
      } else {
        console.log('[DEBUG] No data found or empty result')
        setAnalyzeProgress('')
        setIsAnalyzing(false)
        alert(`ℹ️ Aucun lead détecté\n\nAucun email avec structure de lead trouvé dans les ${selectedDays} derniers jours.\n\nEssayez d'augmenter la période ou vérifiez que vous avez des emails de leads dans votre boîte.`)
      }
    } catch (error) {
      console.error('Erreur analyse:', error)
      setAnalyzeProgress('')
      setIsAnalyzing(false)
      alert('❌ Erreur lors de l\'analyse\n\n' + (error instanceof Error ? error.message : 'Erreur inconnue'))
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
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Cette période sera utilisée pour l'analyse automatique
        </p>
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
              isAnalyzing={isAnalyzing}
            />
          </div>

          {/* Loader avec progression */}
          {isAnalyzing && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  {/* Spinner animé */}
                  <div className="flex-shrink-0">
                    <svg className="animate-spin h-5 w-5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Analyse en cours...
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      {analyzeProgress}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
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
