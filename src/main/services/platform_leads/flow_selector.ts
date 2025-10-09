/**
 * Flow selector - selects appropriate flows based on rules and lead data
 * Evaluates flow selection rules and automatically assigns flows to leads
 */

import { getDb } from '../../db/connection'
import type { CleanLead } from '../../../shared/types/leads'
import type {
  FlowSelectionRule,
  FlowConditions,
  FieldCondition
} from '../../../shared/types/platform_leads'
import { getLeadValue } from './utils'

export class FlowSelector {
  private get db() {
    return getDb()
  }

  /**
   * Select best flow for a lead on a specific platform
   * Returns the flow ID that matches the highest priority rule
   */
  async selectFlowForPlatform(lead: CleanLead, platformId: number): Promise<number | null> {
    // Get all active rules for this platform, ordered by priority
    const rules = this.db.prepare(`
      SELECT * FROM flow_selection_rules
      WHERE platform_id = ? AND active = 1
      ORDER BY priority DESC, id ASC
    `).all(platformId) as any[]

    // Evaluate rules in priority order
    for (const rule of rules) {
      const ruleObj: FlowSelectionRule = {
        id: rule.id,
        name: rule.name,
        platformId: rule.platform_id,
        flowId: rule.flow_id,
        conditions: rule.conditions ? JSON.parse(rule.conditions) : null,
        priority: rule.priority,
        active: Boolean(rule.active),
        createdAt: rule.created_at,
        updatedAt: rule.updated_at
      }

      if (this.evaluateRule(lead, ruleObj)) {
        return ruleObj.flowId
      }
    }

    // No rule matched - try to get default flow for platform
    return this.getDefaultFlow(platformId)
  }

  /**
   * Select flows for all selected platforms
   */
  async selectFlowsForLead(lead: CleanLead, platformIds?: number[]): Promise<Array<{ platformId: number; flowId: number }>> {
    const selectedPlatforms = platformIds || await this.getSelectedPlatforms()
    const selections: Array<{ platformId: number; flowId: number }> = []

    for (const platformId of selectedPlatforms) {
      const flowId = await this.selectFlowForPlatform(lead, platformId)
      if (flowId) {
        selections.push({ platformId, flowId })
      }
    }

    return selections
  }

  /**
   * Evaluate if a rule matches a lead
   */
  private evaluateRule(lead: CleanLead, rule: FlowSelectionRule): boolean {
    // If no conditions, rule always matches
    if (!rule.conditions) return true

    // Evaluate all conditions - all must be true
    for (const [fieldPath, condition] of Object.entries(rule.conditions)) {
      if (!this.evaluateCondition(lead, fieldPath, condition)) {
        return false
      }
    }

    return true
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(lead: CleanLead, fieldPath: string, condition: FieldCondition): boolean {
    const value = getLeadValue(lead, fieldPath)

    if ('equals' in condition) {
      return value === condition.equals
    }

    if ('oneOf' in condition) {
      return condition.oneOf.includes(value)
    }

    if ('greaterThan' in condition) {
      return typeof value === 'number' && value > condition.greaterThan
    }

    if ('lessThan' in condition) {
      return typeof value === 'number' && value < condition.lessThan
    }

    if ('contains' in condition) {
      return typeof value === 'string' && value.includes(condition.contains)
    }

    if ('matches' in condition) {
      return typeof value === 'string' && new RegExp(condition.matches).test(value)
    }

    return false
  }

  /**
   * Get default flow for a platform (first active flow)
   */
  private getDefaultFlow(platformId: number): number | null {
    const row = this.db.prepare(`
      SELECT id FROM flows_catalog
      WHERE platform_id = ? AND active = 1
      ORDER BY id ASC
      LIMIT 1
    `).get(platformId) as { id: number } | undefined

    return row?.id ?? null
  }

  /**
   * Get list of selected platform IDs
   */
  private async getSelectedPlatforms(): Promise<number[]> {
    const rows = this.db.prepare(`
      SELECT id FROM platforms_catalog
      WHERE selected = 1
      ORDER BY id ASC
    `).all() as Array<{ id: number }>

    return rows.map(row => row.id)
  }

  /**
   * Get all rules for a platform
   */
  async getRulesForPlatform(platformId: number): Promise<FlowSelectionRule[]> {
    const rows = this.db.prepare(`
      SELECT * FROM flow_selection_rules
      WHERE platform_id = ?
      ORDER BY priority DESC, id ASC
    `).all(platformId) as any[]

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      platformId: row.platform_id,
      flowId: row.flow_id,
      conditions: row.conditions ? JSON.parse(row.conditions) : null,
      priority: row.priority,
      active: Boolean(row.active),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  /**
   * Create a new flow selection rule
   */
  async createRule(params: {
    name: string
    platformId: number
    flowId: number
    conditions?: FlowConditions
    priority?: number
    active?: boolean
  }): Promise<FlowSelectionRule> {
    const stmt = this.db.prepare(`
      INSERT INTO flow_selection_rules (
        name, platform_id, flow_id, conditions, priority, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `)

    const result = stmt.run(
      params.name,
      params.platformId,
      params.flowId,
      params.conditions ? JSON.stringify(params.conditions) : null,
      params.priority ?? 0,
      params.active !== false ? 1 : 0
    )

    const created = this.db.prepare(`
      SELECT * FROM flow_selection_rules WHERE id = ?
    `).get(result.lastInsertRowid) as any

    return {
      id: created.id,
      name: created.name,
      platformId: created.platform_id,
      flowId: created.flow_id,
      conditions: created.conditions ? JSON.parse(created.conditions) : null,
      priority: created.priority,
      active: Boolean(created.active),
      createdAt: created.created_at,
      updatedAt: created.updated_at
    }
  }

  /**
   * Update a flow selection rule
   */
  async updateRule(id: number, params: Partial<Pick<FlowSelectionRule, 'name' | 'flowId' | 'conditions' | 'priority' | 'active'>>): Promise<boolean> {
    const updates: string[] = []
    const values: any[] = []

    if (params.name !== undefined) {
      updates.push('name = ?')
      values.push(params.name)
    }

    if (params.flowId !== undefined) {
      updates.push('flow_id = ?')
      values.push(params.flowId)
    }

    if (params.conditions !== undefined) {
      updates.push('conditions = ?')
      values.push(params.conditions ? JSON.stringify(params.conditions) : null)
    }

    if (params.priority !== undefined) {
      updates.push('priority = ?')
      values.push(params.priority)
    }

    if (params.active !== undefined) {
      updates.push('active = ?')
      values.push(params.active ? 1 : 0)
    }

    if (updates.length === 0) return true

    updates.push('updated_at = datetime(\'now\')')
    values.push(id)

    const stmt = this.db.prepare(`
      UPDATE flow_selection_rules SET ${updates.join(', ')} WHERE id = ?
    `)

    const result = stmt.run(...values)
    return result.changes > 0
  }

  /**
   * Delete a flow selection rule
   */
  async deleteRule(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM flow_selection_rules WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
}
