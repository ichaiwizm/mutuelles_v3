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
export async function getFlowBySlug(slug: string): Promise<Flow | null> {
  const [platform, flowName] = slug.split('/');

  try {
    // Dynamic ES module import
    const platformModule = await import(`../../platforms/${platform}/index.js`);
    const flow = platformModule[flowName] as Flow | undefined;

    if (!flow) {
      console.error(`❌ Flow '${flowName}' not found in platform '${platform}'`);
      console.error(`   Available flows: ${Object.keys(platformModule).filter(k => k !== 'default' && k !== 'selectors' && k !== 'platformConfig').join(', ')}`);
      return null;
    }

    return flow;
  } catch (error: any) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'MODULE_NOT_FOUND') {
      console.error(`❌ Platform '${platform}' not found. Check platform name spelling.`);
    } else {
      console.error(`❌ Failed to load flow '${slug}':`, error.message);
    }
    return null;
  }
}

/**
 * Get all selectors for a platform
 */
export async function getPlatformSelectors(platform: string): Promise<SelectorMap | null> {
  try {
    const platformModule = await import(`../../platforms/${platform}/index.js`);
    const selectors = platformModule.selectors || platformModule.platformConfig?.selectors;

    if (!selectors) {
      console.error(`❌ No selectors found for platform '${platform}'`);
      return null;
    }

    return selectors as SelectorMap;
  } catch (error: any) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'MODULE_NOT_FOUND') {
      console.error(`❌ Platform '${platform}' not found. Check platform name spelling.`);
    } else {
      console.error(`❌ Failed to load selectors for platform '${platform}':`, error.message);
    }
    return null;
  }
}

/**
 * Get platform selector definition for a specific field
 */
export async function resolvePlatformSelector(
  platform: string,
  field: string
): Promise<FieldSelector | null> {
  const selectors = await getPlatformSelectors(platform);
  if (!selectors) return null;
  return selectors[field] || null;
}
