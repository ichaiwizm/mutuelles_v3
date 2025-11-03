/**
 * Database Queries (v2)
 * ======================
 *
 * Simple, focused queries for the new schema.
 * Max 10 queries total.
 */

import type { Database } from 'better-sqlite3';
import type { Lead, LeadData } from '../domain';

// ============================================================
// LEADS
// ============================================================

/**
 * Create a new lead (with fingerprints)
 */
export function createLead(
  db: Database,
  lead: Lead
): void {
  const stmt = db.prepare(`
    INSERT INTO leads (id, data, fingerprint_primary, fingerprint_email, fingerprint_phone, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    lead.id,
    JSON.stringify(lead.data),
    lead.fingerprintPrimary,
    lead.fingerprintEmail || null,
    lead.fingerprintPhone || null,
    lead.metadata ? JSON.stringify(lead.metadata) : null,
    lead.createdAt,
    lead.updatedAt
  );
}

/**
 * Get lead by ID
 */
export function getLeadById(db: Database, id: string): Lead | null {
  const stmt = db.prepare(`SELECT * FROM leads WHERE id = ?`);
  const row = stmt.get(id) as any;

  if (!row) return null;

  return {
    id: row.id,
    data: JSON.parse(row.data),
    fingerprintPrimary: row.fingerprint_primary,
    fingerprintEmail: row.fingerprint_email,
    fingerprintPhone: row.fingerprint_phone,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Find lead by primary fingerprint (for deduplication)
 */
export function findLeadByFingerprint(db: Database, fingerprint: string): Lead | null {
  const stmt = db.prepare(`SELECT * FROM leads WHERE fingerprint_primary = ?`);
  const row = stmt.get(fingerprint) as any;

  if (!row) return null;

  return {
    id: row.id,
    data: JSON.parse(row.data),
    fingerprintPrimary: row.fingerprint_primary,
    fingerprintEmail: row.fingerprint_email,
    fingerprintPhone: row.fingerprint_phone,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * List all leads (with pagination)
 */
export function listLeads(
  db: Database,
  options: { limit?: number; offset?: number } = {}
): Lead[] {
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const stmt = db.prepare(`
    SELECT * FROM leads
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);

  const rows = stmt.all(limit, offset) as any[];

  return rows.map((row) => ({
    id: row.id,
    data: JSON.parse(row.data),
    fingerprintPrimary: row.fingerprint_primary,
    fingerprintEmail: row.fingerprint_email,
    fingerprintPhone: row.fingerprint_phone,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Count total leads
 */
export function countLeads(db: Database): number {
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM leads`);
  const row = stmt.get() as any;
  return row.count;
}

/**
 * Update lead data
 */
export function updateLead(db: Database, id: string, data: LeadData): void {
  const stmt = db.prepare(`
    UPDATE leads
    SET data = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  stmt.run(JSON.stringify(data), id);
}

/**
 * Delete lead
 */
export function deleteLead(db: Database, id: string): void {
  const stmt = db.prepare(`DELETE FROM leads WHERE id = ?`);
  stmt.run(id);
}

/**
 * Search leads (simple full-text search on JSON data)
 */
export function searchLeads(db: Database, query: string, limit = 50): Lead[] {
  const stmt = db.prepare(`
    SELECT * FROM leads
    WHERE data LIKE ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const rows = stmt.all(`%${query}%`, limit) as any[];

  return rows.map((row) => ({
    id: row.id,
    data: JSON.parse(row.data),
    fingerprintPrimary: row.fingerprint_primary,
    fingerprintEmail: row.fingerprint_email,
    fingerprintPhone: row.fingerprint_phone,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

// ============================================================
// RUNS
// ============================================================

/**
 * Create a new run
 */
export function createRun(
  db: Database,
  run: { id: string; status: string; meta?: any }
): void {
  const stmt = db.prepare(`
    INSERT INTO runs (id, status, started_at, meta)
    VALUES (?, ?, datetime('now'), ?)
  `);

  stmt.run(run.id, run.status, run.meta ? JSON.stringify(run.meta) : null);
}

/**
 * Get run by ID
 */
export function getRunById(db: Database, id: string): any | null {
  const stmt = db.prepare(`SELECT * FROM runs WHERE id = ?`);
  const row = stmt.get(id) as any;

  if (!row) return null;

  return {
    id: row.id,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    meta: row.meta ? JSON.parse(row.meta) : undefined,
  };
}

/**
 * Update run status
 */
export function updateRunStatus(
  db: Database,
  id: string,
  status: string,
  finishedAt?: string
): void {
  const stmt = db.prepare(`
    UPDATE runs
    SET status = ?, finished_at = ?
    WHERE id = ?
  `);

  stmt.run(status, finishedAt || null, id);
}
