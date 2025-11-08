/**
 * Flow Runner (v2)
 * Main orchestrator for flow execution
 */

import type { Flow, FlowStep } from '../dsl';
import type { LeadData } from '../domain';
import type { Logger } from '../log';
import { evaluateWhen } from '../resolve/condition';
import type { SelectorMap } from '../../platforms/types';
import type { FlowRunnerOptions, FlowRunResult, FlowRunnerContext, ResolveContext } from './types';
import { BrowserManager } from './browser-manager';
import { StepExecutors } from './step-executors';

export class FlowRunner {
  private context: FlowRunnerContext;

  constructor(runId: string, logger: Logger) {
    this.context = {
      runId,
      logger,
    };
  }

  /**
   * Execute a flow
   */
  async execute(
    flow: Flow,
    leadData: LeadData,
    selectors: SelectorMap,
    credentials: any,
    options: FlowRunnerOptions = {}
  ): Promise<FlowRunResult> {
    const startTime = Date.now();
    let stepsExecuted = 0;
    let stepsFailed = 0;

    try {
      // Initialize browser
      await BrowserManager.initialize(this.context, options);

      // Cooperative pause before starting
      if (options.pauseGate) {
        try { await options.pauseGate('begin') } catch {}
      }

      // Build resolution context
      const resolveContext: ResolveContext = {
        lead: leadData,
        credentials,
        env: process.env,
      };

      // Execute each step
      for (let idx = 0; idx < flow.steps.length; idx++) {
        const step = flow.steps[idx];
        const stepStartTime = Date.now();

        try {
          // Pause gate before step
          if (options.pauseGate) {
            try { await options.pauseGate('before-step', idx) } catch {}
          }
          // Check when condition
          if ('when' in step && step.when) {
            const shouldExecute = evaluateWhen(step.when, leadData);
            if (!shouldExecute) {
              this.logStep(step, idx, 0, true, 'Skipped (condition not met)');
              if (options.onProgress) {
                try { options.onProgress({ stepIndex: idx, totalSteps: flow.steps.length, step, ok: true, ms: 0 }) } catch {}
              }
              continue;
            }
          }

          // Execute step
          await StepExecutors.executeStep(
            step,
            this.context,
            resolveContext,
            selectors,
            options
          );

          // Take screenshot if enabled
          const screenshotPath = await BrowserManager.takeScreenshot(this.context, idx, options);

          const stepDuration = Date.now() - stepStartTime;
          stepsExecuted++;
          this.logStep(step, idx, stepDuration, true);
          if (options.onProgress) {
            try { options.onProgress({ stepIndex: idx, totalSteps: flow.steps.length, step, ok: true, ms: stepDuration, screenshot: screenshotPath }) } catch {}
          }
        } catch (error: any) {
          const stepDuration = Date.now() - stepStartTime;
          stepsFailed++;
          this.logStep(step, idx, stepDuration, false, error.message);
          if (options.onProgress) {
            try { options.onProgress({ stepIndex: idx, totalSteps: flow.steps.length, step, ok: false, ms: stepDuration }) } catch {}
          }

          // Stop on error unless optional
          if (!('optional' in step && step.optional)) {
            throw error;
          }
        }
      }

      // Stop tracing if needed
      await BrowserManager.stopTracing(this.context, options, stepsFailed);

      return {
        success: stepsFailed === 0,
        duration: Date.now() - startTime,
        stepsExecuted,
        stepsFailed,
      };
    } catch (error: any) {
      this.context.logger.error('Flow execution failed', error);
      return {
        success: false,
        duration: Date.now() - startTime,
        stepsExecuted,
        stepsFailed: stepsFailed + 1,
        error: error.message,
      };
    } finally {
      await BrowserManager.cleanup(this.context);
    }
  }

  private logStep(
    step: FlowStep,
    idx: number,
    ms: number,
    ok: boolean,
    error?: string
  ): void {
    this.context.logger.step({
      run: this.context.runId,
      idx,
      type: step.type,
      field: 'field' in step ? step.field : undefined,
      ok,
      ms,
      error,
    });
  }
}
