/**
 * Alptis - Project Selectors
 */

import { dateEffetAlptis } from '../../../core/adapters';
import type { SelectorMap } from '../../types';

export const projectSelectors: SelectorMap = {
'project.dateEffet': {
  selector: '#dateEffet input[data-test="input"]',
  adapter: dateEffetAlptis,
  meta: { label: 'Date d\'effet' },
},
};
