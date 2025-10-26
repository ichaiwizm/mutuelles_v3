/**
 * ImportWizard - Wizard multi-étapes pour l'import de leads
 *
 * Étapes :
 * 1. Choix méthode (Email sélectionné par défaut)
 * 2. Configuration période + option auto (visual only)
 * 3. Authentification Google si nécessaire
 * 4. Progression extraction
 * 5. Résultats avec liste emails
 * 6. Bouton "Importer tout" (disabled, visual only)
 */

import React, { useState } from 'react'
import { EmailDateRangePicker } from './EmailDateRangePicker'
import { EmailListView } from './EmailListView'
import type { EmailMessage, EmailImportProgress } from '../../../shared/types/email'

type WizardStep = 'method' | 'config' | 'auth' | 'progress' | 'results'

interface ImportWizardProps {
  // État du hook useEmailImport
  isAuthenticating: boolean
  isImporting: boolean
  importProgress: EmailImportProgress | null
  emails: EmailMessage[]
  leadsDetected: EmailMessage[]

  // Actions
  onStartAuth: () => Promise<void>
  onFetchEmails: (days: number) => Promise<void>
  onClose: () => void
}

export function ImportWizard({
  isAuthenticating,
  isImporting,
  importProgress,
  emails,
  leadsDetected,
  onStartAuth,
  onFetchEmails,
  onClose
}: ImportWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('method')
  const [selectedDays, setSelectedDays] = useState(30)
  const [autoImportEnabled, setAutoImportEnabled] = useState(false)

  // Gestion des étapes
  const goToConfig = () => setCurrentStep('config')
  const goToAuth = () => setCurrentStep('auth')
  const goToResults = () => setCurrentStep('results')

  const handleStartImport = async () => {
    setCurrentStep('progress')
    await onFetchEmails(selectedDays)
    setCurrentStep('results')
  }

  const handleAuthAndImport = async () => {
    await onStartAuth()
    // Après auth, démarrer l'import automatiquement
    setTimeout(() => handleStartImport(), 1000)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header avec progression */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Import de leads
        </h2>

        {/* Steps indicator */}
        <div className="flex items-center gap-2">
          {['Méthode', 'Config', 'Extraction', 'Résultats'].map((label, idx) => {
            const stepMap: WizardStep[] = ['method', 'config', 'progress', 'results']
            const step = stepMap[idx]
            const isActive = currentStep === step
            const isCompleted = stepMap.indexOf(currentStep) > idx

            return (
              <React.Fragment key={label}>
                {idx > 0 && (
                  <div className={`h-0.5 flex-1 ${isCompleted ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
                )}
                <div
                  className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium
                    ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }
                  `}
                >
                  {idx + 1}
                </div>
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Contenu selon l'étape */}
      <div className="flex-1 overflow-y-auto">
        {/* STEP 1: Choix méthode */}
        {currentStep === 'method' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choisissez une méthode d'import
            </p>

            <div className="space-y-2">
              {/* Email (activé par défaut) */}
              <button
                type="button"
                onClick={goToConfig}
                className="w-full text-left p-4 border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Import par email
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Récupérez automatiquement les leads depuis votre boîte Gmail
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    Recommandé
                  </span>
                </div>
              </button>

              {/* CSV (disabled) */}
              <div className="w-full p-4 border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-lg opacity-50 cursor-not-allowed">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Import CSV
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      Importez vos leads depuis un fichier CSV
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    Prochainement
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Configuration */}
        {currentStep === 'config' && (
          <div className="space-y-6">
            <EmailDateRangePicker
              selectedDays={selectedDays}
              onDaysChange={setSelectedDays}
            />

            {/* Option automatisation (visual only) */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={autoImportEnabled}
                  onChange={(e) => setAutoImportEnabled(e.target.checked)}
                  disabled
                  className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex-1">
                  <label className="font-medium text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                    Automatiser l'import quotidien
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      Prochainement
                    </span>
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Récupère automatiquement les nouveaux leads chaque jour à 9h
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep('method')}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={goToAuth}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Authentification */}
        {currentStep === 'auth' && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Connectez-vous avec Google
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Nous avons besoin d'accéder à vos emails Gmail pour récupérer les leads
              </p>

              <button
                type="button"
                onClick={handleAuthAndImport}
                disabled={isAuthenticating}
                className="px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="font-medium">
                  {isAuthenticating ? 'Authentification...' : 'Se connecter avec Google'}
                </span>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep('config')}
                disabled={isAuthenticating}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Retour
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Progression */}
        {currentStep === 'progress' && (
          <div className="space-y-4">
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 mb-4">
                <svg className="animate-spin h-16 w-16 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>

              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {importProgress?.phase === 'authenticating' && 'Authentification...'}
                {importProgress?.phase === 'fetching' && 'Récupération des emails...'}
                {importProgress?.phase === 'processing' && 'Analyse des emails...'}
                {!importProgress && 'Démarrage...'}
              </h3>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                {importProgress?.message || 'Veuillez patienter'}
              </p>

              {importProgress?.total && importProgress.current && (
                <div className="mt-4 max-w-md mx-auto">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {importProgress.current} / {importProgress.total}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: Résultats */}
        {currentStep === 'results' && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {emails.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Emails récupérés
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {leadsDetected.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Leads potentiels
                </div>
              </div>
            </div>

            {/* Liste des emails */}
            <EmailListView emails={emails} />

            {/* Bouton "Importer tout" (disabled) */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-900 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                disabled
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                title="Prochainement disponible"
              >
                <span>Importer tout ({leadsDetected.length} leads)</span>
                <span className="text-xs bg-blue-500 px-2 py-0.5 rounded">
                  Prochainement
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <button
          type="button"
          onClick={onClose}
          className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
        >
          Fermer
        </button>
      </div>
    </div>
  )
}
