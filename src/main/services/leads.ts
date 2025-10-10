import { getDb } from '../db/connection'
import type {
  Lead,
  CleanLead,
  LeadData,
  CreateLeadData,
  UpdateLeadData,
  LeadFilters,
  PaginationParams,
  PaginatedResult,
  LeadStats
} from '../../shared/types/leads'
import { randomUUID } from 'crypto'

export class LeadsService {
  private get db() {
    return getDb()
  }

  // =================== LEADS ===================

  async createLead(data: CreateLeadData, metadata: Record<string, any> = {}): Promise<Lead> {
    const id = randomUUID()
    const createdAt = new Date().toISOString()

    // Merge all data into single JSON object
    const leadData: LeadData = {
      contact: data.contact,
      souscripteur: data.souscripteur,
      conjoint: data.conjoint,
      enfants: data.enfants || [],
      besoins: data.besoins || {},
      platformData: data.platformData
    }

    const stmt = this.db.prepare(`
      INSERT INTO clean_leads (id, data, metadata, created_at)
      VALUES (?, ?, ?, ?)
    `)

    stmt.run(
      id,
      JSON.stringify(leadData),
      JSON.stringify(metadata),
      createdAt
    )

    return {
      id,
      data: leadData,
      metadata,
      createdAt
    }
  }

  async getLead(id: string): Promise<Lead | null> {
    const row = this.db.prepare(`
      SELECT id, data, metadata, created_at
      FROM clean_leads WHERE id = ?
    `).get(id) as any

    if (!row) return null

    return {
      id: row.id,
      data: JSON.parse(row.data),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at
    }
  }

  // Alias for compatibility
  async getCleanLead(id: string): Promise<CleanLead | null> {
    return this.getLead(id)
  }

  async updateLead(id: string, updates: UpdateLeadData): Promise<boolean> {
    const existing = await this.getLead(id)
    if (!existing) return false

    // Merge updates into existing data
    const updatedData: LeadData = {
      contact: updates.contact ? { ...existing.data.contact, ...updates.contact } : existing.data.contact,
      souscripteur: updates.souscripteur ? { ...existing.data.souscripteur, ...updates.souscripteur } : existing.data.souscripteur,
      conjoint: updates.conjoint !== undefined ? updates.conjoint : existing.data.conjoint,
      enfants: updates.enfants !== undefined ? updates.enfants : existing.data.enfants,
      besoins: updates.besoins ? { ...existing.data.besoins, ...updates.besoins } : existing.data.besoins,
      platformData: updates.platformData ? { ...existing.data.platformData, ...updates.platformData } : existing.data.platformData
    }

    const stmt = this.db.prepare(`
      UPDATE clean_leads SET data = ? WHERE id = ?
    `)

    const result = stmt.run(JSON.stringify(updatedData), id)
    return result.changes > 0
  }

  // Alias for compatibility
  async updateCleanLead(id: string, data: UpdateLeadData): Promise<boolean> {
    return this.updateLead(id, data)
  }

