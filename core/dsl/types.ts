/**
 * Flow DSL Types
 * ===============
 *
 * Type-safe DSL for defining automation flows.
 *
 * Step types (8 core + utilities):
 * - Navigation: goto, waitField
 * - Forms: fill, type, select, toggle, click
 * - Frames: frame{enter, exit}
 * - Utilities: sleep, pressKey, comment
 *
 * Unified condition language: `when`
 */

/**
 * Unified condition language (replaces skipIf/skipIfNot/showIf)
 */
export interface WhenCondition {
  field?: string;
  isEmpty?: boolean;
  equals?: any;
  notEquals?: any;
  oneOf?: any[];
  notOneOf?: any[];
  and?: WhenCondition[];
  or?: WhenCondition[];
}

/**
 * Step value source priority: value > leadKey > default
 */
export interface StepValue {
  /** Static or template value */
  value?: string | number | boolean;
  /** Path in lead data (e.g., 'subscriber.birthDate', 'children[0].birthDate') */
  leadKey?: string;
  /** Condition for execution */
  when?: WhenCondition;
}

/**
 * Base step properties
 */
export interface BaseStep {
  /** Step type */
  type: string;
  /** Human-readable label for logs */
  label?: string;
  /** Skip errors (continue flow) */
  optional?: boolean;
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Condition for execution */
  when?: WhenCondition;
}

// ============================================================
// NAVIGATION STEPS
// ============================================================

export interface GotoStep extends BaseStep {
  type: 'goto';
  url: string;
}

export interface WaitFieldStep extends BaseStep {
  type: 'waitField';
  /** Domain field key (e.g., 'subscriber.birthDate') */
  field: string;
}

// ============================================================
// FORM INTERACTION STEPS
// ============================================================

export interface FillStep extends BaseStep {
  type: 'fill';
  /** Domain field key */
  field: string;
  /** Value configuration */
  value?: string;
  leadKey?: string;
  when?: WhenCondition;
}

export interface TypeStep extends BaseStep {
  type: 'type';
  /** Domain field key */
  field: string;
  /** Text to type (with optional delay between keystrokes) */
  text: string;
  /** Delay between keystrokes (ms) */
  delayMs?: number;
}

export interface SelectStep extends BaseStep {
  type: 'select';
  /** Domain field key */
  field: string;
  /** Value configuration */
  value?: string;
  leadKey?: string;
  when?: WhenCondition;
}

export interface ToggleStep extends BaseStep {
  type: 'toggle';
  /** Domain field key */
  field: string;
  /** Target state (true/false) */
  value?: boolean;
  leadKey?: string;
  when?: WhenCondition;
}

export interface ClickStep extends BaseStep {
  type: 'click';
  /** Domain field key */
  field: string;
  when?: WhenCondition;
}

// ============================================================
// FRAME STEPS
// ============================================================

export interface EnterFrameStep extends BaseStep {
  type: 'enterFrame';
  /** Frame selector or index */
  selector: string | number;
}

export interface ExitFrameStep extends BaseStep {
  type: 'exitFrame';
}

// ============================================================
// UTILITY STEPS
// ============================================================

export interface SleepStep extends BaseStep {
  type: 'sleep';
  /** Duration in milliseconds */
  ms: number;
}

export interface PressKeyStep extends BaseStep {
  type: 'pressKey';
  /** Key name (e.g., 'Enter', 'Escape', 'Tab') */
  key: string;
  /** Modifiers */
  modifiers?: ('Control' | 'Shift' | 'Alt' | 'Meta')[];
}

export interface CommentStep extends BaseStep {
  type: 'comment';
  /** Comment text (for documentation) */
  text: string;
}

// ============================================================
// UNION TYPE
// ============================================================

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

/**
 * Complete flow definition
 */
export interface Flow {
  /** Flow unique identifier (platform/slug) */
  slug: string;
  /** Platform identifier */
  platform: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description?: string;
  /** Trace mode (on | retain-on-failure | off) */
  trace?: 'on' | 'retain-on-failure' | 'off';
  /** Flow steps */
  steps: FlowStep[];
}
