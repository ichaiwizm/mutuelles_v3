/**
 * Template Resolver
 * ==================
 *
 * Resolve template strings with variables:
 * - {lead.subscriber.lastName}
 * - {credentials.username}
 * - {env.API_KEY}
 */

import { resolveLeadPath } from './path';

export interface ResolveContext {
  lead?: any;
  credentials?: any;
  env?: any;
  [key: string]: any;
}

/**
 * Resolve a template string
 * Example: "Simulation {lead.subscriber.lastName} {lead.subscriber.firstName}"
 */
export function resolveTemplate(template: string, context: ResolveContext): string {
  return template.replace(/\{([^}]+)\}/g, (match, path) => {
    const [namespace, ...rest] = path.split('.');
    const fullPath = rest.join('.');

    if (namespace === 'lead' && context.lead) {
      const value = resolveLeadPath(context.lead, fullPath);
      return value !== undefined ? String(value) : match;
    }

    if (namespace === 'credentials' && context.credentials) {
      const value = context.credentials[rest[0]];
      return value !== undefined ? String(value) : match;
    }

    if (namespace === 'env' && context.env) {
      const value = context.env[rest[0]];
      return value !== undefined ? String(value) : match;
    }

    // Direct context access
    if (context[namespace]) {
      return String(context[namespace]);
    }

    return match; // Keep original if not found
  });
}

/**
 * Check if a string contains template variables
 */
export function hasTemplateVariables(str: string): boolean {
  return /\{[^}]+\}/.test(str);
}

/**
 * Extract all template variables from a string
 */
export function extractTemplateVariables(str: string): string[] {
  const matches = str.match(/\{([^}]+)\}/g);
  return matches ? matches.map((m) => m.slice(1, -1)) : [];
}
