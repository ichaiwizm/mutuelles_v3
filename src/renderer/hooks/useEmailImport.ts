/**
 * Hook useEmailImport - Gestion de l'import de leads par email
 *
 * Gère :
 * - Authentification OAuth Google
 * - Récupération des emails
 * - Progression de l'import
 * - État des emails et détection de leads
 */

import { useState, useEffect, useCallback } from 'react'
import type {
  EmailConfig,
  EmailMessage,
  EmailFilters,
  EmailImportResult,
  EmailImportProgress,
  AuthStatus
} from '../../shared/types/email'

const DEFAULT_EMAIL_LIMIT = 100

interface UseEmailImportReturn {
  // État d'authentification
  authStatus: AuthStatus
  emailConfig: EmailConfig | null
  isAuthenticating: boolean

  // État d'import
  isImporting: boolean
  importProgress: EmailImportProgress | null
  error: string | null

  // Emails importés
  emails: EmailMessage[]
  leadsDetected: EmailMessage[]

  // Actions
  startAuth: () => Promise<void>
  fetchEmails: (filters: EmailFilters) => Promise<void>
  revokeAccess: () => Promise<void>
  clearError: () => void
  reset: () => void
}

export function useEmailImport(): UseEmailImportReturn {
  // États
  const [authStatus, setAuthStatus] = useState<AuthStatus>('not_authenticated')
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<EmailImportProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emails, setEmails] = useState<EmailMessage[]>([])

  // Emails détectés comme leads potentiels
  const leadsDetected = emails.filter(email => email.hasLeadPotential)

  /**
   * Vérifie le statut d'authentification au chargement
   */
  useEffect(() => {
    checkAuthStatus()
  }, [])

  // Les emails ne sont plus chargés depuis la DB - ils sont récupérés à la demande

  /**
   * Écoute les événements de progression
   */
  useEffect(() => {
    const cleanup = window.api.email.onImportProgress((progress: EmailImportProgress) => {
      setImportProgress(progress)

      // Quand terminé ou en erreur, arrêter l'import
      if (progress.phase === 'completed' || progress.phase === 'error') {
        setIsImporting(false)
        if (progress.phase === 'error') {
          setError(progress.message)
        }
      }
    })

    return cleanup
  }, [])

  /**
   * Vérifie le statut d'authentification
   */
  const checkAuthStatus = useCallback(async () => {
    try {
      const result = await window.api.email.getAuthStatus()
      if (result.success && result.data) {
        setAuthStatus(result.data.status)
        setEmailConfig(result.data.config || null)
      }
    } catch (err) {
      console.error('Erreur vérification auth status:', err)
    }
  }, [])

  /**
   * Démarre le flow d'authentification OAuth
   */
  const startAuth = useCallback(async () => {
    setIsAuthenticating(true)
    setError(null)

    try {
      const result = await window.api.email.startAuth()

      if (result.success && result.data) {
        // L'authentification est complète
        setAuthStatus('authenticated')
        setEmailConfig(result.data)
        setIsAuthenticating(false)
      } else {
        setError(result.error || 'Erreur lors de l\'authentification')
        setIsAuthenticating(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setIsAuthenticating(false)
    }
  }, [])

  /**
   * Récupère les emails avec les filtres spécifiés
   */
  const fetchEmails = useCallback(async (filters: EmailFilters) => {
    setIsImporting(true)
    setError(null)
    setImportProgress({ phase: 'authenticating', message: 'Démarrage...' })

    try {
      const result = await window.api.email.fetchMessages({
        configId: emailConfig?.id,
        filters
      })

      if (result.success && result.data) {
        setEmails(result.data.messages || [])
        setImportProgress({
          phase: 'completed',
          message: `Import terminé : ${result.data.totalFetched} emails récupérés, ${result.data.leadsDetected} leads détectés`
        })
      } else {
        setError(result.error || 'Erreur lors de la récupération des emails')
        setImportProgress({ phase: 'error', message: result.error || 'Erreur' })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(message)
      setImportProgress({ phase: 'error', message })
    } finally {
      setIsImporting(false)
    }
  }, [emailConfig])

  /**
   * Révoque l'accès et déconnecte
   */
  const revokeAccess = useCallback(async () => {
    if (!emailConfig?.id) return

    try {
      const result = await window.api.email.revokeAccess({ configId: emailConfig.id })

      if (result.success) {
        setAuthStatus('not_authenticated')
        setEmailConfig(null)
        reset()
      } else {
        setError(result.error || 'Erreur lors de la révocation')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }, [emailConfig])

  /**
   * Efface l'erreur
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Réinitialise l'état
   */
  const reset = useCallback(() => {
    setImportProgress(null)
    setEmails([])
    setError(null)
  }, [])

  return {
    // État d'authentification
    authStatus,
    emailConfig,
    isAuthenticating,

    // État d'import
    isImporting,
    importProgress,
    error,

    // Emails
    emails,
    leadsDetected,

    // Actions
    startAuth,
    fetchEmails,
    revokeAccess,
    clearError,
    reset
  }
}
