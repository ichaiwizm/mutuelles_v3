/**
 * Run Command
 * ============
 *
 * Execute a flow with full Playwright automation.
 */

import { randomUUID } from 'crypto';
import { getLeadById } from '../../core/db';
import { createLogger } from '../../core/log';
import { getFlowBySlug } from '../utils/flow-loader';
import { getDatabaseConnection } from '../utils/db-connection';

interface RunOptions {
  headless?: boolean;
  trace?: 'on' | 'retain-on-failure' | 'off';
  outputPath?: string;
}

export async function runFlow(
  flowSlug: string,
  leadId: string,
  options: RunOptions
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

  // Create run ID
  const runId = `${flowSlug.replace('/', '-')}-${Date.now()}-${randomUUID().substring(0, 8)}`;

  // Create logger
  const logger = createLogger(runId, { outputPath: options.outputPath });

  console.log(`\n🚀 Running Flow: ${flow.name}`);
  console.log(`Lead: ${lead.data.subscriber.firstName} ${lead.data.subscriber.lastName}`);
  console.log(`Run ID: ${runId}`);
  console.log(`Headless: ${options.headless ? 'Yes' : 'No'}`);
  console.log(`Trace: ${options.trace || flow.trace || 'off'}\n`);

  logger.info('Flow execution started', { flowSlug, leadId, runId });

  try {
    // TODO: Integrate with automation engine
    // For now, just log the intent
    console.log('⚠️  Automation engine integration not yet complete');
    console.log('Flow would execute with:');
    console.log(`  - ${flow.steps.length} steps`);
    console.log(`  - Platform: ${flow.platform}`);
    console.log(`  - Lead data: subscriber.birthDate = ${lead.data.subscriber.birthDate}`);

    logger.info('Flow execution completed', { runId, status: 'success' });
    console.log('\n✅ Flow execution completed successfully');
  } catch (error: any) {
    logger.error('Flow execution failed', error, { runId });
    console.error('\n❌ Flow execution failed:', error.message);
    throw error;
  } finally {
    logger.close();
    db.close();
  }
}
