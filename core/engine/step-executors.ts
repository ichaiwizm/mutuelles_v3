/**
 * Step Executors
 * Main dispatcher for step execution
 */

import type { FlowStep } from '../dsl';
import type { SelectorMap } from '../../platforms/types';
import type { FlowRunnerOptions, FlowRunnerContext, ResolveContext } from './types';
import { FieldExecutors } from './field-executors';

export class StepExecutors {
  /**
   * Execute a single step
   */
  static async executeStep(
    step: FlowStep,
    context: FlowRunnerContext,
    resolveContext: ResolveContext,
    selectors: SelectorMap,
    options: FlowRunnerOptions
  ): Promise<void> {
    if (!context.page) throw new Error('Page not initialized');

    switch (step.type) {
      case 'goto':
        await context.page.goto(step.url, { timeout: options.timeout });
        break;

      case 'waitField':
        await FieldExecutors.waitForField(context.page, step.field, selectors, options);
        break;

      case 'fill':
        await FieldExecutors.fillField(context.page, step, resolveContext, selectors);
        break;

      case 'type':
        await FieldExecutors.typeField(context.page, step, resolveContext, selectors);
        break;

      case 'select':
        await FieldExecutors.selectField(context.page, step, resolveContext, selectors);
        break;

      case 'toggle':
        await FieldExecutors.toggleField(context.page, step, resolveContext, selectors);
        break;

      case 'click':
        await FieldExecutors.clickField(context.page, step, selectors);
        break;

      case 'enterFrame':
        await this.enterFrame(context, step);
        break;

      case 'exitFrame':
        await this.exitFrame(context);
        break;

      case 'sleep':
        await context.page.waitForTimeout(step.ms);
        break;

      case 'pressKey':
        await context.page.keyboard.press(step.key);
        break;

      case 'comment':
        context.logger.info(step.text);
        break;

      default:
        throw new Error(`Unknown step type: ${(step as any).type}`);
    }
  }

  private static async enterFrame(
    context: FlowRunnerContext,
    step: any
  ): Promise<void> {
    if (!context.page) throw new Error('Page not initialized');

    const frameElement = await context.page.waitForSelector(step.selector);
    const frame = await frameElement!.contentFrame();
    if (!frame) throw new Error(`Frame not found: ${step.selector}`);

    // Switch context to frame
    context.page = frame as any;
  }

  private static async exitFrame(context: FlowRunnerContext): Promise<void> {
    // Return to main page
    if (context.context) {
      const pages = context.context.pages();
      context.page = pages[0];
    }
  }
}
