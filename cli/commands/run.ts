/**
 * Run Command
 * ============
 *
 * Execute a flow with full Playwright automation.
 */

import { randomUUID } from 'crypto';
import { getLeadById } from '../../core/db';
import { createLogger } from '../../core/log';
import { FlowRunner } from '../../core/engine';
import { getFlowBySlug, getPlatformSelectors } from '../utils/flow-loader';
import { getDatabaseConnection } from '../utils/db-connection';
import { getCredentialsForPlatform } from '../utils/credentials';

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

  // Load selectors
  const selectors = getPlatformSelectors(flow.platform);
  if (!selectors) {
    throw new Error(`Selectors not found for platform: ${flow.platform}`);
  }

  // Load credentials
  const credentials = getCredentialsForPlatform(db, flow.platform);

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
    // Execute flow
    const runner = new FlowRunner(runId, logger);
    const result = await runner.execute(flow, lead.data, selectors, credentials, {
      headless: options.headless,
      trace: options.trace || (flow.trace as any),
      timeout: 30000,
      screenshots: true,
    });

    if (result.success) {
      logger.info('Flow execution completed', { runId, ...result });
      console.log(`\n✅ Flow execution completed successfully`);
      console.log(`   Duration: ${result.duration}ms`);
      console.log(`   Steps executed: ${result.stepsExecuted}`);
    } else {
      logger.error('Flow execution failed', result.error || 'Unknown error', { runId, ...result });
      console.error(`\n❌ Flow execution failed`);
      console.error(`   Error: ${result.error}`);
      console.error(`   Steps executed: ${result.stepsExecuted}`);
      console.error(`   Steps failed: ${result.stepsFailed}`);
      process.exit(1);
    }
  } catch (error: any) {
    logger.error('Flow execution failed', error, { runId });
    console.error('\n❌ Flow execution failed:', error.message);
    throw error;
  } finally {
    logger.close();
    db.close();
  }
}
