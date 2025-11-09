#!/usr/bin/env node
/**
 * CLI Entry Point
 * ================
 *
 * Main CLI entry point for flow operations.
 *
 * Commands:
 * - flow:run <platform/flow> --lead <id> [--headless] [--trace <mode>] [--output <path>]
 */

import { Command } from 'commander';
import { runFlow } from './commands/run';

const program = new Command();

program
  .name('mutuelles-cli')
  .description('CLI for leads and flows automation')
  .version('2.0.0');

// ============================================================
// flow:run - Execute a flow with a lead
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
// Parse and execute
// ============================================================

program.parse();
