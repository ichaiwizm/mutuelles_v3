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

// Specific civility selectors for conditional clicks
'subscriber.civility_madame': {
  selector: 'label:has-text("Madame")',
  meta: { label: 'Civilité - Madame' },
},

'subscriber.civility_monsieur': {
  selector: 'label:has-text("Monsieur")',
  meta: { label: 'Civilité - Monsieur' },
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
  meta: { label: 'Catégorie socio-professionnelle' },
},

// Selector for clicking on dropdown option after typing (autocomplete)
'subscriber.category_option': {
  selector: '.totem-select__dropdown-item',
  meta: { label: 'Catégorie option dans le dropdown (après recherche)' },
},

'subscriber.regime': {
  selector: '.section-adherent .totem-select__input input[placeholder="Sélectionner un régime obligatoire"]',
  valueMap: {
    ALSACE_MOSELLE: 'Alsace',
    AMEXA: 'Amexa',
    REGIME_SALARIES_AGRICOLES: 'salariés agricoles',
    SECURITE_SOCIALE: 'Sécurité sociale',
    SECURITE_SOCIALE_INDEPENDANTS: 'indépendants',  // Shortened to trigger autocomplete
    TNS: 'indépendants', // Map TNS to "indépendants" (autocomplete search)
  },
  meta: { label: 'Régime obligatoire' },
},

// Selector for clicking on dropdown option after typing (autocomplete)
'subscriber.regime_option': {
  selector: '.totem-select__dropdown-item',
  meta: { label: 'Régime option dans le dropdown (après recherche)' },
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

// Helper selector to close calendar/dropdown overlays by clicking on a neutral area
'_closeCalendar': {
  selector: 'h1, h2, .totem-section__title',
  meta: { label: 'Page title - used to close calendar overlays by clicking outside' },
},
};
