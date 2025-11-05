/**
 * Navigation Step Builders
 */

import type { GotoStep, WaitFieldStep } from './step-types';
import type { WhenCondition } from './condition-types';

export function goto(url: string, label?: string): GotoStep {
  return {
    type: 'goto',
    url,
    label,
  };
}

export interface WaitFieldOptions {
  when?: WhenCondition;
  optional?: boolean;
}

export function waitField(
  field: string,
  options: WaitFieldOptions = {},
  label?: string
): WaitFieldStep {
  return {
    type: 'waitField',
    field,
    when: options.when,
    optional: options.optional,
    label,
  };
}
