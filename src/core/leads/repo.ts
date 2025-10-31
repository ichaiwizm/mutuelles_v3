import { getDb } from '../db/connection'
import type { LeadGenerique } from '../../shared/types/canonical'

export function insertLead(lead: LeadGenerique) {
  const db = getDb()
  const stmt = db.prepare('INSERT INTO leads(id, data, created_at) VALUES(?, ?, ?)')
  stmt.run(lead.id, JSON.stringify(lead), lead.createdAt)
}

export function listLeads(limit = 100): LeadGenerique[] {
  const db = getDb()
  const rows = db.prepare('SELECT data FROM leads ORDER BY created_at DESC LIMIT ?').all(limit) as { data: string }[]
  return rows.map((r) => JSON.parse(r.data)) as LeadGenerique[]
}

export function getLeadById(id: string): LeadGenerique | null {
  const db = getDb()
  const row = db.prepare('SELECT data FROM leads WHERE id = ?').get(id) as { data?: string } | undefined
  return row?.data ? (JSON.parse(row.data) as LeadGenerique) : null
}

