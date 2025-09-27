import { getDb } from '../db/connection'
import type {
  RawLead,
  CleanLead,
  PlatformLead,
  FullLead,
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

  // =================== RAW LEADS ===================

  async createRawLead(data: Omit<RawLead, 'id' | 'extractedAt'>): Promise<RawLead> {
    const id = randomUUID()
    const extractedAt = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO raw_leads (id, source, provider, raw_content, metadata, extracted_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      data.source,
      data.provider || null,
      data.rawContent,
      JSON.stringify(data.metadata),
      extractedAt
    )

    return { id, extractedAt, ...data }
  }

  async getRawLead(id: string): Promise<RawLead | null> {
    const row = this.db.prepare(`
      SELECT id, source, provider, raw_content, metadata, extracted_at
      FROM raw_leads WHERE id = ?
    `).get(id) as any

    if (!row) return null

    return {
      id: row.id,
      source: row.source,
      provider: row.provider,
      rawContent: row.raw_content,
      metadata: JSON.parse(row.metadata),
      extractedAt: row.extracted_at
    }
  }

  // =================== CLEAN LEADS ===================

  async createCleanLead(data: Omit<CleanLead, 'id' | 'cleanedAt'>): Promise<CleanLead> {
    const id = randomUUID()
    const cleanedAt = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO clean_leads (
        id, raw_lead_id, contact_data, souscripteur_data,
        conjoint_data, enfants_data, besoins_data, quality_score, cleaned_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      data.rawLeadId,
      JSON.stringify(data.contact),
      JSON.stringify(data.souscripteur),
      data.conjoint ? JSON.stringify(data.conjoint) : null,
      JSON.stringify(data.enfants),
      JSON.stringify(data.besoins),
      data.qualityScore,
      cleanedAt
    )

    return { id, cleanedAt, ...data }
  }

  async getCleanLead(id: string): Promise<CleanLead | null> {
    const row = this.db.prepare(`
      SELECT id, raw_lead_id, contact_data, souscripteur_data,
             conjoint_data, enfants_data, besoins_data, quality_score, cleaned_at
      FROM clean_leads WHERE id = ?
    `).get(id) as any

    if (!row) return null

    return {
      id: row.id,
      rawLeadId: row.raw_lead_id,
      contact: JSON.parse(row.contact_data),
      souscripteur: JSON.parse(row.souscripteur_data),
      conjoint: row.conjoint_data ? JSON.parse(row.conjoint_data) : undefined,
      enfants: JSON.parse(row.enfants_data),
      besoins: JSON.parse(row.besoins_data),
      qualityScore: row.quality_score,
      cleanedAt: row.cleaned_at
    }
  }

  async updateCleanLead(id: string, data: UpdateLeadData): Promise<boolean> {
    const existing = await this.getCleanLead(id)
    if (!existing) return false

    const updates: string[] = []
    const values: any[] = []

    if (data.contact) {
      const merged = { ...existing.contact, ...data.contact }
      updates.push('contact_data = ?')
      values.push(JSON.stringify(merged))
    }

    if (data.souscripteur) {
      const merged = { ...existing.souscripteur, ...data.souscripteur }
      updates.push('souscripteur_data = ?')
      values.push(JSON.stringify(merged))
    }

    if (data.conjoint !== undefined) {
      updates.push('conjoint_data = ?')
      values.push(data.conjoint ? JSON.stringify(data.conjoint) : null)
    }

    if (data.enfants) {
      updates.push('enfants_data = ?')
      values.push(JSON.stringify(data.enfants))
    }

    if (data.besoins) {
      const merged = { ...existing.besoins, ...data.besoins }
      updates.push('besoins_data = ?')
      values.push(JSON.stringify(merged))
    }

    if (updates.length === 0) return true

    values.push(id)

    const stmt = this.db.prepare(`
      UPDATE clean_leads SET ${updates.join(', ')} WHERE id = ?
    `)

    const result = stmt.run(...values)
    return result.changes > 0
  }

  async replaceCleanLead(id: string, data: UpdateLeadData): Promise<boolean> {
    const stmt = this.db.prepare(`
      UPDATE clean_leads
      SET contact_data = ?, souscripteur_data = ?, conjoint_data = ?, enfants_data = ?, besoins_data = ?
      WHERE id = ?
    `)

    const result = stmt.run(
      JSON.stringify(data.contact),
      JSON.stringify(data.souscripteur),
      data.conjoint ? JSON.stringify(data.conjoint) : null,
      JSON.stringify(data.enfants || []),
      JSON.stringify(data.besoins || {}),
      id
    )

    return result.changes > 0
  }

  async deleteCleanLead(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM clean_leads WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  // =================== LISTING & FILTERING ===================

  async listCleanLeads(filters: LeadFilters = {}, pagination: PaginationParams = {}): Promise<PaginatedResult<FullLead>> {
    const { page = 1, limit = 20 } = pagination
    const offset = (page - 1) * limit

    let whereClause = '1=1'
    const params: any[] = []

    if (filters.search) {
      whereClause += ` AND (
        JSON_EXTRACT(cl.contact_data, '$.nom') LIKE ? OR
        JSON_EXTRACT(cl.contact_data, '$.prenom') LIKE ? OR
        JSON_EXTRACT(cl.contact_data, '$.email') LIKE ? OR
        JSON_EXTRACT(cl.contact_data, '$.telephone') LIKE ?
      )`
      const searchTerm = `%${filters.search}%`
      params.push(searchTerm, searchTerm, searchTerm, searchTerm)
    }

    if (filters.source) {
      whereClause += ' AND rl.source = ?'
      params.push(filters.source)
    }

    if (filters.minScore !== undefined) {
      whereClause += ' AND cl.quality_score >= ?'
      params.push(filters.minScore)
    }

    // Count total
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as total
      FROM clean_leads cl
      JOIN raw_leads rl ON cl.raw_lead_id = rl.id
      WHERE ${whereClause}
    `)
    const { total } = countStmt.get(...params) as { total: number }

    // Get items
    const itemsStmt = this.db.prepare(`
      SELECT cl.*, rl.source, rl.provider, rl.raw_content, rl.metadata, rl.extracted_at
      FROM clean_leads cl
      JOIN raw_leads rl ON cl.raw_lead_id = rl.id
      WHERE ${whereClause}
      ORDER BY cl.cleaned_at DESC
      LIMIT ? OFFSET ?
    `)

    const rows = itemsStmt.all(...params, limit, offset) as any[]

    const items: FullLead[] = rows.map(row => ({
      id: row.id,
      rawLeadId: row.raw_lead_id,
      contact: JSON.parse(row.contact_data),
      souscripteur: JSON.parse(row.souscripteur_data),
      conjoint: row.conjoint_data ? JSON.parse(row.conjoint_data) : undefined,
      enfants: JSON.parse(row.enfants_data),
      besoins: JSON.parse(row.besoins_data),
      qualityScore: row.quality_score,
      cleanedAt: row.cleaned_at,
      rawLead: {
        id: row.raw_lead_id,
        source: row.source,
        provider: row.provider,
        rawContent: row.raw_content,
        metadata: JSON.parse(row.metadata),
        extractedAt: row.extracted_at
      },
      platformLeads: [] // TODO: Load platform leads separately
    }))

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
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

    const avgScoreStmt = this.db.prepare('SELECT AVG(quality_score) as avg FROM clean_leads')
    const { avg: averageScore } = avgScoreStmt.get() as { avg: number }

    return {
      total,
      new: recent,
      processed: 0, // TODO: Calculate from platform_leads
      processing: 0, // TODO: Calculate from platform_leads
      bySource: { gmail: 0, file: 0, manual: 0 }, // TODO: Calculate
      byProvider: { assurprospect: 0, assurlead: 0, generic: 0 }, // TODO: Calculate
      averageScore: Math.round(averageScore || 0)
    }
  }
}