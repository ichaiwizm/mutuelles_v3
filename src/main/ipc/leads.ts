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

// Validation schemas
const CreateLeadSchema = z.object({
  contact: z.object({
    civilite: z.string().optional(),
    nom: z.string().optional(),
    prenom: z.string().optional(),
    telephone: z.string().optional(),
    email: z.string().email().optional(),
    adresse: z.string().optional(),
    codePostal: z.string().optional(),
    ville: z.string().optional()
  }),
  souscripteur: z.object({
    dateNaissance: z.string().optional(),
    profession: z.string().optional(),
    regimeSocial: z.string().optional(),
    nombreEnfants: z.number().int().min(0).optional()
  }),
  conjoint: z.object({
    civilite: z.string().optional(),
    prenom: z.string().optional(),
    nom: z.string().optional(),
    dateNaissance: z.string().optional(),
    profession: z.string().optional(),
    regimeSocial: z.string().optional()
  }).optional(),
  enfants: z.array(z.object({
    dateNaissance: z.string().optional(),
    sexe: z.string().optional()
  })).optional(),
  besoins: z.object({
    dateEffet: z.string().optional(),
    assureActuellement: z.boolean().optional(),
    gammes: z.array(z.string()).optional(),
    madelin: z.boolean().optional(),
    niveaux: z.object({
      soinsMedicaux: z.number().optional(),
      hospitalisation: z.number().optional(),
      optique: z.number().optional(),
      dentaire: z.number().optional()
    }).optional()
  }).optional(),
  platformData: z.record(z.any()).optional(),
  qualityScore: z.number().int().min(0).max(10).optional()
})

const UpdateLeadSchema = CreateLeadSchema.partial()

const LeadFiltersSchema = z.object({
  search: z.string().optional(),
  source: z.enum(['gmail', 'file', 'manual']).optional(),
  provider: z.enum(['assurprospect', 'assurlead', 'generic']).optional(),
  minScore: z.number().int().min(0).max(10).optional(),
  platformId: z.number().int().positive().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'error']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
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

      // VÉRIFICATION DES DOUBLONS
      const duplicates = await getLeadsService().checkForDuplicates(
        validated.contact,
        validated.souscripteur
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
              contact: d.lead.contact,
              reasons: d.reasons
            }))
          }
        }
      }

      // Utiliser un score de qualité par défaut si non fourni
      const qualityScore = validated.qualityScore ?? 5

      // Créer d'abord un raw lead pour les créations manuelles
      const rawLead = await getLeadsService().createRawLead({
        source: 'manual',
        rawContent: `Lead créé manuellement: ${validated.contact.nom || ''} ${validated.contact.prenom || ''}`.trim() || 'Lead manuel',
        metadata: { createdManually: true }
      })

      // Puis créer le clean lead avec le score calculé
      const cleanLead = await getLeadsService().createCleanLead({
        rawLeadId: rawLead.id,
        contact: validated.contact,
        souscripteur: validated.souscripteur,
        conjoint: validated.conjoint,
        enfants: validated.enfants || [],
        besoins: validated.besoins || {},
        platformData: validated.platformData,
        qualityScore: qualityScore
      })

      return { success: true, data: cleanLead }
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