#!/usr/bin/env node
// Leads access functions for CLI scripts (ESM)
// Equivalent to src/main/services/leads.ts but for Node.js scripts

import { getDb } from './connection.mjs'

/**
 * Get a lead by ID from the database
 * @param {string} id - Lead UUID
 * @returns {Object|null} Lead object with { id, data, metadata, createdAt } or null if not found
 */
export function getLeadById(id) {
  const db = getDb()
  const row = db.prepare(`
    SELECT id, data, metadata, created_at
    FROM clean_leads
    WHERE id = ?
  `).get(id)

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
 * @param {Object} options - Options for listing
 * @param {number} options.limit - Maximum number of leads to return (default: 100)
 * @param {string} options.search - Search term for filtering by name, email, or phone
 * @returns {Array} Array of lead objects
 */
export function listLeads({ limit = 100, search = '' } = {}) {
  const db = getDb()

  let query = 'SELECT id, data, metadata, created_at FROM clean_leads'
  const params = []

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

  const rows = db.prepare(query).all(...params)

  return rows.map(row => ({
    id: row.id,
    data: JSON.parse(row.data),
    metadata: JSON.parse(row.metadata || '{}'),
    createdAt: row.created_at
  }))
}

/**
 * Get a human-readable display name for a lead
 * @param {Object} lead - Lead object from getLeadById() or listLeads()
 * @returns {string} Display name (firstName lastName or ID prefix)
 */
export function getLeadDisplayName(lead) {
  const subscriber = lead.data?.subscriber || {}
  const first = subscriber.firstName || ''
  const last = subscriber.lastName || ''
  const name = `${first} ${last}`.trim()
  return name || lead.id.slice(0, 8)
}

/**
 * Count total number of leads in the database
 * @returns {number} Total number of leads
 */
export function countLeads() {
  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) as count FROM clean_leads').get()
  return row.count
}
