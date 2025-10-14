import { ipcMain } from 'electron'
import { LeadsService } from '../services/leads'
import type {
  CreateLeadData,
  UpdateLeadData,
  LeadFilters,
  PaginationParams
} from '../../shared/types/leads'
import { z } from 'zod'

// Instanciation paresseuse du service pour éviter l'erreur de DB non initialisée
let leadsService: LeadsService | null = null

function getLeadsService() {
  if (!leadsService) {
    leadsService = new LeadsService()
  }
  return leadsService
}

// Validation schemas using domain keys (aligned with base.domain.json)
const CreateLeadSchema = z.object({
  subscriber: z.object({
    // Identity
    civility: z.string().optional(),
    lastName: z.string().optional(),
    firstName: z.string().optional(),
    birthDate: z.string().optional(),

    // Contact
    telephone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    postalCode: z.string().optional(),
    city: z.string().optional(),
    departmentCode: z.string().optional(),

    // Professional
    regime: z.string().optional(),
    category: z.string().optional(),
    status: z.string().optional(),
    profession: z.string().optional(),
    workFramework: z.string().optional(),

    // Children
    childrenCount: z.number().int().min(0).optional()
  }),

  spouse: z.object({
    civility: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    birthDate: z.string().optional(),
    regime: z.string().optional(),
    category: z.string().optional(),
    status: z.string().optional(),
    profession: z.string().optional(),
    workFramework: z.string().optional()
  }).optional(),

  children: z.array(z.object({
    birthDate: z.string().optional(),
    gender: z.string().optional(),
    regime: z.string().optional(),
    ayantDroit: z.string().optional()
  })).optional(),

  project: z.object({
    name: z.string().optional(),
    dateEffet: z.string().optional(),
    plan: z.string().optional(),
    couverture: z.boolean().optional(),
    ij: z.boolean().optional(),
    simulationType: z.string().optional(),
    madelin: z.boolean().optional(),
    resiliation: z.boolean().optional(),
    reprise: z.boolean().optional(),
    currentlyInsured: z.boolean().optional(),
    ranges: z.array(z.string()).optional(),
    levels: z.object({
      medicalCare: z.number().optional(),
      hospitalization: z.number().optional(),
      optics: z.number().optional(),
      dental: z.number().optional()
    }).optional()
  }),

  platformData: z.record(z.any()).optional()
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
  // Créer un lead manuellement
  ipcMain.handle('leads:create', async (_, data: CreateLeadData) => {
    try {
      const validated = CreateLeadSchema.parse(data)

      // VÉRIFICATION DES DOUBLONS (using domain keys)
      const duplicates = await getLeadsService().checkForDuplicates(
        validated.subscriber
      )

      if (duplicates.length > 0) {
        // Retourner un avertissement avec les doublons trouvés
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

      // Créer le lead avec métadonnées
      const lead = await getLeadsService().createLead(
        validated,
        { createdManually: true }
      )

      return { success: true, data: lead }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  // Obtenir un lead par ID
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

  // Mettre à jour un lead
  ipcMain.handle('leads:update', async (_, id: string, data: UpdateLeadData) => {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('ID du lead requis')
      }

      const validated = UpdateLeadSchema.parse(data)
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

  // Supprimer un lead
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

  // Lister les leads avec filtres et pagination
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

  // Obtenir les statistiques des leads
  ipcMain.handle('leads:stats', async () => {
    try {
      const stats = await getLeadsService().getLeadStats()
      return { success: true, data: stats }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      return { success: false, error: message }
    }
  })

  // Recherche simple de leads
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

  // Supprimer plusieurs leads
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
}
