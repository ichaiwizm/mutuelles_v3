/**
 * Path Resolver
 * ==============
 *
 * Resolve paths in lead data (e.g., 'subscriber.birthDate', 'children[0].birthDate')
 */

/**
 * Resolve a dot/bracket path in an object
 * Supports:
 * - 'subscriber.birthDate'
 * - 'children[0].birthDate'
 * - 'spouse.regime'
 */
export function resolveLeadPath(leadData: any, path: string): any {
  if (!path || !leadData) return undefined;

  const parts = path.split('.');
  let current = leadData;

  for (const part of parts) {
    if (!current) return undefined;

    // Handle array access: children[0]
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = current[key]?.[parseInt(index, 10)];
    } else {
      current = current[part];
    }
  }

  return current;
}

/**
 * Set a value at a path in an object
 */
export function setLeadPath(leadData: any, path: string, value: any): void {
  const parts = path.split('.');
  let current = leadData;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    // Handle array access
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      const idx = parseInt(index, 10);
      if (!current[key]) current[key] = [];
      if (!current[key][idx]) current[key][idx] = {};
      current = current[key][idx];
    } else {
      if (!current[part]) current[part] = {};
      current = current[part];
    }
  }

  const lastPart = parts[parts.length - 1];
  const arrayMatch = lastPart.match(/^(\w+)\[(\d+)\]$/);
  if (arrayMatch) {
    const [, key, index] = arrayMatch;
    const idx = parseInt(index, 10);
    if (!current[key]) current[key] = [];
    current[key][idx] = value;
  } else {
    current[lastPart] = value;
  }
}

/**
 * Check if a path exists in lead data
 */
export function hasLeadPath(leadData: any, path: string): boolean {
  return resolveLeadPath(leadData, path) !== undefined;
}
