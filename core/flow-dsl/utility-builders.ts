/**
 * Utility Step Builders
 */

import type { EnterFrameStep, ExitFrameStep, SleepStep, PressKeyStep, CommentStep } from './step-types';

export function enterFrame(selector: string, label?: string): EnterFrameStep {
  return {
    type: 'enterFrame',
    selector,
    label,
  };
}

export function exitFrame(label?: string): ExitFrameStep {
  return {
    type: 'exitFrame',
    label,
  };
}

export function sleep(ms: number, label?: string): SleepStep {
  return {
    type: 'sleep',
    ms,
    label,
  };
}

export function pressKey(key: string, label?: string): PressKeyStep {
  return {
    type: 'pressKey',
    key,
    label,
  };
}

export function comment(text: string): CommentStep {
  return {
    type: 'comment',
    text,
  };
}
