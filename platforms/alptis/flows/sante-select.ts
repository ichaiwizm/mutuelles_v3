/**
 * Alptis Santé Select Flow (v2)
 * ===============================
 *
 * Converted from legacy JSON to TypeScript DSL.
 *
 * Flow: Login → Fill project info → Subscriber → Spouse → Children
 */

import { step, type Flow } from '../../../core/dsl';

export const santeSelect: Flow = {
  slug: 'alptis/sante-select',
  platform: 'alptis',
  name: 'Alptis Santé Select – Informations projet',
  description: 'Complete health insurance form for Alptis platform',
  trace: 'retain-on-failure',

  steps: [
    // ============================================================
    // LOGIN
    // ============================================================

    step.goto('https://pro.alptis.org/', 'accueil'),
    step.waitField('auth.username', 'login-form'),

    // Accept consent (optional, may not appear)
    step.click('consent.acceptAll', { optional: true }, 'accept-axeptio-1'),

    step.fill('auth.username', { value: '{credentials.username}' }, 'fill-user'),
    step.fill('auth.password', { value: '{credentials.password}' }, 'fill-pass'),

    step.click('consent.acceptAll', { optional: true }, 'accept-axeptio-2'),
    step.sleep(800, 'wait-before-submit'),
    step.click('auth.submit', {}, 'submit'),

    // ============================================================
    // NAVIGATE TO PROJECT PAGE
    // ============================================================

    step.goto('https://pro.alptis.org/sante-select/informations-projet/', 'goto-infos-projet'),
    step.sleep(1500, 'post-goto-wait'),
    step.click('consent.acceptAll', { optional: true }, 'accept-axeptio-page'),
    step.waitField('project.dateEffet', 'infos-projet-ready'),

    // ============================================================
    // PROJECT INFO
    // ============================================================

    step.fill('project.dateEffet', { leadKey: 'project.dateEffet' }, 'fill-date-effet'),
    step.sleep(1500, 'wait-after-date-effet'),

    // ============================================================
    // SUBSCRIBER (MAIN INSURED)
    // ============================================================

    // Civility (radio button)
    step.click('subscriber.civility', { leadKey: 'subscriber.civility' }, 'select-civilite'),
    step.sleep(400, 'wait-after-civilite'),

    // Refill date effet (workaround for form quirk)
    step.fill('project.dateEffet', { leadKey: 'project.dateEffet' }, 'refill-date-effet'),
    step.sleep(500, 'wait-after-refill-date'),

    step.fill('subscriber.lastName', { leadKey: 'subscriber.lastName' }, 'fill-nom'),
    step.fill('subscriber.firstName', { leadKey: 'subscriber.firstName' }, 'fill-prenom'),
    step.fill('subscriber.birthDate', { leadKey: 'subscriber.birthDate' }, 'fill-naissance-adherent'),

    step.select('subscriber.category', { leadKey: 'subscriber.category' }, 'select-categorie-adherent'),
    step.sleep(300, 'wait-after-categorie-adherent'),

    // Work framework (conditional on category)
    step.click('subscriber.workFramework_independant', {
      when: {
        field: 'subscriber.category',
        oneOf: [
          'CHEFS_D_ENTREPRISE',
          'PROFESSIONS_LIBERALES_ET_ASSIMILES',
          'ARTISANS',
          'COMMERCANTS_ET_ASSIMILES',
          'AGRICULTEURS_EXPLOITANTS',
        ],
      },
      optional: true,
    }, 'cadre-exercice-independant'),
    step.sleep(300, 'wait-after-cadre-exercice'),

    step.select('subscriber.regime', { leadKey: 'subscriber.regime' }, 'select-regime-adherent'),
    step.sleep(300, 'wait-after-regime-adherent'),

    step.fill('subscriber.postalCode', { leadKey: 'subscriber.postalCode' }, 'fill-code-postal'),

    // ============================================================
    // SPOUSE
    // ============================================================

    step.toggle('spouse.present', {
      value: true,
      when: { field: 'spouse', isEmpty: false },
    }, 'toggle-conjoint-oui'),
    step.sleep(300, 'wait-after-toggle-conjoint'),

    step.fill('spouse.birthDate', {
      leadKey: 'spouse.birthDate',
      when: { field: 'spouse', isEmpty: false },
      optional: true,
    }, 'fill-naissance-conjoint'),

    step.select('spouse.category', {
      leadKey: 'spouse.category',
      when: { field: 'spouse', isEmpty: false },
      optional: true,
    }, 'select-categorie-conjoint'),
    step.sleep(300, 'wait-after-categorie-conjoint'),

    step.select('spouse.regime', {
      leadKey: 'spouse.regime',
      when: { field: 'spouse', isEmpty: false },
      optional: true,
    }, 'select-regime-conjoint'),
    step.sleep(300, 'wait-after-regime-conjoint'),

    // ============================================================
    // CHILDREN
    // ============================================================

    step.toggle('children.present', {
      value: true,
      when: { field: 'children', isEmpty: false },
    }, 'toggle-enfants-oui'),
    step.waitField('children.add_button', 'wait-add-enfant-visible'),

    // Child 0
    step.comment('=== Enfant 0 ==='),
    step.fill('children[].birthDate', {
      leadKey: 'children[0].birthDate',
      when: { field: 'children[0].birthDate', isEmpty: false },
      optional: true,
    }, 'fill-naissance-enfant-1'),
    step.select('children[].regime', {
      leadKey: 'children[0].regime',
      when: { field: 'children[0].regime', isEmpty: false },
      optional: true,
    }, 'regime-enfant-1'),
    step.sleep(300, 'wait-after-regime-enfant-1'),

    // Child 1 (need to click "add" button first)
    step.comment('=== Enfant 1 ==='),
    step.click('children.add_button', {
      when: { field: 'children[1]', isEmpty: false },
    }, 'add-enfant-2'),
    step.sleep(300, 'wait-after-add-enfant-2'),
    step.fill('children[].birthDate', {
      leadKey: 'children[1].birthDate',
      when: { field: 'children[1].birthDate', isEmpty: false },
      optional: true,
    }, 'fill-naissance-enfant-2'),
    step.select('children[].regime', {
      leadKey: 'children[1].regime',
      when: { field: 'children[1].regime', isEmpty: false },
      optional: true,
    }, 'regime-enfant-2'),
    step.sleep(300, 'wait-after-regime-enfant-2'),

    // Child 2
    step.comment('=== Enfant 2 ==='),
    step.click('children.add_button', {
      when: { field: 'children[2]', isEmpty: false },
    }, 'add-enfant-3'),
    step.sleep(300, 'wait-after-add-enfant-3'),
    step.fill('children[].birthDate', {
      leadKey: 'children[2].birthDate',
      when: { field: 'children[2].birthDate', isEmpty: false },
      optional: true,
    }, 'fill-naissance-enfant-3'),
    step.select('children[].regime', {
      leadKey: 'children[2].regime',
      when: { field: 'children[2].regime', isEmpty: false },
      optional: true,
    }, 'regime-enfant-3'),
    step.sleep(300, 'wait-after-regime-enfant-3'),

    step.sleep(500, 'final-wait'),
  ],
};

export default santeSelect;
