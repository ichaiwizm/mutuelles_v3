/**
 * Alptis - Spouse Selectors
 */

import { dateIsoToFr } from '../../../core/adapters';
import type { SelectorMap } from '../../types';

export const spouseSelectors: SelectorMap = {
'spouse.present': {
  selector: '.totem-section__header:has(.totem-section__header-title:has-text("Conjoint(e)")) .totem-toggle',
  meta: {
    label: 'Conjoint – Oui/Non (toggle)',
    notes: 'Toggle control - check state with .totem-toggle--on class',
  },
},

'spouse.birthDate': {
  selector: '#date-naissance-conjoint input[data-test="input"]',
  adapter: dateIsoToFr,
  meta: { label: 'Date naissance conjoint' },
},

'spouse.category': {
  selector: '.sel-c-conjoint-content .totem-select__input input[placeholder="Sélectionner une catégorie socioprofessionnelle"]',
  meta: { label: 'Catégorie (conjoint)' },
},

'spouse.regime': {
  selector: '.sel-c-conjoint-content .totem-select__input input[placeholder="Sélectionner un régime obligatoire"]',
  valueMap: {
    ALSACE_MOSELLE: 'ALSACE_MOSELLE',
    AMEXA: 'AMEXA',
    REGIME_SALARIES_AGRICOLES: 'REGIME_SALARIES_AGRICOLES',
    SECURITE_SOCIALE: 'SECURITE_SOCIALE',
    SECURITE_SOCIALE_INDEPENDANTS: 'SECURITE_SOCIALE_INDEPENDANTS',
    TNS: 'SECURITE_SOCIALE_INDEPENDANTS',
  },
  meta: { label: 'Régime (conjoint)' },
},
};
