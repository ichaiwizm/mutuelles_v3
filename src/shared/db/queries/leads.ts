/**
 * Lead database queries
 * Used by: Electron main process and CLI scripts
 */

import type Database from 'better-sqlite3'

export interface LeadData {
  id: string
  data: any
  metadata: any
  createdAt: string
}

/**
 * Get a lead by ID from the database
 */
export function getLeadById(db: Database.Database, id: string): LeadData | null {
  const row = db
    .prepare(
      `
    SELECT id, data, metadata, created_at
    FROM clean_leads
    WHERE id = ?
  `
    )
    .get(id) as any

  if (!row) return null

  return {
    id: row.id,
    data: JSON.parse(row.data),
    metadata: JSON.parse(row.metadata || '{}'),
    createdAt: row.created_at
  }
}

/**
 * List leads from the database with optional filtering
 */
export function listLeads(
  db: Database.Database,
  options: { limit?: number; search?: string } = {}
): LeadData[] {
  const { limit = 100, search = '' } = options

  let query = 'SELECT id, data, metadata, created_at FROM clean_leads'
  const params: any[] = []

  if (search) {
    query += ` WHERE
      JSON_EXTRACT(data, '$.subscriber.lastName') LIKE ? OR
      JSON_EXTRACT(data, '$.subscriber.firstName') LIKE ? OR
      JSON_EXTRACT(data, '$.subscriber.email') LIKE ?
    `
    const term = `%${search}%`
    params.push(term, term, term)
  }

  query += ' ORDER BY created_at DESC LIMIT ?'
  params.push(limit)

  const rows = db.prepare(query).all(...params) as any[]

  return rows.map((row) => ({
    id: row.id,
    data: JSON.parse(row.data),
    metadata: JSON.parse(row.metadata || '{}'),
    createdAt: row.created_at
  }))
}

/**
 * Get a human-readable display name for a lead
 */
export function getLeadDisplayName(lead: LeadData): string {
  const subscriber = lead.data?.subscriber || {}
  const first = subscriber.firstName || ''
  const last = subscriber.lastName || ''
  const name = `${first} ${last}`.trim()
  return name || lead.id.slice(0, 8)
}

/**
 * Count total number of leads in the database
 */
export function countLeads(db: Database.Database): number {
  const row = db.prepare('SELECT COUNT(*) as count FROM clean_leads').get() as any
  return row.count
}
