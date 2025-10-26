/**
 * ImportEmailPanel - Panneau latéral coulissant pour l'import de leads par email
 *
 * Slide-over depuis la droite avec le wizard d'import
 */

import React, { useEffect } from 'react'
import { useEmailImport } from '../../hooks/useEmailImport'
import { ImportWizard } from './ImportWizard'

interface ImportEmailPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function ImportEmailPanel({ isOpen, onClose }: ImportEmailPanelProps) {
  const {
    authStatus,
    isAuthenticating,
    isImporting,
    importProgress,
    emails,
    leadsDetected,
    error,
    startAuth,
    fetchEmails,
    clearError
  } = useEmailImport()

  // Empêcher le scroll du body quand le panel est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handler pour lancer l'import avec les jours sélectionnés
  const handleFetchEmails = async (days: number) => {
    await fetchEmails({ days })
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        className={`
          fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Import de leads par email
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Contenu - Wizard */}
          <div className="flex-1 overflow-hidden px-6 py-4">
            {/* Affichage erreur */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      {error}
                    </p>
                  </div>
                  <button
                    onClick={clearError}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Wizard */}
            <ImportWizard
              isAuthenticating={isAuthenticating}
              isImporting={isImporting}
              importProgress={importProgress}
              emails={emails}
              leadsDetected={leadsDetected}
              onStartAuth={startAuth}
              onFetchEmails={handleFetchEmails}
              onClose={onClose}
            />
          </div>
        </div>
      </div>
    </>
  )
}
