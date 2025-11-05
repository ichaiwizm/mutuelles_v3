/**
 * Condition Evaluator
 * ====================
 *
 * Unified condition language for `when` expressions.
 * Replaces: skipIf, skipIfNot, showIf
 *
 * Grammar:
 * - when: { field: 'spouse', isEmpty: false }
 * - when: { field: 'subscriber.status', equals: 'TNS' }
 * - when: { field: 'subscriber.status', oneOf: ['TNS', 'INDEPENDANT'] }
 * - when: { and: [...], or: [...] }
 */

import type { WhenCondition } from '../dsl/types';
import { resolveLeadPath } from './path';

/**
 * Evaluate a when condition against lead data
 */
export function evaluateWhen(condition: WhenCondition | undefined, leadData: any): boolean {
  if (!condition) return true; // No condition = always execute

  // Logical operators
  if (condition.and) {
    return condition.and.every((c) => evaluateWhen(c, leadData));
  }

  if (condition.or) {
    return condition.or.some((c) => evaluateWhen(c, leadData));
  }

  // Field-based conditions
  if (condition.field) {
    const value = resolveLeadPath(leadData, condition.field);

    // isEmpty check
    if (condition.isEmpty !== undefined) {
      const isEmpty = value === undefined || value === null || value === '';
      return condition.isEmpty ? isEmpty : !isEmpty;
    }

    // equals
    if (condition.equals !== undefined) {
      return value === condition.equals;
    }

    // notEquals
    if (condition.notEquals !== undefined) {
      return value !== condition.notEquals;
    }

    // oneOf
    if (condition.oneOf !== undefined) {
      return condition.oneOf.includes(value);
    }

    // notOneOf
    if (condition.notOneOf !== undefined) {
      return !condition.notOneOf.includes(value);
    }

    // Default: check if field exists and is truthy
    return !!value;
  }

  return true;
}

/**
 * Check if a step should be skipped (inverse of when)
 */
export function shouldSkipStep(condition: WhenCondition | undefined, leadData: any): boolean {
  return !evaluateWhen(condition, leadData);
}

/**
 * Convert legacy skipIf/skipIfNot to when
 */
export function convertLegacyCondition(
  skipIf?: string | object,
  skipIfNot?: string | object
): WhenCondition | undefined {
  if (skipIfNot) {
    if (typeof skipIfNot === 'string') {
      // skipIfNot: "spouse" -> when: { field: "spouse", isEmpty: false }
      return { field: skipIfNot, isEmpty: false };
    }
    // Complex skipIfNot object
    return { ...skipIfNot } as WhenCondition;
  }

  if (skipIf) {
    if (typeof skipIf === 'string') {
      // skipIf: "spouse" -> when: { field: "spouse", isEmpty: true }
      return { field: skipIf, isEmpty: true };
    }
    // Complex skipIf object - need to invert logic
    const condition = skipIf as any;
    if (condition.isEmpty !== undefined) {
      return { ...condition, isEmpty: !condition.isEmpty };
    }
    if (condition.equals !== undefined) {
      return { ...condition, notEquals: condition.equals, equals: undefined };
    }
    return condition;
  }

  return undefined;
}
