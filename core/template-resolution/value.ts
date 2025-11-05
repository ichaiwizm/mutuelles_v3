/**
 * Value Resolver
 * ===============
 *
 * Resolve step values according to priority:
 * 1. value (static or template)
 * 2. leadKey (path in lead data)
 * 3. undefined
 */

import { resolveLeadPath } from './path';
import { resolveTemplate, hasTemplateVariables, type ResolveContext } from './template';

export interface ValueResolveOptions {
  value?: any;
  leadKey?: string;
  context: ResolveContext;
}

/**
 * Resolve a step value
 */
export function resolveValue(options: ValueResolveOptions): any {
  const { value, leadKey, context } = options;

  // Priority 1: value (static or template)
  if (value !== undefined) {
    if (typeof value === 'string' && hasTemplateVariables(value)) {
      return resolveTemplate(value, context);
    }
    return value;
  }

  // Priority 2: leadKey (path in lead data)
  if (leadKey && context.lead) {
    return resolveLeadPath(context.lead, leadKey);
  }

  // Priority 3: undefined
  return undefined;
}

/**
 * Resolve and map a value using valueMap
 */
export function resolveAndMapValue(
  options: ValueResolveOptions,
  valueMap?: Record<string, any>
): { raw: any; mapped: any } {
  const raw = resolveValue(options);

  if (!valueMap || raw === undefined) {
    return { raw, mapped: raw };
  }

  // Check for exact match
  if (valueMap[raw] !== undefined) {
    return { raw, mapped: valueMap[raw] };
  }

  // Check for wildcard (*) fallback
  if (valueMap['*'] !== undefined) {
    return { raw, mapped: valueMap['*'] };
  }

  // No mapping found, return raw
  return { raw, mapped: raw };
}
