/**
 * Flow DSL Step Builders
 * =======================
 *
 * Fluent API for building flows in TypeScript.
 *
 * Usage:
 * ```ts
 * import { step } from './builders';
 *
 * const flow: Flow = {
 *   slug: 'swisslifeone/slsis',
 *   platform: 'swisslifeone',
 *   name: 'SLSIS Simulation',
 *   steps: [
 *     step.goto('https://...'),
 *     step.fill('project.name', { value: 'Sim {lead.subscriber.lastName}' }),
 *     step.select('subscriber.regime', { leadKey: 'subscriber.regime' }),
 *     step.toggle('project.madelin', {
 *       value: true,
 *       when: { field: 'subscriber.status', equals: 'TNS' }
 *     }),
 *   ]
 * };
 * ```
 */

import type {
  GotoStep,
  WaitFieldStep,
  FillStep,
  TypeStep,
  SelectStep,
  ToggleStep,
  ClickStep,
  EnterFrameStep,
  ExitFrameStep,
  SleepStep,
  PressKeyStep,
  CommentStep,
  WhenCondition,
} from './types';

// ============================================================
// NAVIGATION
// ============================================================

export function goto(url: string, label?: string): GotoStep {
  return { type: 'goto', url, label };
}

export function waitField(field: string, label?: string): WaitFieldStep {
  return { type: 'waitField', field, label };
}

// ============================================================
// FORMS
// ============================================================

export interface FillOptions {
  value?: string;
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
  optional?: boolean;
}

export function type_(field: string, text: string, options: TypeOptions = {}, label?: string): TypeStep {
  return {
    type: 'type',
    field,
    text,
    delayMs: options.delayMs,
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

export function select(field: string, options: SelectOptions = {}, label?: string): SelectStep {
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

export function toggle(field: string, options: ToggleOptions = {}, label?: string): ToggleStep {
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

export function click(field: string, options: ClickOptions = {}, label?: string): ClickStep {
  return {
    type: 'click',
    field,
    when: options.when,
    optional: options.optional,
    label,
  };
}

// ============================================================
// FRAMES
// ============================================================

export function enterFrame(selector: string | number, label?: string, timeoutMs?: number): EnterFrameStep {
  return { type: 'enterFrame', selector, label, timeoutMs };
}

export function exitFrame(label?: string): ExitFrameStep {
  return { type: 'exitFrame', label };
}

// ============================================================
// UTILITIES
// ============================================================

export function sleep(ms: number, label?: string): SleepStep {
  return { type: 'sleep', ms, label };
}

export function pressKey(key: string, modifiers?: ('Control' | 'Shift' | 'Alt' | 'Meta')[], label?: string): PressKeyStep {
  return { type: 'pressKey', key, modifiers, label };
}

export function comment(text: string): CommentStep {
  return { type: 'comment', text };
}

// ============================================================
// EXPORT NAMESPACE
// ============================================================

export const step = {
  goto,
  waitField,
  fill,
  type: type_,
  select,
  toggle,
  click,
  enterFrame,
  exitFrame,
  sleep,
  pressKey,
  comment,
};
