/**
 * Alptis - Children Selectors
 */

import { dateIsoToFr } from '../../../core/adapters';
import type { SelectorMap } from '../../types';

export const childrenSelectors: SelectorMap = {
'children.present': {
  selector: '.totem-section__header:has(.totem-section__header-title:has-text("Enfants")) .totem-toggle .totem-toggle__input',
  meta: {
    label: 'Enfants – Oui/Non (toggle)',
    notes: 'Toggle checkbox input - targets the actual checkbox inside the toggle control',
  },
},

'children.add_button': {
  selector: '.totem-section:has(.totem-section__header-title:has-text("Enfants")) button:has-text("Ajouter un enfant")',
  meta: { label: 'Ajouter un enfant' },
},

'children[].birthDate': {
  selector: (i: number) => `#date-naissance-enfant-${i} input[data-test="input"]`,
  adapter: dateIsoToFr,
  dynamicIndex: true,
  meta: { label: 'Date naissance enfant' },
},

'children[].regime': {
  selector: (i: number) => `.sub-section-enfant:nth-of-type(${i + 1}) .totem-select__input input[placeholder="Sélectionner un régime obligatoire"]`,
  valueMap: {
    ALSACE_MOSELLE: 'ALSACE_MOSELLE',
    AMEXA: 'AMEXA',
    REGIME_SALARIES_AGRICOLES: 'REGIME_SALARIES_AGRICOLES',
    SECURITE_SOCIALE: 'SECURITE_SOCIALE',
    SECURITE_SOCIALE_INDEPENDANTS: 'SECURITE_SOCIALE_INDEPENDANTS',
    TNS: 'SECURITE_SOCIALE_INDEPENDANTS',
  },
  dynamicIndex: true,
  meta: {
    label: 'Régime enfant',
    notes: 'Index base is 1 for CSS nth-of-type',
  },
},
};
