/**
 * Repository for managing flow assignments in the database
 * Handles CRUD operations for lead_flow_assignments table
 */

import { randomUUID } from 'crypto'
import { getDb } from '../../db/connection'
import type {
  FlowAssignment,
  FlowAssignmentWithDetails,
  CreateFlowAssignmentParams,
  UpdateFlowAssignmentParams,
  FlowAssignmentFilters,
  ListAssignmentsOptions,
  PaginatedAssignments
} from '../../../shared/types/platform_leads'

export class AssignmentsRepository {
  private get db() {
    return getDb()
  }

  /**
   * Create a new flow assignment
   */
  async create(params: CreateFlowAssignmentParams): Promise<FlowAssignment> {
    const id = randomUUID()
    const assignedAt = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO lead_flow_assignments (
        id, clean_lead_id, flow_id, platform_id,
        platform_lead_data, clean_lead_version, priority, assigned_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      params.cleanLeadId,
      params.flowId,
      params.platformId,
      params.platformLeadData ? JSON.stringify(params.platformLeadData) : null,
      params.cleanLeadVersion ?? null,
      params.priority ?? 0,
      assignedAt
    )

    return {
      id,
      cleanLeadId: params.cleanLeadId,
      flowId: params.flowId,
      platformId: params.platformId,
      platformLeadId: null,
      platformLeadData: params.platformLeadData ?? null,
      cleanLeadVersion: params.cleanLeadVersion ?? null,
      status: 'pending',
      priority: params.priority ?? 0,
      assignedAt,
      startedAt: null,
      completedAt: null,
      errorMessage: null
    }
  }

  /**
   * Get an assignment by ID
   */
  async getById(id: string): Promise<FlowAssignment | null> {
    const row = this.db.prepare(`
      SELECT * FROM lead_flow_assignments WHERE id = ?
    `).get(id) as any

    if (!row) return null

    return this.mapRowToAssignment(row)
  }

  /**
   * Update an assignment
   */
  async update(id: string, params: UpdateFlowAssignmentParams): Promise<boolean> {
    const updates: string[] = []
    const values: any[] = []

    if (params.status !== undefined) {
      updates.push('status = ?')
      values.push(params.status)
    }

    if (params.startedAt !== undefined) {
      updates.push('started_at = ?')
      values.push(params.startedAt)
    }

    if (params.completedAt !== undefined) {
      updates.push('completed_at = ?')
      values.push(params.completedAt)
    }

    if (params.errorMessage !== undefined) {
      updates.push('error_message = ?')
      values.push(params.errorMessage)
    }

    if (params.platformLeadData !== undefined) {
      updates.push('platform_lead_data = ?')
      values.push(JSON.stringify(params.platformLeadData))
    }

    if (updates.length === 0) return true

    values.push(id)

    const stmt = this.db.prepare(`
      UPDATE lead_flow_assignments SET ${updates.join(', ')} WHERE id = ?
    `)

    const result = stmt.run(...values)
    return result.changes > 0
  }

  /**
   * Delete an assignment
   */
  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM lead_flow_assignments WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  /**
   * List assignments with optional filters and pagination
   */
  async list(options: ListAssignmentsOptions = {}): Promise<PaginatedAssignments> {
    const { filters = {}, includeDetails = false, orderBy = 'assigned_at', order = 'DESC', limit = 50, offset = 0 } = options

    const { whereClause, params } = this.buildWhereClause(filters)

    // Count total
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as total FROM lead_flow_assignments WHERE ${whereClause}
    `)
    const { total } = countStmt.get(...params) as { total: number }

    // Build query
    const orderByClause = this.buildOrderByClause(orderBy, order)

    let query: string
    if (includeDetails) {
      query = `
        SELECT
          a.*,
          p.slug as platform_slug, p.name as platform_name,
          f.slug as flow_slug, f.name as flow_name
        FROM lead_flow_assignments a
        JOIN platforms_catalog p ON a.platform_id = p.id
        JOIN flows_catalog f ON a.flow_id = f.id
        WHERE ${whereClause}
        ${orderByClause}
        LIMIT ? OFFSET ?
      `
    } else {
      query = `
        SELECT * FROM lead_flow_assignments
        WHERE ${whereClause}
        ${orderByClause}
        LIMIT ? OFFSET ?
      `
    }

    const stmt = this.db.prepare(query)
    const rows = stmt.all(...params, limit, offset) as any[]

    const items = includeDetails
      ? rows.map(row => this.mapRowToAssignmentWithDetails(row))
      : rows.map(row => this.mapRowToAssignment(row))

    return {
      items,
      total,
      limit,
      offset,
      hasMore: offset + items.length < total
    }
  }

  /**
   * Find assignments for a specific lead
   */
  async findByLeadId(cleanLeadId: string): Promise<FlowAssignment[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM lead_flow_assignments WHERE clean_lead_id = ?
      ORDER BY priority DESC, assigned_at DESC
    `)
    const rows = stmt.all(cleanLeadId) as any[]
    return rows.map(row => this.mapRowToAssignment(row))
  }

  /**
   * Check if an assignment exists
   */
  async exists(cleanLeadId: string, flowId: number, platformId: number): Promise<boolean> {
    const stmt = this.db.prepare(`
      SELECT 1 FROM lead_flow_assignments
      WHERE clean_lead_id = ? AND flow_id = ? AND platform_id = ?
    `)
    const row = stmt.get(cleanLeadId, flowId, platformId)
    return !!row
  }

  // =================== PRIVATE HELPERS ===================

  private mapRowToAssignment(row: any): FlowAssignment {
    return {
      id: row.id,
      cleanLeadId: row.clean_lead_id,
      flowId: row.flow_id,
      platformId: row.platform_id,
      platformLeadId: row.platform_lead_id,
      platformLeadData: row.platform_lead_data ? JSON.parse(row.platform_lead_data) : null,
      cleanLeadVersion: row.clean_lead_version,
      status: row.status,
      priority: row.priority,
      assignedAt: row.assigned_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      errorMessage: row.error_message
    }
  }

  private mapRowToAssignmentWithDetails(row: any): FlowAssignmentWithDetails {
    return {
      ...this.mapRowToAssignment(row),
      platformSlug: row.platform_slug,
      platformName: row.platform_name,
      flowSlug: row.flow_slug,
      flowName: row.flow_name
    }
  }

  private buildWhereClause(filters: FlowAssignmentFilters): { whereClause: string; params: any[] } {
    const conditions: string[] = []
    const params: any[] = []

    if (filters.cleanLeadId) {
      conditions.push('clean_lead_id = ?')
      params.push(filters.cleanLeadId)
    }

    if (filters.platformId) {
      conditions.push('platform_id = ?')
      params.push(filters.platformId)
    }

    if (filters.flowId) {
      conditions.push('flow_id = ?')
      params.push(filters.flowId)
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        const placeholders = filters.status.map(() => '?').join(',')
        conditions.push(`status IN (${placeholders})`)
        params.push(...filters.status)
      } else {
        conditions.push('status = ?')
        params.push(filters.status)
      }
    }

    if (filters.priority !== undefined) {
      conditions.push('priority = ?')
      params.push(filters.priority)
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1'
    return { whereClause, params }
  }

  private buildOrderByClause(orderBy: string, order: string): string {
    const validOrderBy = ['priority', 'assigned_at', 'status']
    const column = validOrderBy.includes(orderBy) ? orderBy : 'assigned_at'
    const direction = order === 'ASC' ? 'ASC' : 'DESC'
    return `ORDER BY ${column} ${direction}`
  }
}
