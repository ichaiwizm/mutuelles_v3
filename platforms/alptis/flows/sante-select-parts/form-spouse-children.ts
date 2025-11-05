/**
 * Alptis Santé Select - Spouse & Children Steps
 */

import { step, type FlowStep } from '../../../../core/flow-dsl';

export const formSpouseChildrenSteps: FlowStep[] = [
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
