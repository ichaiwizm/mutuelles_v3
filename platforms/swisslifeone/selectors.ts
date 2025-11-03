/**
 * SwissLifeOne Platform Selectors
 * =================================
 *
 * Typed selector definitions for SwissLifeOne platform.
 * Converted from legacy JSON to TypeScript.
 *
 * Changes from legacy:
 * - Dates: adapter converts ISO (YYYY-MM-DD) to FR (DD/MM/YYYY)
 * - Children: dynamic selectors using functions
 * - Value mappings: consolidated and typed
 */

import { dateIsoToFr } from '../../core/adapters';
import type { SelectorMap } from '../types';

export const selectors: SelectorMap = {
  // ============================================================
  // AUTHENTICATION
  // ============================================================

  'auth.loginButton': {
    selector: '.button-connection',
    meta: { label: 'Bouton Se connecter (page d\'accueil)' },
  },

  'auth.username': {
    selector: '#userNameInput',
    meta: { label: 'Nom d\'utilisateur' },
  },

  'auth.password': {
    selector: '#passwordInput',
    meta: { label: 'Mot de passe' },
  },

  'auth.submit': {
    selector: '#submitButton',
    meta: { label: 'Connexion' },
  },

  'consent.acceptAll': {
    selector: '#onetrust-accept-btn-handler',
    meta: { label: 'Tout autoriser (cookies)' },
  },

  // ============================================================
  // PROJECT
  // ============================================================

  'project.name': {
    selector: '#nom-projet',
    meta: { label: 'Nom du projet' },
  },

  'project.dateEffet': {
    selector: '#contratSante-dateEffet',
    adapter: dateIsoToFr,
    meta: { label: 'Date d\'effet' },
  },

  'project.plan': {
    selector: '#selection-produit-sante, [name="contratSante.produitId"]',
    meta: { label: 'Gamme assurance' },
  },

  'project.couverture': {
    selector: 'label[for="projet-sante-individuelle-oui"]',
    meta: { label: 'Couverture individuelle Oui' },
  },

  'project.couverture_non': {
    selector: 'label[for="projet-sante-individuelle-non"]',
    meta: { label: 'Couverture individuelle Non' },
  },

  'project.ij': {
    selector: 'label[for="projet-confort-hospitalisation-oui"]',
    meta: { label: 'Indemnités journalières Oui' },
  },

  'project.ij_non': {
    selector: 'label[for="projet-confort-hospitalisation-non"]',
    meta: { label: 'Indemnités journalières Non' },
  },

  'project.simulationType_individuel': {
    selector: 'label[for="simulation-individuelle"]',
    meta: { label: 'Type simulation Individuel' },
  },

  'project.simulationType_couple': {
    selector: 'label[for="simulation-couple"]',
    meta: { label: 'Type simulation Couple' },
  },

  'project.madelin': {
    selector: 'label[for="loi-madelin-checkbox"], label:has(#madelin)',
    meta: { label: 'Option Loi Madelin (checkbox via label)' },
  },

  'project.resiliation': {
    selector: 'label[for="resiliation-contrat-oui"]',
    meta: { label: 'Résiliation Oui' },
  },

  'project.resiliation_non': {
    selector: 'label[for="resiliation-contrat-non"]',
    meta: { label: 'Résiliation Non' },
  },

  'project.reprise': {
    selector: 'label[for="reprise-concurrence-oui"]',
    meta: { label: 'Reprise concurrence Oui' },
  },

  'project.reprise_non': {
    selector: 'label[for="reprise-concurrence-non"]',
    meta: { label: 'Reprise concurrence Non' },
  },

  // ============================================================
  // SUBSCRIBER (MAIN INSURED)
  // ============================================================

  'subscriber.birthDate': {
    selector: '#date-naissance-assure-principal',
    adapter: dateIsoToFr,
    meta: { label: 'Date de naissance souscripteur' },
  },

  'subscriber.regime': {
    selector: '#regime-social-assure-principal',
    valueMap: {
      SECURITE_SOCIALE: 'SECURITE_SOCIALE',
      REGIME_GENERAL: 'SECURITE_SOCIALE',
      RG: 'SECURITE_SOCIALE',
      ALSACE_MOSELLE: 'SECURITE_SOCIALE_ALSACE_MOSELLE',
      SECURITE_SOCIALE_ALSACE_MOSELLE: 'SECURITE_SOCIALE_ALSACE_MOSELLE',
      TNS: 'TNS',
      INDEPENDANT: 'TNS',
      INDEPENDANTS: 'TNS',
      MSA: 'AMEXA',
      AMEXA: 'AMEXA',
      AUTRES: 'AUTRES_REGIME_SPECIAUX',
      AUTRES_REGIME_SPECIAUX: 'AUTRES_REGIME_SPECIAUX',
      '*': 'SECURITE_SOCIALE',
    },
    meta: { label: 'Régime social' },
  },

  'subscriber.status': {
    selector: '#statut-assure-principal',
    meta: { label: 'Statut' },
  },

  'subscriber.profession': {
    selector: '#profession-assure-principal',
    valueMap: {
      MEDECIN: 'MEDECIN',
      'Médecin': 'MEDECIN',
      CHIRURGIEN: 'CHIRURGIEN',
      'Chirurgien': 'CHIRURGIEN',
      CHIRURGIEN_DENTISTE: 'CHIRURGIEN_DENTISTE',
      'Chirurgien dentiste': 'CHIRURGIEN_DENTISTE',
      PHARMACIEN: 'PHARMACIEN',
      'Pharmacien': 'PHARMACIEN',
      AUXILIAIRE_MEDICAL: 'AUXILIAIRE_MEDICAL',
      'Auxiliaire médical': 'AUXILIAIRE_MEDICAL',
      AUTRE: 'AUTRE',
      'Autre': 'AUTRE',
      'Artisan': 'AUTRE',
      ARTISAN: 'AUTRE',
      'Independant': 'AUTRE',
      'Indépendant': 'AUTRE',
      INDEPENDANT: 'AUTRE',
      EMPLOYE: 'AUTRE',
      'Employé': 'AUTRE',
      'Cadre': 'AUTRE',
      'Salarié': 'AUTRE',
      SALARIE: 'AUTRE',
      '*': 'AUTRE',
    },
    meta: { label: 'Profession' },
  },

  'subscriber.departmentCode': {
    selector: '#departement-assure-principal',
    meta: { label: 'Département' },
  },

  // ============================================================
  // SPOUSE
  // ============================================================

  'spouse.birthDate': {
    selector: '#date-naissance-assure-conjoint',
    adapter: dateIsoToFr,
    meta: { label: 'Date de naissance conjoint' },
  },

  'spouse.regime': {
    selector: '#regime-social-assure-conjoint',
    valueMap: {
      SECURITE_SOCIALE: 'SECURITE_SOCIALE',
      REGIME_GENERAL: 'SECURITE_SOCIALE',
      RG: 'SECURITE_SOCIALE',
      ALSACE_MOSELLE: 'SECURITE_SOCIALE_ALSACE_MOSELLE',
      SECURITE_SOCIALE_ALSACE_MOSELLE: 'SECURITE_SOCIALE_ALSACE_MOSELLE',
      TNS: 'TNS',
      INDEPENDANT: 'TNS',
      INDEPENDANTS: 'TNS',
      MSA: 'AMEXA',
      AMEXA: 'AMEXA',
      AUTRES: 'AUTRES_REGIME_SPECIAUX',
      AUTRES_REGIME_SPECIAUX: 'AUTRES_REGIME_SPECIAUX',
      '*': 'SECURITE_SOCIALE',
    },
    meta: { label: 'Régime social conjoint' },
  },

  'spouse.status': {
    selector: '#statut-assure-conjoint',
    meta: { label: 'Statut conjoint' },
  },

  'spouse.profession': {
    selector: '#profession-assure-conjoint',
    valueMap: {
      MEDECIN: 'MEDECIN',
      'Médecin': 'MEDECIN',
      CHIRURGIEN: 'CHIRURGIEN',
      'Chirurgien': 'CHIRURGIEN',
      CHIRURGIEN_DENTISTE: 'CHIRURGIEN_DENTISTE',
      'Chirurgien dentiste': 'CHIRURGIEN_DENTISTE',
      PHARMACIEN: 'PHARMACIEN',
      'Pharmacien': 'PHARMACIEN',
      AUXILIAIRE_MEDICAL: 'AUXILIAIRE_MEDICAL',
      'Auxiliaire médical': 'AUXILIAIRE_MEDICAL',
      AUTRE: 'AUTRE',
      'Autre': 'AUTRE',
      'Artisan': 'AUTRE',
      ARTISAN: 'AUTRE',
      'Independant': 'AUTRE',
      'Indépendant': 'AUTRE',
      INDEPENDANT: 'AUTRE',
      EMPLOYE: 'AUTRE',
      'Employé': 'AUTRE',
      'Cadre': 'AUTRE',
      'Salarié': 'AUTRE',
      SALARIE: 'AUTRE',
      '*': 'AUTRE',
    },
    meta: { label: 'Profession conjoint' },
  },

  // ============================================================
  // CHILDREN
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

  // ============================================================
  // NAVIGATION
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
