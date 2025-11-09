import { getDb } from '../db/connection'
import { createLogger } from './logger'
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
  private log = createLogger('LeadsService')
  private get db() {
    return getDb()
  }

  // =================== LEADS ===================

  async createLead(data: CreateLeadData, metadata: Record<string, any> = {}): Promise<Lead> {
    const id = randomUUID()
    const createdAt = new Date().toISOString()

    // Merge all data into single JSON object using domain keys
    const leadData: LeadData = {
      subscriber: data.subscriber,
      spouse: data.spouse,
      children: data.children,
      project: data.project
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

    this.log.debug('createLead inserted', { id, lastName: data.subscriber?.lastName, firstName: data.subscriber?.firstName, birthDate: data.subscriber?.birthDate })

    return {
      id,
      data: leadData,
      metadata,
      createdAt
    }
  }

  // Alias for compatibility with older IPC code
  async createCleanLead(data: CreateLeadData, metadata: Record<string, any> = {}): Promise<Lead> {
    return this.createLead(data, metadata)
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

    // Merge updates into existing data using domain keys
    const updatedData: LeadData = {
      subscriber: updates.subscriber ? { ...existing.data.subscriber, ...updates.subscriber } : existing.data.subscriber,
      spouse: updates.spouse !== undefined ? updates.spouse : existing.data.spouse,
      children: updates.children !== undefined ? updates.children : existing.data.children,
      project: updates.project ? { ...existing.data.project, ...updates.project } : existing.data.project
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
        JSON_EXTRACT(data, '$.subscriber.lastName') LIKE ? OR
        JSON_EXTRACT(data, '$.subscriber.firstName') LIKE ? OR
        JSON_EXTRACT(data, '$.subscriber.email') LIKE ? OR
        JSON_EXTRACT(data, '$.subscriber.telephone') LIKE ?
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
  async checkForDuplicates(subscriber: {
    email?: string;
    lastName?: string;
    firstName?: string;
    telephone?: string;
    birthDate?: string;
  }): Promise<Array<{ lead: Lead; reasons: string[] }>> {
    const duplicates: Array<{ lead: Lead; reasons: string[] }> = []

    // Récupérer tous les leads pour vérification
    const allLeadsStmt = this.db.prepare('SELECT id, data FROM clean_leads')
    const rows = allLeadsStmt.all() as any[]

    for (const row of rows) {
      const reasons: string[] = []
      const leadData = JSON.parse(row.data)
      const existingSubscriber = leadData.subscriber

      // Vérifier l'email (si fourni et non vide)
      if (subscriber.email && subscriber.email.trim() !== '' &&
          existingSubscriber?.email && existingSubscriber.email.trim() !== '') {
        if (subscriber.email.toLowerCase() === existingSubscriber.email.toLowerCase()) {
          reasons.push('Email identique')
        }
      }

      // Vérifier le téléphone (si fourni et non vide)
      if (subscriber.telephone && subscriber.telephone.trim() !== '' &&
          existingSubscriber?.telephone && existingSubscriber.telephone.trim() !== '') {
        // Normaliser les téléphones en retirant les espaces, points, tirets
        const normalizedTel1 = subscriber.telephone.replace(/[\s\.\-]/g, '')
        const normalizedTel2 = existingSubscriber.telephone.replace(/[\s\.\-]/g, '')
        if (normalizedTel1 === normalizedTel2) {
          reasons.push('Téléphone identique')
        }
      }

      // Vérifier nom + prénom + date de naissance (si tous sont fournis)
      if (subscriber.lastName && subscriber.lastName.trim() !== '' &&
          subscriber.firstName && subscriber.firstName.trim() !== '' &&
          subscriber.birthDate && subscriber.birthDate.trim() !== '' &&
          existingSubscriber?.lastName && existingSubscriber.lastName.trim() !== '' &&
          existingSubscriber?.firstName && existingSubscriber.firstName.trim() !== '' &&
          existingSubscriber?.birthDate && existingSubscriber.birthDate.trim() !== '') {

        const sameLast = subscriber.lastName.toLowerCase() === existingSubscriber.lastName.toLowerCase()
        const sameFirst = subscriber.firstName.toLowerCase() === existingSubscriber.firstName.toLowerCase()
        const sameDob = subscriber.birthDate === existingSubscriber.birthDate

        if (sameLast && sameFirst && sameDob) {
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
      WHERE created_at >= datetime('now', '-7 days')
    `)
    const { count: recent } = recentStmt.get() as { count: number }

    const processedStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT lead_id) as count
      FROM execution_items
      WHERE status = 'success' AND lead_id IS NOT NULL
    `)
    const { count: processed } = processedStmt.get() as { count: number }

    const processingStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT lead_id) as count
      FROM execution_items
      WHERE status IN ('pending', 'running') AND lead_id IS NOT NULL
    `)
    const { count: processing } = processingStmt.get() as { count: number }

    return {
      total,
      new: recent,
      processed,
      processing
    }
  }
}
