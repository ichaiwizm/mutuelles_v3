/**
 * Alptis - Subscriber Selectors
 */

import { dateIsoToFr } from '../../../core/adapters';
import type { SelectorMap } from '../../types';

export const subscriberSelectors: SelectorMap = {
'subscriber.civility': {
  selector: '.section-adherent span[data-test="radio"]',
  meta: {
    label: 'Civilité adhérent',
    notes: 'Radio group - use specific selector based on value',
  },
},

'subscriber.lastName': {
  selector: '#nom',
  meta: { label: 'Nom adhérent' },
},

'subscriber.firstName': {
  selector: '#prenom',
  meta: { label: 'Prénom adhérent' },
},

'subscriber.birthDate': {
  selector: '#date-naissance-adherent input[data-test="input"]',
  adapter: dateIsoToFr,
  meta: { label: 'Date naissance adhérent' },
},

'subscriber.category': {
  selector: '.section-adherent .totem-select__input input[placeholder="Sélectionner une catégorie socioprofessionnelle"]',
  meta: { label: 'Catégorie socio-professionnelle' },
},

'subscriber.regime': {
  selector: '.section-adherent .totem-select__input input[placeholder="Sélectionner un régime obligatoire"]',
  valueMap: {
    ALSACE_MOSELLE: 'ALSACE_MOSELLE',
    AMEXA: 'AMEXA',
    REGIME_SALARIES_AGRICOLES: 'REGIME_SALARIES_AGRICOLES',
    SECURITE_SOCIALE: 'SECURITE_SOCIALE',
    SECURITE_SOCIALE_INDEPENDANTS: 'SECURITE_SOCIALE_INDEPENDANTS',
    TNS: 'SECURITE_SOCIALE_INDEPENDANTS', // Map TNS to SECURITE_SOCIALE_INDEPENDANTS
  },
  meta: { label: 'Régime obligatoire' },
},

'subscriber.postalCode': {
  selector: 'input#codePostal',
  meta: { label: 'Code postal' },
},

// Consent
'consent.acceptAll': {
  selector: '#axeptio_btn_acceptAll, #axeptio_overlay #axeptio_btn_acceptAll',
  meta: { label: 'Accept all (cookies)' },
},

'subscriber.workFramework_salarie': {
  selector: 'label:has-text("Salarié")',
  meta: { label: 'Cadre d\'exercice - Salarié' },
},

'subscriber.workFramework_independant': {
  selector: 'label:has-text("Indépendant Président SASU/SAS")',
  meta: { label: 'Cadre d\'exercice - Indépendant' },
},
};