  async deleteLead(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM clean_leads WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  // Alias for compatibility
  async deleteCleanLead(id: string): Promise<boolean> {
    return this.deleteLead(id)
  }

  // =================== LISTING & FILTERING ===================

  async listLeads(filters: LeadFilters = {}, pagination: PaginationParams = {}): Promise<PaginatedResult<Lead>> {
    const { page = 1, limit = 20 } = pagination
    const offset = (page - 1) * limit

    let whereClause = '1=1'
    const params: any[] = []

    if (filters.search) {
      whereClause += ` AND (
        JSON_EXTRACT(data, '$.contact.nom') LIKE ? OR
        JSON_EXTRACT(data, '$.contact.prenom') LIKE ? OR
        JSON_EXTRACT(data, '$.contact.email') LIKE ? OR
        JSON_EXTRACT(data, '$.contact.telephone') LIKE ?
      )`
      const searchTerm = `%${filters.search}%`
      params.push(searchTerm, searchTerm, searchTerm, searchTerm)
    }

    // Count total
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as total
      FROM clean_leads
      WHERE ${whereClause}
    `)
    const { total } = countStmt.get(...params) as { total: number }

    // Get items
    const itemsStmt = this.db.prepare(`
      SELECT id, data, metadata, created_at
      FROM clean_leads
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)

    const rows = itemsStmt.all(...params, limit, offset) as any[]

    const items: Lead[] = rows.map(row => ({
      id: row.id,
      data: JSON.parse(row.data),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at
    }))

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  // Alias for compatibility
  async listCleanLeads(filters: LeadFilters = {}, pagination: PaginationParams = {}): Promise<PaginatedResult<Lead>> {
    return this.listLeads(filters, pagination)
  }

  // =================== DUPLICATE DETECTION ===================

  /**
   * Vérifie si un lead est un doublon potentiel
   * Retourne un tableau de leads similaires avec les raisons de la correspondance
   */
  async checkForDuplicates(contact: {
    email?: string;
    nom?: string;
    prenom?: string;
    telephone?: string
  }, souscripteur?: {
    dateNaissance?: string
  }): Promise<Array<{ lead: Lead; reasons: string[] }>> {
    const duplicates: Array<{ lead: Lead; reasons: string[] }> = []

    // Récupérer tous les leads pour vérification
    const allLeadsStmt = this.db.prepare('SELECT id, data FROM clean_leads')
    const rows = allLeadsStmt.all() as any[]

    for (const row of rows) {
      const reasons: string[] = []
      const leadData = JSON.parse(row.data)
      const existingContact = leadData.contact
      const existingSouscripteur = leadData.souscripteur

      // Vérifier l'email (si fourni et non vide)
      if (contact.email && contact.email.trim() !== '' &&
          existingContact.email && existingContact.email.trim() !== '') {
        if (contact.email.toLowerCase() === existingContact.email.toLowerCase()) {
          reasons.push('Email identique')
        }
      }

      // Vérifier le téléphone (si fourni et non vide)
      if (contact.telephone && contact.telephone.trim() !== '' &&
          existingContact.telephone && existingContact.telephone.trim() !== '') {
        // Normaliser les téléphones en retirant les espaces, points, tirets
        const normalizedTel1 = contact.telephone.replace(/[\s\.\-]/g, '')
        const normalizedTel2 = existingContact.telephone.replace(/[\s\.\-]/g, '')
        if (normalizedTel1 === normalizedTel2) {
          reasons.push('Téléphone identique')
        }
      }

      // Vérifier nom + prénom + date de naissance (si tous sont fournis)
      if (contact.nom && contact.nom.trim() !== '' &&
          contact.prenom && contact.prenom.trim() !== '' &&
          souscripteur?.dateNaissance && souscripteur.dateNaissance.trim() !== '' &&
          existingContact.nom && existingContact.nom.trim() !== '' &&
          existingContact.prenom && existingContact.prenom.trim() !== '' &&
          existingSouscripteur.dateNaissance && existingSouscripteur.dateNaissance.trim() !== '') {

        const sameNom = contact.nom.toLowerCase() === existingContact.nom.toLowerCase()
        const samePrenom = contact.prenom.toLowerCase() === existingContact.prenom.toLowerCase()
        const sameDob = souscripteur.dateNaissance === existingSouscripteur.dateNaissance

        if (sameNom && samePrenom && sameDob) {
          reasons.push('Nom, prénom et date de naissance identiques')
        }
      }

      // Si des correspondances ont été trouvées, récupérer le lead complet
      if (reasons.length > 0) {
        const fullLead = await this.getLead(row.id)
        if (fullLead) {
          duplicates.push({ lead: fullLead, reasons })
        }
      }
    }

    return duplicates
  }

  // =================== STATS ===================

  async getLeadStats(): Promise<LeadStats> {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM clean_leads')
    const { count: total } = totalStmt.get() as { count: number }

    const recentStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM clean_leads
      WHERE cleaned_at >= datetime('now', '-7 days')
    `)
    const { count: recent } = recentStmt.get() as { count: number }

    return {
      total,
      new: recent,
      processed: 0, // TODO: Calculate from platform_leads
      processing: 0 // TODO: Calculate from platform_leads
    }
  }
}