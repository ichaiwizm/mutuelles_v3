#!/usr/bin/env node
export default {
  version: '014',
  name: 'create_lead_flow_assignments',
  description: 'Create lead_flow_assignments table to track which flows should be executed for each lead',

  up(db) {
    db.exec(`
      -- Create table to manage lead + flow + platform assignments
      CREATE TABLE IF NOT EXISTS lead_flow_assignments (
        id TEXT PRIMARY KEY,
        clean_lead_id TEXT NOT NULL REFERENCES clean_leads(id) ON DELETE CASCADE,
        flow_id INTEGER NOT NULL REFERENCES flows_catalog(id) ON DELETE CASCADE,
        platform_id INTEGER NOT NULL REFERENCES platforms_catalog(id) ON DELETE CASCADE,
        platform_lead_id TEXT DEFAULT NULL REFERENCES platform_leads(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
        priority INTEGER DEFAULT 0,
        assigned_at TEXT DEFAULT (datetime('now')),
        started_at TEXT DEFAULT NULL,
        completed_at TEXT DEFAULT NULL,
        error_message TEXT DEFAULT NULL,
        UNIQUE(clean_lead_id, flow_id, platform_id)
      );

      -- Index for querying assignments by status (to find pending work)
      CREATE INDEX IF NOT EXISTS idx_assignments_status
        ON lead_flow_assignments(status);

      -- Index for querying assignments by lead (to see all flows for a lead)
      CREATE INDEX IF NOT EXISTS idx_assignments_lead
        ON lead_flow_assignments(clean_lead_id);

      -- Index for querying assignments by platform (to see all work for a platform)
      CREATE INDEX IF NOT EXISTS idx_assignments_platform
        ON lead_flow_assignments(platform_id);

      -- Index for querying assignments by flow (to see which leads use a flow)
      CREATE INDEX IF NOT EXISTS idx_assignments_flow
        ON lead_flow_assignments(flow_id);

      -- Index for priority-based processing (pending work ordered by priority)
      CREATE INDEX IF NOT EXISTS idx_assignments_priority
        ON lead_flow_assignments(status, priority DESC, assigned_at);
    `)

    console.log('  ✓ Table lead_flow_assignments créée')
    console.log('  ✓ Contrainte UNIQUE sur (clean_lead_id, flow_id, platform_id)')
    console.log('  ✓ Index créés pour status, lead, platform, flow, et priority')
  },

  down(db) {
    db.exec(`
      -- Drop all indexes
      DROP INDEX IF EXISTS idx_assignments_priority;
      DROP INDEX IF EXISTS idx_assignments_flow;
      DROP INDEX IF EXISTS idx_assignments_platform;
      DROP INDEX IF EXISTS idx_assignments_lead;
      DROP INDEX IF EXISTS idx_assignments_status;

      -- Drop table
      DROP TABLE IF EXISTS lead_flow_assignments;
    `)

    console.log('  ✓ Migration 014 annulée - table lead_flow_assignments supprimée')
  }
}
