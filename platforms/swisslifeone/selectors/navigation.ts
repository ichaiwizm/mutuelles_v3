/**
 * SwissLifeOne - Navigation Selectors
 */

import type { SelectorMap } from '../../types';

export const navigationSelectors: SelectorMap = {
// ============================================================

'nav.menu_etudes_simulateurs': {
  selector: 'a:has-text("Études et simulateurs")',
  meta: { label: 'Menu Études et simulateurs' },
},

'nav.menu_simulateurs': {
  selector: '.mat-mdc-menu-item.sous-lien:has-text("Simulateurs")',
  meta: { label: 'Menu Simulateurs' },
},

'nav.btn_suivant_projet': {
  selector: '#bt-suite-projet, button:has-text("Suivant"), button:has-text("Suite")',
  meta: { label: 'Bouton Suivant (Projet)' },
},

'nav.btn_suivant_confort': {
  selector: '#bt-suite-confortHospitalisation, button:has-text("Suivant")',
  meta: { label: 'Bouton Suivant (Confort Hospitalisation)' },
},

'nav.btn_suivant_souscription': {
  selector: '#bt-souscription-suite, button:has-text("Suivant")',
  meta: { label: 'Bouton Suivant (Souscription)' },
},

'nav.onglet_souscripteur': {
  selector: '#ui-id-8, a[href="#tab-souscripteur"]',
  meta: { label: 'Onglet Souscripteur' },
},

'nav.onglet_conjoint': {
  selector: 'li.conjoint, a[href="#tabs-assure-conjoint"]',
  meta: { label: 'Onglet Conjoint' },
},
};

export const platformConfig = {
slug: 'swisslifeone',
name: 'SwissLife One',
baseUrl: 'https://www.swisslifeone.fr/',
selectors,
notes: 'Platform uses iframes for simulation forms. Date format: DD/MM/YYYY.',
};
