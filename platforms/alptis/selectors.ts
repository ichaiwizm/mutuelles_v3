/**
 * Alptis Platform Selectors
 * ==========================
 *
 * Typed selector definitions for Alptis platform.
 */

import type { SelectorMap } from '../types';
import { authSelectors } from './selectors/auth';
import { projectSelectors } from './selectors/project';
import { subscriberSelectors } from './selectors/subscriber';
import { spouseSelectors } from './selectors/spouse';
import { childrenSelectors } from './selectors/children';

export const selectors: SelectorMap = {
  ...authSelectors,
  ...projectSelectors,
  ...subscriberSelectors,
  ...spouseSelectors,
  ...childrenSelectors,
};

export const platformConfig = {
  slug: 'alptis',
  name: 'Alptis',
  selectors,
};
