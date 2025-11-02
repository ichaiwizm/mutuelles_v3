/**
 * Hook useEmailImport - Gestion de l'import de leads par email
 *
 * Gère :
 * - Authentification OAuth Google
 * - Récupération des emails
 * - Progression de l'import
 * - État des emails et détection de leads
 * - Cache localStorage des emails
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

const STORAGE_KEY_EMAILS = 'email_leads_cache'
const STORAGE_KEY_TIMESTAMP = 'email_leads_cache_timestamp'

interface EmailCache {
  emails: EmailMessage[]
  timestamp: number
}

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

  // Cache info
  cacheTimestamp: number | null

  // Actions
  startAuth: () => Promise<void>
  fetchEmails: (filters: EmailFilters) => Promise<void>
  revokeAccess: () => Promise<void>
  clearError: () => void
  reset: () => void
  clearCache: () => void
}

/**
 * Charge les emails depuis localStorage
 */
function loadEmailsFromCache(): EmailMessage[] {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_EMAILS)
    if (cached) {
      const data = JSON.parse(cached) as EmailMessage[]
      return data
    }
  } catch (err) {
    // Ignore cache errors
  }
  return []
}

/**
 * Charge le timestamp du cache
 */
function loadCacheTimestamp(): number | null {
  try {
    const timestamp = localStorage.getItem(STORAGE_KEY_TIMESTAMP)
    if (timestamp) {
      return parseInt(timestamp, 10)
    }
  } catch (err) {
    // Ignore cache errors
  }
  return null
}

/**
 * Sauvegarde les emails dans localStorage
 */
function saveEmailsToCache(emails: EmailMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_EMAILS, JSON.stringify(emails))
    localStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString())
  } catch (err) {
    // Ignore cache errors
  }
}

/**
 * Efface le cache localStorage
 */
function clearEmailCache(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_EMAILS)
    localStorage.removeItem(STORAGE_KEY_TIMESTAMP)
  } catch (err) {
    // Ignore cache errors
  }
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
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null)

  // Emails détectés comme leads potentiels
  const leadsDetected = emails.filter(email => email.hasLeadPotential)

  /**
   * Charge les emails depuis le cache au démarrage
   */
  useEffect(() => {
    const cachedEmails = loadEmailsFromCache()
    const timestamp = loadCacheTimestamp()

    if (cachedEmails.length > 0) {
      setEmails(cachedEmails)
      setCacheTimestamp(timestamp)
    }
  }, [])

  /**
   * Vérifie le statut d'authentification au chargement
   */
  useEffect(() => {
    checkAuthStatus()
  }, [])

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
      // Ignore auth status errors
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
        const fetchedEmails = result.data.messages || []

        // Sauvegarder dans localStorage
        saveEmailsToCache(fetchedEmails)
        setCacheTimestamp(Date.now())

        setEmails(fetchedEmails)
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
        clearEmailCache()
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
    setCacheTimestamp(null)
  }, [])

  /**
   * Efface le cache localStorage
   */
  const clearCache = useCallback(() => {
    clearEmailCache()
    setEmails([])
    setCacheTimestamp(null)
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

    // Cache
    cacheTimestamp,

    // Actions
    startAuth,
    fetchEmails,
    revokeAccess,
    clearError,
    reset,
    clearCache
  }
}
