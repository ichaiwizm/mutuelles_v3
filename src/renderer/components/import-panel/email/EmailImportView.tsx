/**
 * EmailImportView - Vue d'import des emails (leads potentiels)
 *
 * Interface simplifiée:
 * - Auth prompt compact si non connecté
 * - Bouton "Rafraîchir" simple
 * - Progress indicator
 * - Liste des leads potentiels uniquement
 * - Action bar pour conversion
 */

import React, { useState, useEffect } from 'react'
import { EmailList } from './EmailList'
import { LeadConversionModal } from './conversion/LeadConversionModal'
import { useEmailToLead } from '../../../hooks/useEmailToLead'
import type { EmailMessage, EmailImportProgress, AuthStatus } from '../../../../shared/types/email'

const PROGRESS_MESSAGES: Record<string, string> = {
  authenticating: 'Authentification...',
  fetching: 'Récupération des emails...',
  processing: 'Analyse des leads...',
  completed: 'Terminé',
  error: 'Erreur',
  default: 'Démarrage...'
}

interface EmailImportViewProps {
  // État auth
  authStatus: AuthStatus
  isAuthenticating: boolean

  // État import
  isImporting: boolean
  importProgress: EmailImportProgress | null

  // Données
  potentialLeads: EmailMessage[]
  cacheTimestamp: number | null

  // Actions
  onStartAuth: () => Promise<void>
  onRefresh: () => Promise<void>
}

export function EmailImportView({
  authStatus,
  isAuthenticating,
  isImporting,
  importProgress,
  potentialLeads,
  cacheTimestamp,
  onStartAuth,
  onRefresh
}: EmailImportViewProps) {
  const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([])
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [selectedEmailsForModal, setSelectedEmailsForModal] = useState<EmailMessage[]>([])

  const isAuthenticated = authStatus === 'authenticated'

  // Email to lead hook
  const {
    isParsing,
    isCreating,
    enrichedLeads,
    parseEmails,
    createLeads,
    reset: resetEmailToLead
  } = useEmailToLead()

  // ✅ AUTO-SELECT: Sélectionner automatiquement tous les emails après refresh
  useEffect(() => {
    if (potentialLeads.length > 0) {
      const allIds = potentialLeads.map((email) => email.id)
      setSelectedEmailIds(allIds)
      console.log(`[Auto-select] ${allIds.length} emails sélectionnés automatiquement`)
    }
  }, [potentialLeads])

  // Formater le timestamp du cache
  const formatCacheTime = (timestamp: number | null): string => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `Il y a ${diffHours}h`
    const diffDays = Math.floor(diffHours / 24)
    return `Il y a ${diffDays}j`
  }

  const handleConvertSelected = async () => {
    // Get selected emails
    const selectedEmails = potentialLeads.filter((email) =>
      selectedEmailIds.includes(email.id)
    )

    if (selectedEmails.length === 0) {
      alert('Aucun email sélectionné')
      return
    }

    // Store selected emails for modal (for debug button)
    setSelectedEmailsForModal(selectedEmails)

    // Parse emails
    await parseEmails(selectedEmails)

    // Open preview modal
    setIsPreviewModalOpen(true)
  }

  const handleConfirmCreation = async (selectedLeads: any[]) => {
    // Create leads
    await createLeads(selectedLeads)

    // Close modal
    setIsPreviewModalOpen(false)

    // Reset selection
    setSelectedEmailIds([])

    // Reset email to lead state
    resetEmailToLead()

    // Refresh emails list (optional)
    // onRefresh()
  }

  const handleClosePreviewModal = () => {
    setIsPreviewModalOpen(false)
    resetEmailToLead()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Auth prompt compact (si pas connecté) */}
      {!isAuthenticated && (
        <div className="mx-6 my-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Connectez Gmail
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Pour importer vos leads automatiquement
                </p>
              </div>
            </div>
            <button
              onClick={onStartAuth}
              disabled={isAuthenticating}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isAuthenticating ? 'Connexion...' : 'Connecter'}
            </button>
          </div>
        </div>
      )}

      {/* Bouton rafraîchir + indicateur cache (si connecté) */}
      {isAuthenticated && !isImporting && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <button
              onClick={onRefresh}
              disabled={isImporting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Rafraîchir la liste des leads potentiels"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Rafraîchir les leads
            </button>

            {/* Indicateur cache */}
            {cacheTimestamp && potentialLeads.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span title={`Dernière mise à jour : ${new Date(cacheTimestamp).toLocaleString('fr-FR')}`}>
                  {formatCacheTime(cacheTimestamp)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress indicator */}
      {isImporting && importProgress && (
        <div className="px-6 py-8 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 mb-4">
              <svg className="animate-spin h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>

            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
              {importProgress.phase
                ? PROGRESS_MESSAGES[importProgress.phase] || PROGRESS_MESSAGES.default
                : PROGRESS_MESSAGES.default}
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {importProgress.message || 'Veuillez patienter'}
            </p>

            {importProgress.total && importProgress.current && (
              <div className="w-full max-w-md">
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

      {/* Liste des emails (leads uniquement) */}
      <div className="flex-1 overflow-y-auto">
        <EmailList
          emails={potentialLeads}
          selectedEmailIds={selectedEmailIds}
          onSelectionChange={setSelectedEmailIds}
        />
      </div>

      {/* Action bar sticky (si sélection) */}
      {selectedEmailIds.length > 0 && (
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedEmailIds([])}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Annuler la sélection
            </button>
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedEmailIds.length} sélectionné{selectedEmailIds.length > 1 ? 's' : ''}
            </span>
          </div>

          <button
            onClick={handleConvertSelected}
            disabled={isParsing}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isParsing ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyse en cours...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Convertir en leads
              </>
            )}
          </button>
        </div>
      )}

      {/* Lead Conversion Modal */}
      <LeadConversionModal
        isOpen={isPreviewModalOpen}
        leads={enrichedLeads}
        emails={selectedEmailsForModal}
        isCreating={isCreating}
        onClose={handleClosePreviewModal}
        onCreate={handleConfirmCreation}
      />
    </div>
  )
}
