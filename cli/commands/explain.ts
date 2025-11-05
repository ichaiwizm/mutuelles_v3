/**
 * Explain Command
 * ================
 *
 * Show flow resolution table without executing.
 */

import { getLeadById } from '../../core/db';
import { resolveValue, type ResolveContext } from '../../core/template-resolution';
import { getFlowBySlug, resolvePlatformSelector } from '../utils/flow-loader';
import { getDatabaseConnection } from '../utils/db-connection';
import type { FlowStep } from '../../core/flow-dsl';

interface ExplainOptions {
  format: 'table' | 'json';
}

interface ResolutionRow {
  idx: number;
  type: string;
  field?: string;
  selector?: string;
  rawValue?: any;
  mappedValue?: any;
  skip: boolean;
  skipReason?: string;
}

export async function explainFlow(
  flowSlug: string,
  leadId: string,
  options: ExplainOptions
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

  console.log(`\n📋 Flow Explanation: ${flow.name}`);
  console.log(`Lead: ${lead.data.subscriber.firstName} ${lead.data.subscriber.lastName}`);
  console.log(`Total steps: ${flow.steps.length}\n`);

  // Build resolution context
  const context: ResolveContext = {
    lead: lead.data,
    credentials: {}, // Would come from credentials store
    env: process.env,
  };

  // Resolve each step
  const rows: ResolutionRow[] = [];

  for (let idx = 0; idx < flow.steps.length; idx++) {
    const step = flow.steps[idx];

    // Skip utility steps (comment, sleep)
    if (step.type === 'comment' || step.type === 'sleep') {
      continue;
    }

    const row: ResolutionRow = {
      idx,
      type: step.type,
      skip: false,
    };

    // Check condition
    if ('when' in step && step.when) {
      const { evaluateWhen } = await import('../../core/resolve/condition');
      const shouldExecute = evaluateWhen(step.when, lead.data);
      if (!shouldExecute) {
        row.skip = true;
        row.skipReason = 'Condition not met';
      }
    }

    // Resolve field and selector
    if ('field' in step && step.field) {
      row.field = step.field;

      // Get selector from platform config
      const selectorDef = resolvePlatformSelector(flow.platform, step.field);
      if (selectorDef) {
        row.selector = typeof selectorDef.selector === 'function'
          ? selectorDef.selector(0) + ' (dynamic)'
          : selectorDef.selector;
      }

      // Resolve value (if applicable)
      if ('value' in step || 'leadKey' in step) {
        const { raw, mapped } = await resolveStepValue(step, context, selectorDef);
        row.rawValue = raw;
        row.mappedValue = mapped;
      }
    }

    rows.push(row);
  }

  // Output
  if (options.format === 'json') {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    printTable(rows);
  }

  db.close();
}

async function resolveStepValue(
  step: any,
  context: ResolveContext,
  selectorDef: any
): Promise<{ raw: any; mapped: any }> {
  const { resolveAndMapValue } = await import('../../core/resolve/value');

  return resolveAndMapValue(
    {
      value: step.value,
      leadKey: step.leadKey,
      context,
    },
    selectorDef?.valueMap
  );
}

function printTable(rows: ResolutionRow[]): void {
  console.log('┌──────┬──────────┬─────────────────────┬────────────────────────┬────────────┬──────────────┬──────┐');
  console.log('│ Idx  │ Type     │ Field               │ Selector               │ Raw        │ Mapped       │ Skip │');
  console.log('├──────┼──────────┼─────────────────────┼────────────────────────┼────────────┼──────────────┼──────┤');

  for (const row of rows) {
    const idx = String(row.idx).padEnd(4);
    const type = String(row.type).padEnd(8);
    const field = (row.field || '').padEnd(19);
    const selector = (row.selector || '').substring(0, 22).padEnd(22);
    const raw = String(row.rawValue || '').substring(0, 10).padEnd(10);
    const mapped = String(row.mappedValue || '').substring(0, 12).padEnd(12);
    const skip = row.skip ? '✓' : '';

    console.log(`│ ${idx} │ ${type} │ ${field} │ ${selector} │ ${raw} │ ${mapped} │ ${skip.padEnd(4)} │`);
  }

  console.log('└──────┴──────────┴─────────────────────┴────────────────────────┴────────────┴──────────────┴──────┘');
}
