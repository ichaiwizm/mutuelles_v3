/**
 * Field Executors
 * Handles field-based step execution (wait, fill, type, select, toggle, click)
 */

import type { Page } from 'playwright-core';
import { resolveValue, resolveAndMapValue } from '../resolve';
import type { SelectorMap, FieldSelector } from '../../platforms/types';
import type { FlowRunnerOptions, ResolveContext } from './types';

export class FieldExecutors {
  static async waitForField(
    page: Page,
    field: string,
    selectors: SelectorMap,
    options: FlowRunnerOptions
  ): Promise<void> {
    const selectorDef = this.getSelector(field, selectors);
    const selector = typeof selectorDef.selector === 'function'
      ? selectorDef.selector(0)
      : selectorDef.selector;

    await page.waitForSelector(selector, { timeout: options.timeout });
  }

  static async fillField(
    page: Page,
    step: any,
    context: ResolveContext,
    selectors: SelectorMap
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
    const finalValue = selectorDef.adapter
      ? selectorDef.adapter(mapped)
      : mapped;

    // Fill the field
    await page.fill(selector, String(finalValue));
  }

  static async typeField(
    page: Page,
    step: any,
    context: ResolveContext,
    selectors: SelectorMap
  ): Promise<void> {
    const selectorDef = this.getSelector(step.field, selectors);
    const selector = typeof selectorDef.selector === 'function'
      ? selectorDef.selector(0)
      : selectorDef.selector;

    await page.type(selector, step.text, { delay: step.delayMs });
  }

  static async selectField(
    page: Page,
    step: any,
    context: ResolveContext,
    selectors: SelectorMap
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

    await page.selectOption(selector, String(mapped));
  }

  static async toggleField(
    page: Page,
    step: any,
    context: ResolveContext,
    selectors: SelectorMap
  ): Promise<void> {
    const selectorDef = this.getSelector(step.field, selectors);
    const selector = typeof selectorDef.selector === 'function'
      ? selectorDef.selector(0)
      : selectorDef.selector;

    // Resolve value
    const targetState = step.value !== undefined
      ? step.value
      : resolveValue({ leadKey: step.leadKey, context });

    const isChecked = await page.isChecked(selector);

    if ((targetState && !isChecked) || (!targetState && isChecked)) {
      await page.click(selector);
    }
  }

  static async clickField(
    page: Page,
    step: any,
    selectors: SelectorMap
  ): Promise<void> {
    const selectorDef = this.getSelector(step.field, selectors);
    const selector = typeof selectorDef.selector === 'function'
      ? selectorDef.selector(0)
      : selectorDef.selector;

    await page.click(selector);
  }

  static getSelector(field: string, selectors: SelectorMap): FieldSelector {
    const selectorDef = selectors[field];
    if (!selectorDef) {
      throw new Error(`Selector not found for field: ${field}`);
    }
    return selectorDef;
  }
}
