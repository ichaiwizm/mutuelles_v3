#!/usr/bin/env node
/**
 * CLI Entry Point
 * ================
 *
 * Main CLI entry point for flow operations.
 *
 * Commands:
 * - flow:explain <platform/flow> --lead <id>
 * - flow:dry <platform/flow> --lead <id> [--probe]
 * - flow:run <platform/flow> --lead <id> [--headless]
 * - selector:test <platform> <selector> --url <url>
 */

import { Command } from 'commander';
import { explainFlow } from './commands/explain';
import { dryRunFlow } from './commands/dry-run';
import { runFlow } from './commands/run';
import { testSelector } from './commands/test-selector';

const program = new Command();

program
  .name('mutuelles-cli')
  .description('CLI for leads and flows automation')
  .version('2.0.0');

// ============================================================
// flow:explain
// ============================================================

program
  .command('flow:explain <flowSlug>')
  .description('Explain a flow execution (show resolution table without running)')
  .requiredOption('--lead <id>', 'Lead ID')
  .option('--format <format>', 'Output format (table|json)', 'table')
  .action(async (flowSlug, options) => {
    try {
      await explainFlow(flowSlug, options.lead, { format: options.format });
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================
// flow:dry
// ============================================================

program
  .command('flow:dry <flowSlug>')
  .description('Dry-run a flow (validate without executing)')
  .requiredOption('--lead <id>', 'Lead ID')
  .option('--probe', 'Open browser and check selector existence')
  .action(async (flowSlug, options) => {
    try {
      await dryRunFlow(flowSlug, options.lead, { probe: options.probe });
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================
// flow:run
// ============================================================

program
  .command('flow:run <flowSlug>')
  .description('Execute a flow')
  .requiredOption('--lead <id>', 'Lead ID')
  .option('--headless', 'Run in headless mode', true)
  .option('--trace <mode>', 'Trace mode (on|retain-on-failure|off)', 'retain-on-failure')
  .option('--output <path>', 'Log output path')
  .action(async (flowSlug, options) => {
    try {
      await runFlow(flowSlug, options.lead, {
        headless: options.headless,
        trace: options.trace,
        outputPath: options.output,
      });
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================
// selector:test
// ============================================================

program
  .command('selector:test <platform> <selector>')
  .description('Test a selector on a page')
  .requiredOption('--url <url>', 'Page URL')
  .option('--timeout <ms>', 'Timeout in milliseconds', '5000')
  .action(async (platform, selector, options) => {
    try {
      await testSelector(platform, selector, options.url, {
        timeout: parseInt(options.timeout, 10),
      });
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================
// Parse and execute
// ============================================================

program.parse();
