/**
 * Condition Types
 * Unified 'when' condition language
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

export interface StepValue {
  /** Static or template value */
  value?: string | number | boolean;
  /** Path in lead data (e.g., 'subscriber.birthDate') */
  leadKey?: string;
  /** Condition for execution */
  when?: WhenCondition;
}

export interface BaseStep {
  /** Step type */
  type: string;
  /** Human-readable label for logs */
  label?: string;
  /** Skip errors (continue flow) */
  optional?: boolean;
}
