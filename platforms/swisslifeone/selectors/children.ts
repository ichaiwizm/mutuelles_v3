/**
 * SwissLifeOne - Children Selectors
 */

import { dateIsoToFr } from '../../../core/adapters';
import type { SelectorMap } from '../../types';

export const childrenSelectors: SelectorMap = {
// ============================================================

'children.count': {
  selector: '#sante-nombre-enfant-assures',
  meta: { label: 'Nombre d\'enfants à assurer' },
},

'children[].birthDate': {
  selector: (i: number) => `#enfants-${i}-dateNaissance`,
  adapter: dateIsoToFr,
  dynamicIndex: true,
  meta: { label: 'Date de naissance enfant' },
},

'children[].ayantDroit': {
  selector: (i: number) => `#enfants-${i}-idAyantDroit`,
  valueMap: {
    '1': 'CLIENT',
    '2': 'CONJOINT',
    CLIENT: 'CLIENT',
    CONJOINT: 'CONJOINT',
  },
  dynamicIndex: true,
  meta: { label: 'Ayant droit enfant' },
},
};
