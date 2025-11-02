/**
 * ImportPanel - Panneau latéral coulissant pour l'import de leads
 *
 * Conteneur principal avec:
 * - Header avec bouton settings
 * - Contenu (actuellement: EmailImportView)
 * - Future: Support pour d'autres méthodes (CSV, etc.)
 */

import React, { useEffect, useState, useRef } from 'react'
import { useEmailImport } from '../../hooks/useEmailImport'
import { EmailImportView } from './email/EmailImportView'
import { SettingsModal } from './SettingsModal'

interface ImportPanelProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: () => void
}

export function ImportPanel({ isOpen, onClose, onCreated }: ImportPanelProps) {
  const {
    authStatus,
    emailConfig,
    isAuthenticating,
    isImporting,
    importProgress,
    emails,
    cacheTimestamp,
    error,
    startAuth,
    fetchEmails,
    revokeAccess,
    clearError
  } = useEmailImport()

  // Settings state
  const [selectedDays, setSelectedDays] = useState(30)
  const [showSettings, setShowSettings] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  // Derived state
  const isAuthenticated = authStatus === 'authenticated'

  // Empêcher le scroll du body quand le panel est ouvert (leak-safe)
  const didSetOverflow = useRef(false)

  useEffect(() => {
    if (isOpen && !didSetOverflow.current) {
      document.body.style.overflow = 'hidden'
      didSetOverflow.current = true
    } else if (!isOpen && didSetOverflow.current) {
      document.body.style.overflow = ''
      didSetOverflow.current = false
    }
    return () => {
      if (didSetOverflow.current) {
        document.body.style.overflow = ''
        didSetOverflow.current = false
      }
    }
  }, [isOpen])

  // Persister la période de récupération dans localStorage pour usage global (sans ouvrir les paramètres)
  useEffect(() => {
    const key = 'email_import_days'
    // Charger au premier rendu
    const saved = localStorage.getItem(key)
    if (saved) {
      const days = parseInt(saved, 10)
      if ([1, 7, 15, 30, 60, 90].includes(days)) {
        setSelectedDays(days)
      }
    }
  }, [])

  useEffect(() => {
    const key = 'email_import_days'
    localStorage.setItem(key, String(selectedDays))
  }, [selectedDays])

  // Handler pour récupérer les leads
  const handleFetchLeads = async () => {
    await fetchEmails({ days: selectedDays })
  }

  // Handler pour déconnexion
  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      await revokeAccess()
      setShowSettings(false)
    } finally {
      setIsDisconnecting(false)
    }
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Import de leads
            </h2>

            <div className="flex items-center gap-2">
              {/* Email connecté (compact) */}
              {isAuthenticated && emailConfig && (
                <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">
                  {emailConfig.email}
                </span>
              )}

              {/* Bouton Settings */}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                title="Paramètres"
                aria-label="Paramètres d'import"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Bouton fermer */}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                title="Fermer"
                aria-label="Fermer le panneau d'import"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Affichage erreur */}
          {error && (
            <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
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

          {/* Contenu - Email Import View */}
          <div className="flex-1 overflow-hidden">
            <EmailImportView
              authStatus={authStatus}
              isAuthenticating={isAuthenticating}
              isImporting={isImporting}
              importProgress={importProgress}
              potentialLeads={emails}
              cacheTimestamp={cacheTimestamp}
              onStartAuth={startAuth}
              onRefresh={handleFetchLeads}
              onCreated={() => {
                onCreated && onCreated()
              }}
            />
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        selectedDays={selectedDays}
        onDaysChange={setSelectedDays}
        email={emailConfig?.email || null}
        emailConfigId={emailConfig?.id}
        onDisconnect={handleDisconnect}
        isDisconnecting={isDisconnecting}
      />
    </>
  )
}
