#!/usr/bin/env node
export default {
  version: '004',
  name: 'add_indexes',
  description: 'Create performance indexes for all tables',

  up(db) {
    db.exec(`
      -- Index divers pour performances
      CREATE INDEX IF NOT EXISTS idx_user_platforms_platform_id ON user_platforms(platform_id);
      CREATE INDEX IF NOT EXISTS idx_platform_credentials_platform_id ON platform_credentials(platform_id);
      CREATE INDEX IF NOT EXISTS idx_platform_pages_platform_id ON platform_pages(platform_id);
      CREATE INDEX IF NOT EXISTS idx_platform_fields_page_id ON platform_fields(page_id);

      -- Index pour les flows
      CREATE INDEX IF NOT EXISTS idx_flows_platform ON flows_catalog(platform_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_flow_steps_order ON flow_steps(flow_id, order_index);
      CREATE INDEX IF NOT EXISTS idx_flows_runs_flow ON flows_runs(flow_id, started_at DESC);

      -- Index pour les tables leads
      CREATE INDEX IF NOT EXISTS idx_raw_leads_source ON raw_leads(source);
      CREATE INDEX IF NOT EXISTS idx_raw_leads_extracted_at ON raw_leads(extracted_at DESC);
      CREATE INDEX IF NOT EXISTS idx_clean_leads_raw_lead_id ON clean_leads(raw_lead_id);
      CREATE INDEX IF NOT EXISTS idx_clean_leads_quality_score ON clean_leads(quality_score DESC);
      CREATE INDEX IF NOT EXISTS idx_platform_leads_clean_lead_id ON platform_leads(clean_lead_id);
      CREATE INDEX IF NOT EXISTS idx_platform_leads_platform_id ON platform_leads(platform_id);
      CREATE INDEX IF NOT EXISTS idx_platform_leads_status ON platform_leads(status);
    `)
  },

  down(db) {
    db.exec(`
      -- Index flows
      DROP INDEX IF EXISTS idx_flows_platform;
      DROP INDEX IF EXISTS idx_flow_steps_order;
      DROP INDEX IF EXISTS idx_flows_runs_flow;

      -- Index leads
      DROP INDEX IF EXISTS idx_raw_leads_source;
      DROP INDEX IF EXISTS idx_raw_leads_extracted_at;
      DROP INDEX IF EXISTS idx_clean_leads_raw_lead_id;
      DROP INDEX IF EXISTS idx_clean_leads_quality_score;
      DROP INDEX IF EXISTS idx_platform_leads_clean_lead_id;
      DROP INDEX IF EXISTS idx_platform_leads_platform_id;
      DROP INDEX IF EXISTS idx_platform_leads_status;

      -- Index core tables
      DROP INDEX IF EXISTS idx_user_platforms_platform_id;
      DROP INDEX IF EXISTS idx_platform_credentials_platform_id;
      DROP INDEX IF EXISTS idx_platform_pages_platform_id;
      DROP INDEX IF EXISTS idx_platform_fields_page_id;
    `)
  }
}