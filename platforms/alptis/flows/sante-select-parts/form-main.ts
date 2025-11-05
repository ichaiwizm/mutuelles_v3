/**
 * Alptis Santé Select - Main Form Steps
 * Project + Subscriber
 */

import { step, type FlowStep } from '../../../../core/flow-dsl';

export const formMainSteps: FlowStep[] = [
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
];
