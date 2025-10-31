/**
 * LEAD SERVICE - Gestion des Leads (CRUD)
 *
 * Service central pour toutes les opérations sur les LeadGenerique.
 * Utilise la base de données SQLite pour la persistance.
 */

import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import {
  LeadGenerique,
  LeadFilters,
  LeadMetadata,
} from '../../shared/types/models';

export class LeadService {
  constructor(private db: Database) {}

  /**
   * Crée un nouveau lead
   */
  create(lead: Omit<LeadGenerique, 'id' | 'createdAt'>): LeadGenerique {
    const newLead: LeadGenerique = {
      ...lead,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };

    const stmt = this.db.prepare(`
      INSERT INTO leads (id, data, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const { id, createdAt, metadata, ...data } = newLead;

    stmt.run(
      id,
      JSON.stringify(data),
      JSON.stringify(metadata),
      createdAt,
      null
    );

    return newLead;
  }

  /**
   * Récupère un lead par son ID
   */
  getById(id: string): LeadGenerique | null {
    const stmt = this.db.prepare(`
      SELECT id, data, metadata, created_at, updated_at
      FROM leads
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;

    if (!row) return null;

    return this.rowToLead(row);
  }

  /**
   * Récupère tous les leads avec filtres optionnels
   */
  getAll(filters?: LeadFilters): LeadGenerique[] {
    let query = `
      SELECT id, data, metadata, created_at, updated_at
      FROM leads
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    // Filtre par recherche (nom, email)
    if (filters?.search) {
      conditions.push(`(
        data LIKE ? OR
        data LIKE ?
      )`);
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern);
    }

    // Filtre par source
    if (filters?.source) {
      conditions.push(`metadata LIKE ?`);
      params.push(`%"source":"${filters.source}"%`);
    }

    // Filtre par tags
    if (filters?.tags && filters.tags.length > 0) {
      filters.tags.forEach((tag) => {
        conditions.push(`metadata LIKE ?`);
        params.push(`%"${tag}"%`);
      });
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY created_at DESC`;

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => this.rowToLead(row));
  }

  /**
   * Met à jour un lead
   */
  update(
    id: string,
    updates: Partial<Omit<LeadGenerique, 'id' | 'createdAt'>>
  ): LeadGenerique | null {
    const existing = this.getById(id);

    if (!existing) return null;

    const updated: LeadGenerique = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const { id: _, createdAt, metadata, updatedAt, ...data } = updated;

    const stmt = this.db.prepare(`
      UPDATE leads
      SET data = ?, metadata = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(JSON.stringify(data), JSON.stringify(metadata), updatedAt, id);

    return updated;
  }

  /**
   * Supprime un lead
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM leads WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Compte le nombre de leads
   */
  count(filters?: LeadFilters): number {
    let query = 'SELECT COUNT(*) as count FROM leads';

    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.search) {
      conditions.push(`(data LIKE ? OR data LIKE ?)`);
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern);
    }

    if (filters?.source) {
      conditions.push(`metadata LIKE ?`);
      params.push(`%"source":"${filters.source}"%`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const stmt = this.db.prepare(query);
    const result = stmt.get(...params) as any;
    return result.count;
  }

  /**
   * Convertit une ligne DB en LeadGenerique
   */
  private rowToLead(row: any): LeadGenerique {
    const data = JSON.parse(row.data);
    const metadata = JSON.parse(row.metadata || '{}');

    return {
      id: row.id,
      ...data,
      metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
