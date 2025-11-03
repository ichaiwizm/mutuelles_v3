/**
 * Flow Runner (v2)
 * =================
 *
 * Executes flows using Playwright with the new /core architecture.
 */

import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';
import type { Flow, FlowStep } from '../../core/dsl';
import type { LeadData } from '../../core/domain';
import { createLogger, type Logger } from '../../core/log';
import { evaluateWhen } from '../../core/resolve/condition';
import { resolveValue, resolveAndMapValue, type ResolveContext } from '../../core/resolve';
import type { SelectorMap, FieldSelector } from '../../platforms/types';

export interface FlowRunnerOptions {
  headless?: boolean;
  trace?: 'on' | 'retain-on-failure' | 'off';
  slowMo?: number;
  timeout?: number;
  screenshots?: boolean;
}

export interface FlowRunResult {
  success: boolean;
  duration: number;
  stepsExecuted: number;
  stepsFailed: number;
  error?: string;
}

export class FlowRunner {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private logger: Logger;
  private runId: string;

  constructor(runId: string, logger: Logger) {
    this.runId = runId;
    this.logger = logger;
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
      // Launch browser
      this.browser = await chromium.launch({
        headless: options.headless ?? true,
        slowMo: options.slowMo,
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
      });

      // Enable tracing if requested
      if (options.trace === 'on' || options.trace === 'retain-on-failure') {
        await this.context.tracing.start({ screenshots: true, snapshots: true });
      }

      this.page = await this.context.newPage();

      // Build resolution context
      const context: ResolveContext = {
        lead: leadData,
        credentials,
        env: process.env,
      };

      // Execute each step
      for (let idx = 0; idx < flow.steps.length; idx++) {
        const step = flow.steps[idx];
        const stepStartTime = Date.now();

        try {
          // Check if step should be skipped (condition)
          if ('when' in step && step.when) {
            const shouldExecute = evaluateWhen(step.when, leadData);
            if (!shouldExecute) {
              this.logger.step({
                run: this.runId,
                idx,
                type: step.type,
                field: 'field' in step ? step.field : undefined,
                ok: true,
                ms: 0,
                error: 'Skipped (condition not met)',
              });
              continue;
            }
          }

          // Execute step based on type
          await this.executeStep(step, idx, context, selectors, options);

          const stepDuration = Date.now() - stepStartTime;
          stepsExecuted++;

          this.logger.step({
            run: this.runId,
            idx,
            type: step.type,
            field: 'field' in step ? step.field : undefined,
            ok: true,
            ms: stepDuration,
          });
        } catch (error: any) {
          const stepDuration = Date.now() - stepStartTime;
          stepsFailed++;

          this.logger.step({
            run: this.runId,
            idx,
            type: step.type,
            field: 'field' in step ? step.field : undefined,
            ok: false,
            ms: stepDuration,
            error: error.message,
          });

          // Stop on error unless optional
          if (!('optional' in step && step.optional)) {
            throw error;
          }
        }
      }

      // Save trace if requested
      if (options.trace === 'on') {
        await this.context.tracing.stop({ path: `traces/${this.runId}.zip` });
      } else if (options.trace === 'retain-on-failure' && stepsFailed > 0) {
        await this.context.tracing.stop({ path: `traces/${this.runId}.zip` });
      }

      return {
        success: stepsFailed === 0,
        duration: Date.now() - startTime,
        stepsExecuted,
        stepsFailed,
      };
    } catch (error: any) {
      this.logger.error('Flow execution failed', error);
      return {
        success: false,
        duration: Date.now() - startTime,
        stepsExecuted,
        stepsFailed: stepsFailed + 1,
        error: error.message,
      };
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: FlowStep,
    idx: number,
    context: ResolveContext,
    selectors: SelectorMap,
    options: FlowRunnerOptions
  ): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    switch (step.type) {
      case 'goto':
        await this.page.goto(step.url, { timeout: options.timeout });
        break;

      case 'waitField':
        await this.waitForField(step.field, selectors, options);
        break;

      case 'fill':
        await this.fillField(step, context, selectors, options);
        break;

      case 'type':
        await this.typeField(step, context, selectors, options);
        break;

      case 'select':
        await this.selectField(step, context, selectors, options);
        break;

      case 'toggle':
        await this.toggleField(step, context, selectors, options);
        break;

      case 'click':
        await this.clickField(step, context, selectors, options);
        break;

      case 'enterFrame':
        await this.enterFrame(step);
        break;

      case 'exitFrame':
        await this.exitFrame();
        break;

      case 'sleep':
        await this.page.waitForTimeout(step.ms);
        break;

      case 'pressKey':
        await this.page.keyboard.press(step.key);
        break;

      case 'comment':
        // Just log, no action
        this.logger.info(step.text);
        break;

      default:
        throw new Error(`Unknown step type: ${(step as any).type}`);
    }

