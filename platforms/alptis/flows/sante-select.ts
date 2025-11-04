/**
 * Alptis Santé Select Flow (v2)
 * ===============================
 *
 * Converted from legacy JSON to TypeScript DSL.
 *
 * Key changes:
 * - skipIfNot → when: { field: 'spouse', isEmpty: false }
 * - Typed with Flow interface
 * - Uses step builders
 */

import type { Flow } from '../../../core/dsl';
import { setupSteps } from './sante-select-parts/setup';
import { formMainSteps } from './sante-select-parts/form-main';
import { formSpouseChildrenSteps } from './sante-select-parts/form-spouse-children';

export const santeSelect: Flow = {
  slug: 'alptis/sante-select',
  platform: 'alptis',
  name: 'Alptis Santé Select',

  steps: [
    ...setupSteps,
    ...formMainSteps,
    ...formSpouseChildrenSteps,
  ],
};

export default santeSelect;
