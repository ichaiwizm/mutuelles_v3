import { ipcMain, BrowserWindow } from 'electron'
import { z } from 'zod'
import { EmailService } from '../services/email'
import type { EmailFilters, StartImportParams } from '../../shared/types/email'
import { createLogger } from '../services/logger'

const logger = createLogger('IPC:Email')

let emailService: EmailService | null = null

function getEmailService() {
  if (!emailService) {
    emailService = new EmailService()
  }
  return emailService
}

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

export function registerEmailIpc() {
  // Start proactive token refresh scheduler
  const service = getEmailService()
  service.startProactiveRefresh()

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
      logger.error('Erreur IPC startAuth:', message)
      return { success: false, error: message }
    }
  })

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

  ipcMain.handle('email:listConfigs', async () => {
    try {
      const configs = getEmailService().listConfigs()
      return { success: true, data: configs }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

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

  ipcMain.handle('email:fetchMessages', async (event, data: StartImportParams) => {
    try {
      const validated = StartImportSchema.parse(data)

      if (!validated.configId) {
        const configs = getEmailService().listConfigs()
        if (configs.length === 0) {
          return {
            success: false,
            error: 'Aucune configuration trouvée. Veuillez vous authentifier d\'abord.'
          }
        }
        validated.configId = configs[0].id!
      }

      event.sender.send('email:import-progress', {
        phase: 'authenticating',
        message: 'Authentification en cours...'
      })

      event.sender.send('email:import-progress', {
        phase: 'fetching',
        message: 'Récupération des emails...'
      })

      const result = await getEmailService().fetchEmails(validated.configId, validated.filters)

      if (result.success) {
        event.sender.send('email:import-progress', {
          phase: 'processing',
          message: `Traitement de ${result.totalFetched} emails...`,
          total: result.totalFetched,
          current: result.totalFetched
        })

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
        logger.info(`Token expiré pour ${config.email}, tentative de refresh automatique...`)

        try {
          const refreshed = await getEmailService().refreshTokens(config.id!)
          if (refreshed) {
            const updatedConfig = getEmailService().getConfigById(config.id!)
            logger.info(`Token refreshé automatiquement pour ${config.email}`)
            return {
              success: true,
              data: { status: 'authenticated', config: updatedConfig }
            }
          }
        } catch (error) {
          logger.error('Échec du refresh automatique:', error)
        }

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

  ipcMain.handle('email:updateKnownSenders', async (_, data: { configId: number; knownSenders: any[] }) => {
    try {
      const success = getEmailService().updateKnownSenders(data.configId, data.knownSenders)
      if (success) {
        return { success: true, data: { updated: true } }
      } else {
        return { success: false, error: 'Échec de la mise à jour' }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('email:analyzeSenders', async (_, data: { configId: number; filters: EmailFilters }) => {
    try {
      const validated = z.object({
        configId: z.number().int().positive(),
        filters: EmailFiltersSchema
      }).parse(data)

      const suggestions = await getEmailService().analyzeSendersFromLeads(validated.configId, validated.filters)
      return { success: true, data: suggestions }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('email:parseToLeads', async (_, data: { emails: any[] }) => {
    try {
      const { EmailToLeadService } = await import('../services/emailToLead')

      const validated = z.object({
        emails: z.array(z.any())
      }).parse(data)

      const result = await EmailToLeadService.parseEmailsToLeads(validated.emails)
      return { success: true, data: result }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      logger.error('email:parseToLeads error:', error)
      return { success: false, error: message }
    }
  })

  logger.info('Email handlers registered')
}
