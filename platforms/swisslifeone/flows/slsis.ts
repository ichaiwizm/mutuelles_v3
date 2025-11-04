/**
 * SwissLifeOne SLSIS Flow (v2)
 * ==============================
 *
 * Converted from legacy JSON to TypeScript DSL.
 *
 * Key changes:
 * - skipIfNot → when: { field: 'spouse', isEmpty: false }
 * - skipIf → when: { field: 'xxx', isEmpty: true }
 * - domainField → field (unified)
 * - Typed with Flow interface
 * - Uses step builders
 */

import type { Flow } from '../../../core/dsl';
import { setupSteps } from './slsis-parts/setup';
import { formMainSteps } from './slsis-parts/form-main';
import { formChildrenSteps } from './slsis-parts/form-children';

export const slsis: Flow = {
  slug: 'swisslifeone/slsis',
  platform: 'swisslifeone',
  name: 'SwissLifeOne - SLSIS',
  trace: 'retain-on-failure',

  steps: [
    ...setupSteps,
    ...formMainSteps,
    ...formChildrenSteps,
  ],
};

export default slsis;
