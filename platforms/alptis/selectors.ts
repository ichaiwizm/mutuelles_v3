/**
 * Alptis Platform Selectors
 * ==========================
 *
 * Typed selector definitions for Alptis platform.
 * Converted from legacy JSON to TypeScript.
 */

import { dateIsoToFr } from '../../core/adapters';
import type { SelectorMap } from '../types';

export const selectors: SelectorMap = {
  // ============================================================
  // AUTHENTICATION
  // ============================================================

  'auth.username': {
    selector: '#username',
    meta: { label: 'Nom d\'utilisateur' },
  },

  'auth.password': {
    selector: '#password',
    meta: { label: 'Mot de passe' },
  },

  'auth.submit': {
    selector: 'button[type="submit"]',
    meta: { label: 'Connexion' },
  },

  // ============================================================
  // PROJECT
  // ============================================================

  'project.dateEffet': {
    selector: '#dateEffet input[data-test="input"]',
    adapter: dateIsoToFr,
    meta: { label: 'Date d\'effet' },
  },

  // ============================================================
  // SUBSCRIBER (MAIN INSURED)
  // ============================================================

  'subscriber.civility': {
    selector: '.section-adherent span[data-test="radio"]',
    meta: {
      label: 'Civilité adhérent',
      notes: 'Radio group - use specific selector based on value',
    },
  },

  'subscriber.civility_monsieur': {
    selector: '.section-adherent span[data-test="radio"][value="MONSIEUR"] label',
    meta: { label: 'Civilité adhérent - Monsieur' },
  },

  'subscriber.civility_madame': {
    selector: '.section-adherent span[data-test="radio"][value="MADAME"] label',
    meta: { label: 'Civilité adhérent - Madame' },
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

  // ============================================================
  // SPOUSE
  // ============================================================

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

  // ============================================================
  // CHILDREN
  // ============================================================

  'children.present': {
    selector: '.totem-section__header:has(.totem-section__header-title:has-text("Enfants")) .totem-toggle',
    meta: {
      label: 'Enfants – Oui/Non (toggle)',
      notes: 'Toggle control',
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

export const platformConfig = {
  slug: 'alptis',
  name: 'Alptis',
  baseUrl: 'https://www.alptis.org/',
  selectors,
  notes: 'Platform uses custom Totem UI components. Toggle states checked with .totem-toggle--on class.',
};
