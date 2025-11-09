/**
 * Alptis Santé Select - Main Form Steps
 * Project + Subscriber
 */

import { step, type FlowStep } from '../../../../core/dsl';

export const formMainSteps: FlowStep[] = [
  // ============================================================
  // SUBSCRIBER (MAIN INSURED)
  // ============================================================

  // Civility (radio button) - conditional clicks based on lead data
  step.click('subscriber.civility_madame', {
    when: { field: 'subscriber.civility', oneOf: ['MADAME'] },
  }, 'select-civilite-madame'),

  step.click('subscriber.civility_monsieur', {
    when: { field: 'subscriber.civility', oneOf: ['MONSIEUR'] },
  }, 'select-civilite-monsieur'),

  step.sleep(400, 'wait-after-civilite'),

  step.fill('subscriber.lastName', { leadKey: 'subscriber.lastName' }, 'fill-nom'),
  step.fill('subscriber.firstName', { leadKey: 'subscriber.firstName' }, 'fill-prenom'),
  step.sleep(500, 'wait-after-prenom'),  // Ensure firstName is persisted
  step.fill('subscriber.birthDate', { leadKey: 'subscriber.birthDate' }, 'fill-naissance-adherent'),
  // Click on page title to close the calendar picker (Escape key doesn't work, calendar blocks other elements)
  step.click('_closeCalendar', {}, 'close-calendar-by-clicking-outside'),
  step.sleep(500, 'wait-after-calendar-close'),

  // Use fill + ArrowDown + Enter for Totem custom dropdown component (autocomplete)
  step.fill('subscriber.category', { leadKey: 'subscriber.category' }, 'fill-categorie-adherent'),
  step.sleep(500, 'wait-suggestion-appear'),
  step.pressKey('ArrowDown', 'select-first-suggestion'),  // Select first suggestion
  step.pressKey('Enter', 'validate-category-selection'),  // Press Enter to confirm
  step.sleep(2000, 'wait-after-categorie-adherent'),  // Wait for workFramework field to appear

  // Work framework (conditional on category)
  // The "Cadre d'exercice" field appears for independent workers (TNS)
  step.click('subscriber.workFramework_independant', {
    when: {
      field: 'subscriber.category',
      oneOf: [
        'PROFESSIONS_LIBERALES_ET_ASSIMILES',
        'CHEFS_D_ENTREPRISE',
        'ARTISANS',
        'COMMERCANTS_ET_ASSIMILES',
        'AGRICULTEURS_EXPLOITANTS',
      ],
    },
    optional: true,
  }, 'cadre-exercice-independant'),
  step.sleep(300, 'wait-after-cadre-exercice'),

  // Use fill + ArrowDown + Enter for Totem custom dropdown component (autocomplete)
  step.fill('subscriber.regime', { leadKey: 'subscriber.regime' }, 'fill-regime-adherent'),
  step.sleep(500, 'wait-suggestion-appear'),
  step.pressKey('ArrowDown', 'select-first-suggestion'),  // Select first suggestion
  step.pressKey('Enter', 'validate-regime-selection'),  // Press Enter to confirm
  step.sleep(300, 'wait-after-regime-adherent'),

  step.fill('subscriber.postalCode', { leadKey: 'subscriber.postalCode' }, 'fill-code-postal'),

  // Workaround: Refill regime to ensure value persists (Totem autocomplete quirk)
  step.fill('subscriber.regime', { leadKey: 'subscriber.regime' }, 'refill-regime-adherent'),
  step.sleep(500, 'wait-suggestion-appear-2'),
  step.pressKey('ArrowDown', 'select-first-suggestion-2'),
  step.pressKey('Enter', 'validate-regime-selection-2'),
  step.sleep(500, 'wait-after-regime-refill'),

  // ============================================================
  // PROJECT - Date d'effet filled at the end to prevent it from being cleared
  // ============================================================

  step.fill('project.dateEffet', { leadKey: 'project.dateEffet' }, 'fill-date-effet'),
  step.sleep(1000, 'wait-after-date-effet'),

  // ============================================================
];
