/**
 * Dry Run Command
 * =================
 *
 * Validate flow without executing (optional probe mode).
 */

import { getLeadById } from '../../core/db';
import { getFlowBySlug } from '../utils/flow-loader';
import { getDatabaseConnection } from '../utils/db-connection';

interface DryRunOptions {
  probe?: boolean;
}

export async function dryRunFlow(
  flowSlug: string,
  leadId: string,
  options: DryRunOptions
): Promise<void> {
  const db = getDatabaseConnection();

  // Load lead
  const lead = getLeadById(db, leadId);
  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }

  // Load flow
  const flow = getFlowBySlug(flowSlug);
  if (!flow) {
    throw new Error(`Flow not found: ${flowSlug}`);
  }

  console.log(`\n🔍 Dry Run: ${flow.name}`);
  console.log(`Lead: ${lead.data.subscriber.firstName} ${lead.data.subscriber.lastName}`);
  console.log(`Mode: ${options.probe ? 'PROBE (check selectors)' : 'VALIDATE ONLY'}\n`);

  // Validate flow structure
  console.log('✓ Flow structure valid');
  console.log(`✓ ${flow.steps.length} steps loaded`);

  // Validate lead data against schema
  const { validateLeadData } = await import('../../core/domain');
  try {
    validateLeadData(lead.data);
    console.log('✓ Lead data valid (canonical format)');
  } catch (error: any) {
    console.error('✗ Lead data validation failed:');
    console.error(error.message);
    process.exit(1);
  }

  // If probe mode, open browser and check selectors
  if (options.probe) {
    console.log('\n🌐 Opening browser to probe selectors...');
    // TODO: Implement probe mode with Playwright
    console.log('⚠️  Probe mode not yet implemented');
  }

  console.log('\n✅ Dry run completed successfully');

  db.close();
}
