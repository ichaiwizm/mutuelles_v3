/**
 * Step Types
 * Individual step type definitions
 */

import type { BaseStep, StepValue, WhenCondition } from './condition-types';

// Navigation Steps
export interface GotoStep extends BaseStep {
  type: 'goto';
  url: string;
}

export interface WaitFieldStep extends BaseStep {
  type: 'waitField';
  field: string;
  when?: WhenCondition;
}

// Form Steps
export interface FillStep extends BaseStep, StepValue {
  type: 'fill';
  field: string;
}

export interface TypeStep extends BaseStep {
  type: 'type';
  field: string;
  text: string;
  delayMs?: number;
  when?: WhenCondition;
}

export interface SelectStep extends BaseStep, StepValue {
  type: 'select';
  field: string;
}

export interface ToggleStep extends BaseStep, StepValue {
  type: 'toggle';
  field: string;
}

export interface ClickStep extends BaseStep {
  type: 'click';
  field: string;
  when?: WhenCondition;
}

// Frame Steps
export interface EnterFrameStep extends BaseStep {
  type: 'enterFrame';
  selector: string;
}

export interface ExitFrameStep extends BaseStep {
  type: 'exitFrame';
}

// Utility Steps
export interface SleepStep extends BaseStep {
  type: 'sleep';
  ms: number;
}

export interface PressKeyStep extends BaseStep {
  type: 'pressKey';
  key: string;
}

export interface CommentStep extends BaseStep {
  type: 'comment';
  text: string;
}

// Union type
export type FlowStep =
  | GotoStep
  | WaitFieldStep
  | FillStep
  | TypeStep
  | SelectStep
  | ToggleStep
  | ClickStep
  | EnterFrameStep
  | ExitFrameStep
  | SleepStep
  | PressKeyStep
  | CommentStep;
