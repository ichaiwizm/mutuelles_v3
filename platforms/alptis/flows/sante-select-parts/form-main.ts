/**
 * Alptis Santé Select - Main Form Steps
 * Project + Subscriber
 */

import { step, type FlowStep } from '../../../../core/dsl';

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
  step.sleep(500, 'wait-after-prenom'),  // Ensure firstName is persisted
  step.fill('subscriber.birthDate', { leadKey: 'subscriber.birthDate' }, 'fill-naissance-adherent'),
  step.pressKey('Escape', 'close-calendar'),  // Close the calendar picker
  step.sleep(500, 'wait-after-calendar-close'),

  // Use fill instead of select for Totem custom dropdown component
  step.fill('subscriber.category', { leadKey: 'subscriber.category' }, 'fill-categorie-adherent'),
  step.sleep(1000, 'wait-after-categorie-adherent'),  // Wait for workFramework field to appear

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

  // Use fill instead of select for Totem custom dropdown component
  step.fill('subscriber.regime', { leadKey: 'subscriber.regime' }, 'fill-regime-adherent'),
  step.sleep(300, 'wait-after-regime-adherent'),

  step.fill('subscriber.postalCode', { leadKey: 'subscriber.postalCode' }, 'fill-code-postal'),

  // ============================================================
];
