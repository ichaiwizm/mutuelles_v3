/**
 * TASK SERVICE - Gestion de la file d'attente de tâches
 *
 * Service central pour gérer les tâches d'automatisation.
 * Implémente la logique de file d'attente (queue).
 */

import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Tache, TacheStatus, TacheFilters } from '../../shared/types/models';

export class TaskService {
  constructor(private db: Database) {}

  /**
   * Crée une nouvelle tâche
   */
  create(task: Omit<Tache, 'id' | 'createdAt' | 'status'>): Tache {
    const newTask: Tache = {
      ...task,
      id: uuidv4(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: task.maxRetries || 3,
      priority: task.priority || 1,
    };

    const stmt = this.db.prepare(`
      INSERT INTO tasks (
        id, lead_id, platform_key, product_key, status, priority,
        result, created_at, started_at, completed_at,
        retry_count, max_retries
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      newTask.id,
      newTask.leadId,
      newTask.platformKey,
      newTask.productKey,
      newTask.status,
      newTask.priority,
      newTask.result ? JSON.stringify(newTask.result) : null,
      newTask.createdAt,
      newTask.startedAt || null,
      newTask.completedAt || null,
      newTask.retryCount,
      newTask.maxRetries
    );

    return newTask;
  }

  /**
   * Récupère une tâche par ID
   */
  getById(id: string): Tache | null {
    const stmt = this.db.prepare(`
      SELECT * FROM tasks WHERE id = ?
    `);

    const row = stmt.get(id) as any;

    if (!row) return null;

    return this.rowToTask(row);
  }

  /**
   * Récupère toutes les tâches avec filtres
   */
  getAll(filters?: TacheFilters): Tache[] {
    let query = 'SELECT * FROM tasks';

    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.leadId) {
      conditions.push('lead_id = ?');
      params.push(filters.leadId);
    }

    if (filters?.platformKey) {
      conditions.push('platform_key = ?');
      params.push(filters.platformKey);
    }

    if (filters?.productKey) {
      conditions.push('product_key = ?');
      params.push(filters.productKey);
    }

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        const placeholders = filters.status.map(() => '?').join(',');
        conditions.push(`status IN (${placeholders})`);
        params.push(...filters.status);
      } else {
        conditions.push('status = ?');
        params.push(filters.status);
      }
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY priority DESC, created_at ASC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => this.rowToTask(row));
  }

  /**
   * Récupère les tâches pour un lead spécifique
   */
  getByLeadId(leadId: string): Tache[] {
    return this.getAll({ leadId });
  }

  /**
   * Récupère la prochaine tâche à exécuter
   */
  getNext(): Tache | null {
    const stmt = this.db.prepare(`
      SELECT * FROM tasks
      WHERE status = 'pending'
      ORDER BY priority DESC, created_at ASC
      LIMIT 1
    `);

    const row = stmt.get() as any;

    if (!row) return null;

    return this.rowToTask(row);
  }

  /**
   * Met à jour le statut d'une tâche
   */
  updateStatus(
    id: string,
    status: TacheStatus,
    additionalData?: Partial<Tache>
  ): Tache | null {
    const existing = this.getById(id);

    if (!existing) return null;

    const updates: Partial<Tache> = {
      status,
      ...additionalData,
    };

    // Timestamps automatiques
    if (status === 'running' && !existing.startedAt) {
      updates.startedAt = new Date().toISOString();
    }

    if (
      (status === 'completed' || status === 'failed' || status === 'cancelled') &&
      !existing.completedAt
    ) {
      updates.completedAt = new Date().toISOString();
    }

    const stmt = this.db.prepare(`
      UPDATE tasks
      SET
        status = ?,
        started_at = ?,
        completed_at = ?,
        result = ?,
        retry_count = ?
      WHERE id = ?
    `);

    stmt.run(
      updates.status,
      updates.startedAt || existing.startedAt || null,
      updates.completedAt || existing.completedAt || null,
      updates.result ? JSON.stringify(updates.result) : existing.result ? JSON.stringify(existing.result) : null,
      updates.retryCount !== undefined ? updates.retryCount : existing.retryCount,
      id
    );

    return this.getById(id);
  }

  /**
   * Marque une tâche comme en cours
   */
  markAsRunning(id: string): Tache | null {
    return this.updateStatus(id, 'running');
  }

  /**
   * Marque une tâche comme complétée
   */
  markAsCompleted(id: string, result: Tache['result']): Tache | null {
    return this.updateStatus(id, 'completed', { result });
  }

  /**
   * Marque une tâche comme échouée
   */
  markAsFailed(id: string, result: Tache['result']): Tache | null {
    const task = this.getById(id);

    if (!task) return null;

    // Incrémenter retry_count
    const retryCount = (task.retryCount || 0) + 1;

    // Si on peut réessayer, remettre en pending
    if (retryCount < (task.maxRetries || 3)) {
      return this.updateStatus(id, 'pending', { result, retryCount });
    }

    // Sinon, marquer comme failed
    return this.updateStatus(id, 'failed', { result, retryCount });
  }

  /**
   * Annule une tâche
   */
  cancel(id: string): Tache | null {
    return this.updateStatus(id, 'cancelled');
  }

  /**
   * Supprime une tâche
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Compte le nombre de tâches par statut
   */
  countByStatus(): Record<TacheStatus, number> {
    const stmt = this.db.prepare(`
      SELECT status, COUNT(*) as count
      FROM tasks
      GROUP BY status
    `);

    const rows = stmt.all() as any[];

    const counts: Record<TacheStatus, number> = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    rows.forEach((row) => {
      counts[row.status as TacheStatus] = row.count;
    });

    return counts;
  }

  /**
   * Convertit une ligne DB en Tache
   */
  private rowToTask(row: any): Tache {
    return {
      id: row.id,
      leadId: row.lead_id,
      platformKey: row.platform_key,
      productKey: row.product_key,
      status: row.status as TacheStatus,
      priority: row.priority,
      result: row.result ? JSON.parse(row.result) : undefined,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
    };
  }
}
