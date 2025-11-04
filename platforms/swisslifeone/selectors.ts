/**
 * SwissLifeOne Platform Selectors
 * =================================
 *
 * Typed selector definitions for SwissLifeOne platform.
 * Converted from legacy JSON to TypeScript.
 */

import type { SelectorMap } from '../types';
import { authSelectors } from './selectors/auth';
import { projectSelectors } from './selectors/project';
import { subscriberSelectors } from './selectors/subscriber';
import { spouseSelectors } from './selectors/spouse';
import { childrenSelectors } from './selectors/children';
import { navigationSelectors } from './selectors/navigation';

export const selectors: SelectorMap = {
  ...authSelectors,
  ...projectSelectors,
  ...subscriberSelectors,
  ...spouseSelectors,
  ...childrenSelectors,
  ...navigationSelectors,
};

export const platformConfig = {
  slug: 'swisslifeone',
  name: 'SwissLifeOne',
  selectors,
};
