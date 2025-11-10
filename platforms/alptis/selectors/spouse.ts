/**
 * Alptis - Spouse Selectors
 */

import { dateIsoToFr } from '../../../core/adapters';
import type { SelectorMap } from '../../types';

export const spouseSelectors: SelectorMap = {
'spouse.present': {
  selector: '.totem-section__header:has(.totem-section__header-title:has-text("Conjoint(e)")) .totem-toggle .totem-toggle__input',
  meta: {
    label: 'Conjoint – Oui/Non (toggle)',
    notes: 'Toggle checkbox input - targets the actual checkbox inside the toggle control',
  },
},

'spouse.birthDate': {
  selector: '#date-naissance-conjoint input[data-test="input"]',
  adapter: dateIsoToFr,
  meta: { label: 'Date naissance conjoint' },
},

'spouse.category': {
  selector: '.sel-c-conjoint-content .totem-select__input input[placeholder="Sélectionner une catégorie socioprofessionnelle"]',
  valueMap: {
    CADRES: 'Cadres',
    AGRICULTEURS_EXPLOITANTS: 'Agriculteurs exploitants',
    ARTISANS: 'Artisans',
    CADRES_ET_EMPLOYES_DE_LA_FONCTION_PUBLIQUE: 'Cadres et employés de la fonction publique',
    CHEFS_D_ENTREPRISE: 'Chefs d\'entreprise',
    COMMERCANTS_ET_ASSIMILES: 'Commerçants et assimilés',
    EMPLOYES_AGENTS_DE_MAITRISE: 'Employés, agents de maîtrise',
    OUVRIERS: 'Ouvriers',
    PERSONNES_SANS_ACTIVITE_PROFESSIONNELLE: 'Personnes sans activité professionnelle',
    PROFESSIONS_LIBERALES_ET_ASSIMILES: 'Professions libérales et assimilés',
    RETRAITES: 'Retraités',
  },
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
