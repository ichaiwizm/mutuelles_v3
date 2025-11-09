import { ipcMain } from 'electron'
import { createLogger } from '../services/logger'
import { LeadsService } from '../services/leads'
import type {
  LeadFilters,
  PaginationParams
} from '../../shared/types/leads'
import { leadDataSchema } from '../../../core/domain/lead.schema'
import { z } from 'zod'

let leadsService: LeadsService | null = null

function getLeadsService() {
  if (!leadsService) {
    leadsService = new LeadsService()
  }
  return leadsService
}

/**
 * Normalize UI data to v2 canonical format
 * Converts:
 * - DD/MM/YYYY dates → YYYY-MM-DD (ISO)
 * - Loose phone → +33... (E.164)
 * - telephone field → phoneE164 field
 */
function normalizeToCanonical(uiData: any): any {
  const normalized = JSON.parse(JSON.stringify(uiData)) // Deep clone

  // Helper to convert DD/MM/YYYY → YYYY-MM-DD
  const convertDate = (dateStr: string | undefined): string | undefined => {
    if (!dateStr) return undefined

    // If already ISO format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr
    }

    // Convert DD/MM/YYYY to YYYY-MM-DD
    const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`
    }

    return dateStr // Fallback
  }

  // Helper to convert phone to E.164
  const convertPhone = (phone: string | undefined): string | undefined => {
    if (!phone) return undefined

    // Already E.164
    if (phone.startsWith('+')) {
      return phone
    }

    // Remove all non-digits
    const digits = phone.replace(/\D/g, '')

    // French number: add +33 prefix
    if (digits.length === 10 && digits.startsWith('0')) {
      return `+33${digits.slice(1)}`
    }

    // Already without leading 0
    if (digits.length === 9) {
      return `+33${digits}`
    }

    return `+${digits}` // Fallback
  }

  // Normalize subscriber
  if (normalized.subscriber) {
    if (normalized.subscriber.birthDate) {
      normalized.subscriber.birthDate = convertDate(normalized.subscriber.birthDate)
    }

    // Convert telephone → phoneE164
    if (normalized.subscriber.telephone) {
      normalized.subscriber.phoneE164 = convertPhone(normalized.subscriber.telephone)
      delete normalized.subscriber.telephone
    } else if (normalized.subscriber.phoneE164) {
      normalized.subscriber.phoneE164 = convertPhone(normalized.subscriber.phoneE164)
    }
  }

  // Normalize spouse
  if (normalized.spouse?.birthDate) {
    normalized.spouse.birthDate = convertDate(normalized.spouse.birthDate)
  }

  // Normalize children
  if (Array.isArray(normalized.children)) {
    normalized.children = normalized.children.map(child => ({
      ...child,
      birthDate: convertDate(child.birthDate)
    }))
  }

  // Normalize project
  if (normalized.project?.dateEffet) {
    normalized.project.dateEffet = convertDate(normalized.project.dateEffet)
  }

  // Remove platformData (not part of v2 canonical schema)
  delete normalized.platformData

  return normalized
}

// Use v2 canonical schema but make most fields optional for UI flexibility
const CreateLeadSchema = leadDataSchema.extend({
  subscriber: leadDataSchema.shape.subscriber.extend({
    lastName: z.string().min(1).optional(),
    firstName: z.string().min(1).optional(),
    birthDate: z.string().optional(),
  })
})

const UpdateLeadSchema = CreateLeadSchema.partial()

const LeadFiltersSchema = z.object({
  search: z.string().optional()
}).optional()

const PaginationSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional()
}).optional()

export function registerLeadsIPC() {
  const log = createLogger('IPC:Leads')
  ipcMain.handle('leads:create', async (_, data: any) => {
    try {
      log.debug('leads:create called')
      // Normalize UI format to canonical
      const canonical = normalizeToCanonical(data)

      // Validate against v2 schema
      const validated = CreateLeadSchema.parse(canonical)

      const duplicates = await getLeadsService().checkForDuplicates(
        validated.subscriber
      )

      if (duplicates.length > 0) {
        return {
          success: false,
          error: 'Lead en doublon',
          data: {
            isDuplicate: true,
            duplicates: duplicates.map(d => ({
              id: d.lead.id,
              subscriber: d.lead.data.subscriber,
              reasons: d.reasons
            }))
          }
        }
      }

      const lead = await getLeadsService().createLead(
        validated,
        { createdManually: true }
      )

      log.info('leads:create success', { id: lead.id })
      return { success: true, data: lead }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      log.error('leads:create error', message)
      return { success: false, error: message }
    }
  })

  ipcMain.handle('leads:get', async (_, id: string) => {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('ID du lead requis')
      }

      const lead = await getLeadsService().getCleanLead(id)
      if (!lead) {
        throw new Error('Lead non trouvé')
      }

      return { success: true, data: lead }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('leads:update', async (_, id: string, data: any) => {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('ID du lead requis')
      }

      // Normalize UI format to canonical
      const canonical = normalizeToCanonical(data)
      const validated = UpdateLeadSchema.parse(canonical)
      const success = await getLeadsService().updateCleanLead(id, validated)

      if (!success) {
        throw new Error('Échec de la mise à jour ou lead non trouvé')
      }

      const updatedLead = await getLeadsService().getCleanLead(id)
      return { success: true, data: updatedLead }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('leads:delete', async (_, id: string) => {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('ID du lead requis')
      }

      const success = await getLeadsService().deleteCleanLead(id)
      if (!success) {
        throw new Error('Échec de la suppression ou lead non trouvé')
      }

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('leads:list', async (_, filters?: LeadFilters, pagination?: PaginationParams) => {
    try {
      const validatedFilters = LeadFiltersSchema.parse(filters)
      const validatedPagination = PaginationSchema.parse(pagination)

      const result = await getLeadsService().listCleanLeads(
        validatedFilters || {},
        validatedPagination || {}
      )

      return { success: true, data: result }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('leads:stats', async () => {
    try {
      const stats = await getLeadsService().getLeadStats()
      return { success: true, data: stats }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('leads:search', async (_, query: string) => {
    try {
      if (!query || typeof query !== 'string') {
        throw new Error('Terme de recherche requis')
      }

      const result = await getLeadsService().listCleanLeads(
        { search: query },
        { limit: 10 }
      )

      return { success: true, data: result.items }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('leads:deleteMany', async (_, ids: string[]) => {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('Liste des IDs requise')
      }

      let deletedCount = 0
      const errors: string[] = []

      for (const id of ids) {
        try {
          const success = await getLeadsService().deleteCleanLead(id)
          if (success) {
            deletedCount++
          }
        } catch (error) {
          errors.push(`Erreur pour le lead ${id}: ${error}`)
        }
      }

      return {
        success: true,
        data: {
          deletedCount,
          errors
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  // Vérification de doublons pour une liste de prospects (batch)
  ipcMain.handle('leads:checkDuplicatesBatch', async (_, payload: {
    items: Array<{ lastName?: string; firstName?: string; birthDate?: string; email?: string; telephone?: string }>
  }) => {
    try {
      if (!payload || !Array.isArray(payload.items)) {
        throw new Error('Format invalide')
      }

      const results: Array<{ index: number; isDuplicate: boolean; reasons: string[] }> = []

      let idx = 0
      for (const item of payload.items) {
        const dups = await getLeadsService().checkForDuplicates({
          lastName: item.lastName,
          firstName: item.firstName,
          birthDate: item.birthDate,
          email: item.email,
          telephone: item.telephone
        })
        results.push({ index: idx, isDuplicate: dups.length > 0, reasons: dups.flatMap(d => d.reasons) })
        idx++
      }

      return { success: true, data: { results } }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('leads:createBulk', async (_, data: { leads: Array<{ formData: Record<string, any>; metadata: Record<string, any> }> }) => {
    try {
      const leads = data.leads
      log.debug('leads:createBulk called', { count: Array.isArray(leads) ? leads.length : 0 })

      if (!Array.isArray(leads) || leads.length === 0) {
        throw new Error('Liste de leads requise')
      }

      const results: Array<{ success: boolean; leadId?: string; error?: string; metadata?: any }> = []
      let successCount = 0
      let failureCount = 0

      for (let i = 0; i < leads.length; i++) {
        const { formData, metadata } = leads[i]

        try {
          // Normalize and validate
          const canonical = normalizeToCanonical(formData)
          const validated = CreateLeadSchema.parse(canonical)
          const lead = await getLeadsService().createLead(validated, metadata)

          results.push({
            success: true,
            leadId: lead.id,
            metadata: { index: i, emailId: metadata.emailId }
          })

          log.info('leads:createBulk item success', { index: i, id: lead.id, emailId: metadata?.emailId })
          successCount++
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
          results.push({
            success: false,
            error: errorMessage,
            metadata: { index: i, emailId: metadata?.emailId }
          })

          log.error('leads:createBulk item error', { index: i, emailId: metadata?.emailId, error: errorMessage })
          failureCount++
        }
      }

      const summary = { total: leads.length, successful: successCount, failed: failureCount }
      log.info('leads:createBulk done', summary)
      return {
        success: true,
        data: {
          ...summary,
          results
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      log.error('leads:createBulk fatal error', message)
      return { success: false, error: message }
    }
  })

  // Get all debug reports (for copy to clipboard)
  ipcMain.handle('leads:getAllDebugReports', async () => {
    try {
      const { EmailToLeadService } = await import('../services/emailToLead')
      const reports = EmailToLeadService.getAllDebugReports()

      // Convert Map to Array
      const reportsArray = Array.from(reports.values())

      return {
        success: true,
        data: reportsArray
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  // Clear debug reports
  ipcMain.handle('leads:clearDebugReports', async () => {
    try {
      const { EmailToLeadService } = await import('../services/emailToLead')
      EmailToLeadService.clearDebugReports()

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  // Parse raw text to lead (smart add feature)
  ipcMain.handle('leads:parseRawText', async (_, rawText: string) => {
    try {
      if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
        throw new Error('Texte requis')
      }

      const { EmailToLeadService } = await import('../services/emailToLead')
      const enrichedLead = await EmailToLeadService.parseRawText(rawText)

      return {
        success: true,
        data: enrichedLead
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return {
        success: false,
        error: message
      }
    }
  })
}
