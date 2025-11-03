/**
 * SwissLifeOne SLSIS Flow (v2)
 * ==============================
 *
 * Converted from legacy JSON to TypeScript DSL.
 *
 * Key changes:
 * - skipIfNot → when: { field: 'spouse', isEmpty: false }
 * - skipIf → when: { field: 'xxx', isEmpty: true }
 * - domainField → field (unified)
 * - Typed with Flow interface
 * - Uses step builders
 */

import { step, type Flow } from '../../../core/dsl';

export const slsis: Flow = {
  slug: 'swisslifeone/slsis',
  platform: 'swisslifeone',
  name: 'SwissLifeOne - SLSIS (Tarification & Simulation)',
  description: 'Complete health insurance simulation flow for SwissLifeOne platform',
  trace: 'retain-on-failure',

  steps: [
    // ============================================================
    // LOGIN
    // ============================================================

    step.goto('https://www.swisslifeone.fr/', 'accueil'),
    step.waitField('auth.loginButton', 'wait-login-button'),
    step.click('auth.loginButton', {}, 'click-login-button'),
    step.sleep(2000, 'wait-sso-load'),

    step.waitField('auth.username', 'wait-sso-form'),
    step.fill('auth.username', { value: '{credentials.username}' }, 'fill-user'),
    step.fill('auth.password', { value: '{credentials.password}' }, 'fill-pass'),
    step.click('auth.submit', {}, 'submit'),

    step.sleep(5000, 'wait-post-login'),
    step.click('consent.acceptAll', { optional: true }, 'accept-cookies'),
    step.sleep(1000, 'wait-after-cookies'),

    // ============================================================
    // NAVIGATE TO SLSIS
    // ============================================================

    step.goto('https://www.swisslifeone.fr/index-swisslifeOne.html#/tarification-et-simulation/slsis', 'goto-slsis-page'),
    step.sleep(1500, 'wait-slsis-load'),

    step.click('consent.acceptAll', { optional: true }, 'accept-cookies-page'),
    step.sleep(1000, 'wait-after-cookie'),

    step.enterFrame('iframe[name="iFrameTarificateur"]', 'enter-slsis-iframe', 15000),
    step.sleep(800, 'wait-iframe-ready'),

    // ============================================================
    // PROJECT NAME
    // ============================================================

    step.comment('=== ÉTAPE 1: NOM DU PROJET ==='),
    step.waitField('project.name', 'wait-nom-projet'),
    step.fill('project.name', {
      value: 'Simulation {lead.subscriber.lastName} {lead.subscriber.firstName}',
    }, 'fill-nom-projet'),
    step.sleep(300, 'wait-after-nom-projet'),

    // ============================================================
    // SUBSCRIBER BIRTH DATE
    // ============================================================

    step.comment('=== ÉTAPE 2: DATE NAISSANCE ASSURÉ PRINCIPAL ==='),
    step.waitField('subscriber.birthDate', 'wait-date-naissance'),
    step.fill('subscriber.birthDate', { leadKey: 'subscriber.birthDate' }, 'fill-date-naissance'),
    step.sleep(2000, 'network-after-date-naissance'),

    // ============================================================
    // ACTIVATE FORM (COUVERTURE & IJ)
    // ============================================================

    step.comment('=== ÉTAPE 3: COUVERTURE & IJ (ACTIVE LE FORMULAIRE) ==='),
    step.waitField('project.couverture', 'wait-couverture-oui'),
    step.click('project.couverture', {}, 'click-couverture-oui'),
    step.sleep(2000, 'network-after-couverture'),

    step.waitField('project.ij_non', 'wait-ij-non'),
    step.click('project.ij_non', { optional: true }, 'click-ij-non'),
    step.sleep(2000, 'network-after-ij'),

    // ============================================================
    // SIMULATION TYPE
    // ============================================================

    step.comment('=== ÉTAPE 4: TYPE SIMULATION (CHARGE LES OPTIONS) ==='),
    step.waitField('project.simulationType_individuel', 'wait-simulation-individuelle'),
    step.click('project.simulationType_individuel', {}, 'click-simulation-individuelle'),
    step.click('project.simulationType_couple', {
      when: { field: 'spouse', isEmpty: false },
    }, 'click-simulation-couple'),
    step.sleep(2000, 'network-after-simulation'),

    // ============================================================
    // SUBSCRIBER DETAILS
    // ============================================================

    step.comment('=== ÉTAPE 5: DONNÉES ASSURÉ PRINCIPAL ==='),
    step.waitField('subscriber.departmentCode', 'wait-departement'),
    step.select('subscriber.departmentCode', { leadKey: 'subscriber.departmentCode' }, 'select-departement'),
    step.select('subscriber.regime', { leadKey: 'subscriber.regime' }, 'select-regime'),
    step.select('subscriber.status', { leadKey: 'subscriber.status' }, 'select-statut'),
    step.select('subscriber.profession', {
      leadKey: 'subscriber.profession',
      when: {
        or: [
          { field: 'subscriber.profession', isEmpty: true },
          {
            field: 'subscriber.status',
            oneOf: ['SALARIE_AGRICOLE', 'EXPLOITANT_AGRICOLE', 'RETRAITE', 'RETRAITE_ANCIEN_SALARIE', 'RETRAITE_ANCIEN_EXPLOITANT'],
          },
        ],
      },
      optional: true,
    }, 'select-profession'),
    step.sleep(2000, 'network-after-identite'),

    // ============================================================
    // SPOUSE DETAILS
    // ============================================================

    step.comment('=== ÉTAPE 6: DONNÉES CONJOINT (si présent) ==='),
    step.waitField('nav.onglet_conjoint', 'wait-onglet-conjoint'),
    step.click('nav.onglet_conjoint', {
      when: { field: 'spouse', isEmpty: false },
      optional: true,
    }, 'click-onglet-conjoint'),
    step.sleep(500, 'wait-after-onglet-conjoint'),

    step.waitField('spouse.birthDate', 'wait-conjoint-date-naissance'),
    step.fill('spouse.birthDate', {
      leadKey: 'spouse.birthDate',
      when: { field: 'spouse', isEmpty: false },
      optional: true,
    }, 'fill-conjoint-date-naissance'),

    step.select('spouse.regime', {
      leadKey: 'spouse.regime',
      when: { field: 'spouse', isEmpty: false },
      optional: true,
    }, 'select-conjoint-regime'),

    step.select('spouse.status', {
      leadKey: 'spouse.status',
      when: { field: 'spouse.status', isEmpty: false },
      optional: true,
    }, 'select-conjoint-statut'),

    step.select('spouse.profession', {
      leadKey: 'spouse.profession',
      when: {
        or: [
          { field: 'spouse.profession', isEmpty: true },
          {
            field: 'spouse.status',
            oneOf: ['SALARIE_AGRICOLE', 'EXPLOITANT_AGRICOLE', 'RETRAITE', 'RETRAITE_ANCIEN_SALARIE', 'RETRAITE_ANCIEN_EXPLOITANT'],
          },
        ],
      },
      optional: true,
    }, 'select-conjoint-profession'),

    step.sleep(2000, 'network-after-conjoint'),

    // ============================================================
    // CHILDREN
    // ============================================================

    step.comment('=== ÉTAPE 7: ENFANTS ==='),
    step.waitField('children.count', 'wait-nb-enfants'),
    step.select('children.count', { leadKey: 'subscriber.childrenCount' }, 'select-nb-enfants'),
    step.sleep(2000, 'network-after-nb-enfants'),

    // Child 0
    step.comment('=== Enfant 0 ==='),
    step.waitField('children[].birthDate', 'wait-enfant-0-date'),
    step.fill('children[].birthDate', {
      leadKey: 'children[0].birthDate',
      when: { field: 'children[0].birthDate', isEmpty: false },
      optional: true,
    }, 'fill-enfant-0-date'),
    step.select('children[].ayantDroit', {
      leadKey: 'children[0].ayantDroit',
      when: { field: 'children[0].ayantDroit', isEmpty: false },
      optional: true,
    }, 'select-enfant-0-ayant'),

    // Child 1
    step.comment('=== Enfant 1 ==='),
    step.fill('children[].birthDate', {
      leadKey: 'children[1].birthDate',
      when: { field: 'children[1].birthDate', isEmpty: false },
      optional: true,
    }, 'fill-enfant-1-date'),
    step.select('children[].ayantDroit', {
      leadKey: 'children[1].ayantDroit',
      when: { field: 'children[1].ayantDroit', isEmpty: false },
      optional: true,
    }, 'select-enfant-1-ayant'),

    // Child 2
    step.comment('=== Enfant 2 ==='),
    step.fill('children[].birthDate', {
      leadKey: 'children[2].birthDate',
      when: { field: 'children[2].birthDate', isEmpty: false },
      optional: true,
    }, 'fill-enfant-2-date'),
    step.select('children[].ayantDroit', {
      leadKey: 'children[2].ayantDroit',
      when: { field: 'children[2].ayantDroit', isEmpty: false },
      optional: true,
    }, 'select-enfant-2-ayant'),

    // ============================================================
    // PLAN SELECTION
    // ============================================================

    step.comment('=== ÉTAPE 8: SÉLECTION GAMME (MAINTENANT DISPONIBLE) ==='),
    step.waitField('project.plan', 'wait-gamme'),
    step.select('project.plan', { value: 'SwissLife Santé' }, 'select-gamme'),
    step.sleep(2000, 'network-after-gamme'),

    step.waitField('project.dateEffet', 'wait-date-effet'),
    step.fill('project.dateEffet', { leadKey: 'project.dateEffet' }, 'fill-date-effet'),
    step.sleep(2000, 'network-after-date-effet'),

    // ============================================================
    // OPTIONS (MADELIN, RÉSILIATION, REPRISE)
    // ============================================================

    step.comment('=== ÉTAPE 9: OPTIONS (MADELIN, RÉSILIATION, REPRISE) ==='),
    step.click('project.madelin', {
      when: { field: 'subscriber.status', equals: 'TNS' },
      optional: true,
    }, 'click-madelin'),

    step.waitField('project.resiliation_non', 'wait-resiliation-non'),
    step.click('project.resiliation_non', { optional: true }, 'click-resiliation-non'),

    step.waitField('project.reprise_non', 'wait-reprise-non'),
    step.click('project.reprise_non', { optional: true }, 'click-reprise-non'),

    // ============================================================
    // EXIT
    // ============================================================

    step.comment('=== ÉTAPE 10: SORTIE ==='),
    step.exitFrame('exit-slsis-iframe'),
  ],
};

export default slsis;
