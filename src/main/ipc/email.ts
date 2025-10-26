/**
 * IPC Handlers pour le service Email
 *
 * Expose les fonctionnalités d'import email au renderer via IPC
 */

import { ipcMain, BrowserWindow } from 'electron'
import { z } from 'zod'
import { EmailService } from '../services/email'
import type { EmailFilters, StartImportParams } from '../../shared/types/email'

let emailService: EmailService | null = null

function getEmailService() {
  if (!emailService) {
    emailService = new EmailService()
  }
  return emailService
}

// Schémas de validation
const EmailFiltersSchema = z.object({
  dateRange: z.object({
    from: z.date().or(z.string().transform(s => new Date(s))),
    to: z.date().or(z.string().transform(s => new Date(s)))
  }).optional(),
  days: z.number().int().positive().optional(),
  query: z.string().optional(),
  senders: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  maxResults: z.number().int().positive().optional()
})

const StartImportSchema = z.object({
  configId: z.number().int().positive().optional(),
  filters: EmailFiltersSchema
})

const HandleCallbackSchema = z.object({
  code: z.string().min(1)
})

const RevokeAccessSchema = z.object({
  configId: z.number().int().positive()
})

/**
 * Enregistre tous les handlers IPC pour le service email
 */
export function registerEmailIpc() {
  /**
   * Démarre le flow OAuth complet (ouvre le navigateur + attend le callback)
   */
  ipcMain.handle('email:startAuth', async () => {
    try {
      const result = await getEmailService().startAuth()

      if (result.success && result.config) {
        return { success: true, data: result.config }
      } else {
        return { success: false, error: result.error || 'Erreur lors de l\'authentification' }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      console.error('Erreur IPC startAuth:', message)
      return { success: false, error: message }
    }
  })

  /**
   * Gère le callback OAuth (échange code contre tokens)
   */
  ipcMain.handle('email:handleCallback', async (_, data: { code: string }) => {
    try {
      const validated = HandleCallbackSchema.parse(data)
      const result = await getEmailService().handleCallback(validated.code)

      if (result.success) {
        return { success: true, data: result.config }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  /**
   * Liste toutes les configurations email
   */
  ipcMain.handle('email:listConfigs', async () => {
    try {
      const configs = getEmailService().listConfigs()
      return { success: true, data: configs }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  /**
   * Récupère une configuration par ID
   */
  ipcMain.handle('email:getConfig', async (_, configId: number) => {
    try {
      const config = getEmailService().getConfigById(configId)
      if (!config) {
        return { success: false, error: 'Configuration introuvable' }
      }
      return { success: true, data: config }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  /**
   * Révoque l'accès et supprime une configuration
   */
  ipcMain.handle('email:revokeAccess', async (_, data: { configId: number }) => {
    try {
      const validated = RevokeAccessSchema.parse(data)
      const success = await getEmailService().revokeAccess(validated.configId)
      if (success) {
        return { success: true, data: { revoked: true } }
      } else {
        return { success: false, error: 'Échec de la révocation' }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  /**
   * Lance l'import d'emails
   */
  ipcMain.handle('email:fetchMessages', async (event, data: StartImportParams) => {
    try {
      const validated = StartImportSchema.parse(data)

      // Si pas de configId, demander l'authentification
      if (!validated.configId) {
        const configs = getEmailService().listConfigs()
        if (configs.length === 0) {
          return {
            success: false,
            error: 'Aucune configuration trouvée. Veuillez vous authentifier d\'abord.'
          }
        }
        // Utiliser la première config par défaut
        validated.configId = configs[0].id!
      }

      // Envoyer événement de progression : démarrage
      event.sender.send('email:import-progress', {
        phase: 'authenticating',
        message: 'Authentification en cours...'
      })

      // Lancer la récupération
      event.sender.send('email:import-progress', {
        phase: 'fetching',
        message: 'Récupération des emails...'
      })

      const result = await getEmailService().fetchEmails(validated.configId, validated.filters)

      if (result.success) {
        // Envoyer événement de progression : traitement
        event.sender.send('email:import-progress', {
          phase: 'processing',
          message: `Traitement de ${result.totalFetched} emails...`,
          total: result.totalFetched,
          current: result.totalFetched
        })

        // Envoyer événement de progression : terminé
        event.sender.send('email:import-progress', {
          phase: 'completed',
          message: `Import terminé : ${result.leadsDetected} leads potentiels détectés`,
          total: result.totalFetched,
          current: result.totalFetched,
          percentage: 100
        })

        return { success: true, data: result }
      } else {
        event.sender.send('email:import-progress', {
          phase: 'error',
          message: result.error || 'Erreur lors de l\'import'
        })

        return { success: false, error: result.error }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'

      event.sender.send('email:import-progress', {
        phase: 'error',
        message
      })

      return { success: false, error: message }
    }
  })

  /**
   * Récupère l'historique des emails importés
   */
  ipcMain.handle('email:getImportedEmails', async (_, params?: { configId?: number; limit?: number }) => {
    try {
      const emails = getEmailService().getImportedEmails(
        params?.configId,
        params?.limit
      )
      return { success: true, data: emails }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  /**
   * Vérifie le statut d'authentification
   */
  ipcMain.handle('email:getAuthStatus', async () => {
    try {
      const configs = getEmailService().listConfigs()
      if (configs.length === 0) {
        return {
          success: true,
          data: { status: 'not_authenticated', config: null }
        }
      }

      const config = configs[0] // Premier config par défaut

      // Vérifier si le token est expiré
      if (config.expiryDate && config.expiryDate < Date.now()) {
        return {
          success: true,
          data: { status: 'expired', config }
        }
      }

      return {
        success: true,
        data: { status: 'authenticated', config }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  console.log('[IPC] ✓ Email handlers registered')
}