    // Take screenshot if enabled
    if (options.screenshots) {
      await this.page.screenshot({ path: `screenshots/${this.runId}-step-${idx}.png` });
    }
  }

  private async waitForField(
    field: string,
    selectors: SelectorMap,
    options: FlowRunnerOptions
  ): Promise<void> {
    const selectorDef = this.getSelector(field, selectors);
    const selector = typeof selectorDef.selector === 'function'
      ? selectorDef.selector(0)
      : selectorDef.selector;

    await this.page!.waitForSelector(selector, { timeout: options.timeout });
  }

  private async fillField(
    step: any,
    context: ResolveContext,
    selectors: SelectorMap,
    options: FlowRunnerOptions
  ): Promise<void> {
    const selectorDef = this.getSelector(step.field, selectors);
    const selector = typeof selectorDef.selector === 'function'
      ? selectorDef.selector(0)
      : selectorDef.selector;

    // Resolve value
    const { raw, mapped } = resolveAndMapValue(
      { value: step.value, leadKey: step.leadKey, context },
      selectorDef.valueMap
    );

    // Apply adapter if present
    const finalValue = selectorDef.adapter ? selectorDef.adapter(mapped) : mapped;

    // Fill the field
    await this.page!.fill(selector, String(finalValue));
  }

  private async typeField(
    step: any,
    context: ResolveContext,
    selectors: SelectorMap,
    options: FlowRunnerOptions
  ): Promise<void> {
    const selectorDef = this.getSelector(step.field, selectors);
    const selector = typeof selectorDef.selector === 'function'
      ? selectorDef.selector(0)
      : selectorDef.selector;

    await this.page!.type(selector, step.text, { delay: step.delayMs });
  }

  private async selectField(
    step: any,
    context: ResolveContext,
    selectors: SelectorMap,
    options: FlowRunnerOptions
  ): Promise<void> {
    const selectorDef = this.getSelector(step.field, selectors);
    const selector = typeof selectorDef.selector === 'function'
      ? selectorDef.selector(0)
      : selectorDef.selector;

    // Resolve value
    const { raw, mapped } = resolveAndMapValue(
      { value: step.value, leadKey: step.leadKey, context },
      selectorDef.valueMap
    );

    await this.page!.selectOption(selector, String(mapped));
  }

  private async toggleField(
    step: any,
    context: ResolveContext,
    selectors: SelectorMap,
    options: FlowRunnerOptions
  ): Promise<void> {
    const selectorDef = this.getSelector(step.field, selectors);
    const selector = typeof selectorDef.selector === 'function'
      ? selectorDef.selector(0)
      : selectorDef.selector;

    // Resolve value
    const targetState = step.value !== undefined
      ? step.value
      : resolveValue({ leadKey: step.leadKey, context });

    const isChecked = await this.page!.isChecked(selector);

    if ((targetState && !isChecked) || (!targetState && isChecked)) {
      await this.page!.click(selector);
    }
  }

  private async clickField(
    step: any,
    context: ResolveContext,
    selectors: SelectorMap,
    options: FlowRunnerOptions
  ): Promise<void> {
    const selectorDef = this.getSelector(step.field, selectors);
    const selector = typeof selectorDef.selector === 'function'
      ? selectorDef.selector(0)
      : selectorDef.selector;

    await this.page!.click(selector);
  }

  private async enterFrame(step: any): Promise<void> {
    const frameElement = await this.page!.waitForSelector(step.selector);
    const frame = await frameElement!.contentFrame();
    if (!frame) throw new Error(`Frame not found: ${step.selector}`);

    // Switch context to frame
    this.page = frame as any;
  }

  private async exitFrame(): Promise<void> {
    // Return to main page (this is simplified, real implementation would need frame stack)
    if (this.context) {
      const pages = this.context.pages();
      this.page = pages[0];
    }
  }

  private getSelector(field: string, selectors: SelectorMap): FieldSelector {
    const selectorDef = selectors[field];
    if (!selectorDef) {
      throw new Error(`Selector not found for field: ${field}`);
    }
    return selectorDef;
  }

  private async cleanup(): Promise<void> {
    if (this.page) await this.page.close().catch(() => {});
    if (this.context) await this.context.close().catch(() => {});
    if (this.browser) await this.browser.close().catch(() => {});
  }
}
