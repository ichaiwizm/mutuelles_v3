/**
 * Run Command
 * ============
 *
 * Execute a flow with full Playwright automation.
 */

import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { getLeadById } from '../../src/shared/db/queries/leads';
import { createLogger } from '../../core/log';
import { FlowRunner } from '../../core/engine';
import { getFlowBySlug, getPlatformSelectors } from '../utils/flow-loader';
import { getDatabaseConnection } from '../utils/db-connection';
import { getCredentialsForPlatform } from '../utils/credentials';
import { computeDerivedFields } from '../../src/shared/businessRules/computedValues';
import { setLeadPath } from '../../core/resolve/path';

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

  // Apply computed/derived fields to lead data
  const computedFields = computeDerivedFields(lead.data);
  for (const [fieldPath, value] of Object.entries(computedFields)) {
    setLeadPath(lead.data, fieldPath, value);
  }

  // Load flow
  const flow = await getFlowBySlug(flowSlug);
  if (!flow) {
    throw new Error(`Flow not found: ${flowSlug}`);
  }

  // Load selectors
  const selectors = await getPlatformSelectors(flow.platform);
  if (!selectors) {
    throw new Error(`Selectors not found for platform: ${flow.platform}`);
  }

  // Load credentials
  const credentials = getCredentialsForPlatform(db, flow.platform);

  // Create run ID
  const runId = `${flowSlug.replace('/', '-')}-${Date.now()}-${randomUUID().substring(0, 8)}`;

  // Create run directory structure
  const projectRoot = process.cwd();
  const runsDir = path.join(projectRoot, 'runs');
  const runDir = path.join(runsDir, runId);

  // Create directories
  fs.mkdirSync(runDir, { recursive: true });

  const screenshotsDir = path.join(runDir, 'screenshots');
  const tracesDir = path.join(runDir, 'traces');
  fs.mkdirSync(screenshotsDir, { recursive: true });
  fs.mkdirSync(tracesDir, { recursive: true });

  // Create manifest
  const manifest = {
    runId,
    flowSlug,
    flowName: flow.name,
    platform: flow.platform,
    leadId,
    leadName: `${lead.data.subscriber.firstName || ''} ${lead.data.subscriber.lastName || ''}`.trim(),
    startedAt: new Date().toISOString(),
    options: {
      headless: options.headless,
      trace: options.trace || flow.trace || 'off'
    }
  };

  fs.writeFileSync(
    path.join(runDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  // Create logger with custom output path
  const logPath = path.join(runDir, 'run.log');
  const logger = createLogger(runId, { outputPath: logPath });

  console.log(`\n🚀 Running Flow: ${flow.name}`);
  console.log(`Lead: ${lead.data.subscriber.firstName} ${lead.data.subscriber.lastName}`);
  console.log(`Run ID: ${runId}`);
  console.log(`Output: ${runDir}`);
  console.log(`Headless: ${options.headless ? 'Yes' : 'No'}`);
  console.log(`Trace: ${options.trace || flow.trace || 'off'}\n`);

  logger.info('Flow execution started', { flowSlug, leadId, runId, runDir });

  try {
    // Execute flow
    const runner = new FlowRunner(runId, logger);
    const result = await runner.execute(flow, lead.data, selectors, credentials, {
      headless: options.headless,
      trace: options.trace || (flow.trace as any),
      timeout: 30000,
      screenshots: true,
      outputDir: runDir,
    });

    // Update manifest with results
    const finalManifest = {
      ...manifest,
      completedAt: new Date().toISOString(),
      duration: result.duration,
      success: result.success,
      stepsExecuted: result.stepsExecuted,
      stepsFailed: result.stepsFailed,
      error: result.error || null
    };

    fs.writeFileSync(
      path.join(runDir, 'manifest.json'),
      JSON.stringify(finalManifest, null, 2)
    );

    if (result.success) {
      logger.info('Flow execution completed', { runId, ...result });
      console.log(`\n✅ Flow execution completed successfully`);
      console.log(`   Duration: ${result.duration}ms`);
      console.log(`   Steps executed: ${result.stepsExecuted}`);
      console.log(`   Output: ${runDir}`);
    } else {
      logger.error('Flow execution failed', result.error || 'Unknown error', { runId, ...result });
      console.error(`\n❌ Flow execution failed`);
      console.error(`   Error: ${result.error}`);
      console.error(`   Steps executed: ${result.stepsExecuted}`);
      console.error(`   Steps failed: ${result.stepsFailed}`);
      console.error(`   Output: ${runDir}`);
      process.exit(1);
    }
  } catch (error: any) {
    // Update manifest with error
    const errorManifest = {
      ...manifest,
      completedAt: new Date().toISOString(),
      success: false,
      error: error.message
    };

    fs.writeFileSync(
      path.join(runDir, 'manifest.json'),
      JSON.stringify(errorManifest, null, 2)
    );

    logger.error('Flow execution failed', error, { runId });
    console.error('\n❌ Flow execution failed:', error.message);
    console.error(`   Output: ${runDir}`);
    throw error;
  } finally {
    logger.close();
    db.close();
  }
}
