/**
 * Flow Loader Utility
 * ====================
 *
 * Load flows and platform configs dynamically.
 */

import type { Flow } from '../../core/dsl';
import type { FieldSelector, SelectorMap } from '../../platforms/types';

/**
 * Get flow by slug (e.g., 'swisslifeone/slsis')
 */
export function getFlowBySlug(slug: string): Flow | null {
  const [platform, flowName] = slug.split('/');

  try {
    // Dynamic import
    const platformModule = require(`../../platforms/${platform}`);
    const flow = platformModule[flowName];

    if (!flow) {
      console.error(`Flow '${flowName}' not found in platform '${platform}'`);
      return null;
    }

    return flow;
  } catch (error: any) {
    console.error(`Failed to load flow '${slug}':`, error.message);
    return null;
  }
}

/**
 * Get all selectors for a platform
 */
export function getPlatformSelectors(platform: string): SelectorMap | null {
  try {
    const platformModule = require(`../../platforms/${platform}`);
    const selectors = platformModule.selectors || platformModule.platformConfig?.selectors;

    if (!selectors) {
      console.error(`No selectors found for platform '${platform}'`);
      return null;
    }

    return selectors;
  } catch (error: any) {
    console.error(`Failed to load selectors for platform '${platform}':`, error.message);
    return null;
  }
}

/**
 * Get platform selector definition for a specific field
 */
export function resolvePlatformSelector(
  platform: string,
  field: string
): FieldSelector | null {
  const selectors = getPlatformSelectors(platform);
  if (!selectors) return null;
  return selectors[field] || null;
}
