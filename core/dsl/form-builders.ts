/**
 * Form Step Builders
 */

import type { FillStep, TypeStep, SelectStep, ToggleStep, ClickStep } from './step-types';
import type { WhenCondition } from './condition-types';

export interface FillOptions {
  value?: string | number | boolean;
  leadKey?: string;
  when?: WhenCondition;
  optional?: boolean;
}

export function fill(field: string, options: FillOptions = {}, label?: string): FillStep {
  return {
    type: 'fill',
    field,
    value: options.value,
    leadKey: options.leadKey,
    when: options.when,
    optional: options.optional,
    label,
  };
}

export interface TypeOptions {
  delayMs?: number;
  when?: WhenCondition;
  optional?: boolean;
}

export function type(
  field: string,
  text: string,
  options: TypeOptions = {},
  label?: string
): TypeStep {
  return {
    type: 'type',
    field,
    text,
    delayMs: options.delayMs,
    when: options.when,
    optional: options.optional,
    label,
  };
}

export interface SelectOptions {
  value?: string;
  leadKey?: string;
  when?: WhenCondition;
  optional?: boolean;
}

export function select(
  field: string,
  options: SelectOptions = {},
  label?: string
): SelectStep {
  return {
    type: 'select',
    field,
    value: options.value,
    leadKey: options.leadKey,
    when: options.when,
    optional: options.optional,
    label,
  };
}

export interface ToggleOptions {
  value?: boolean;
  leadKey?: string;
  when?: WhenCondition;
  optional?: boolean;
}

export function toggle(
  field: string,
  options: ToggleOptions = {},
  label?: string
): ToggleStep {
  return {
    type: 'toggle',
    field,
    value: options.value,
    leadKey: options.leadKey,
    when: options.when,
    optional: options.optional,
    label,
  };
}

export interface ClickOptions {
  when?: WhenCondition;
  optional?: boolean;
}

export function click(
  field: string,
  options: ClickOptions = {},
  label?: string
): ClickStep {
  return {
    type: 'click',
    field,
    when: options.when,
    optional: options.optional,
    label,
  };
}
