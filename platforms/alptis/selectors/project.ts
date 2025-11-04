/**
 * Alptis - Project Selectors
 */

import { dateIsoToFr } from '../../../core/adapters';
import type { SelectorMap } from '../../types';

export const projectSelectors: SelectorMap = {
'project.dateEffet': {
  selector: '#dateEffet input[data-test="input"]',
  adapter: dateIsoToFr,
  meta: { label: 'Date d\'effet' },
},
};
