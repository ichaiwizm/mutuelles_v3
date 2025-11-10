/**
 * Alptis Santé Select - Spouse & Children Steps
 */

import { step, type FlowStep } from '../../../../core/dsl';

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

  // Use fill instead of select for Totem custom dropdown components
  step.fill('spouse.category', {
    leadKey: 'spouse.category',
    when: { field: 'spouse', isEmpty: false },
    optional: true,
  }, 'fill-categorie-conjoint'),
  step.sleep(300, 'wait-after-categorie-conjoint'),

  step.fill('spouse.regime', {
    leadKey: 'spouse.regime',
    when: { field: 'spouse', isEmpty: false },
    optional: true,
  }, 'fill-regime-conjoint'),
  step.sleep(300, 'wait-after-regime-conjoint'),

  // ============================================================
  // CHILDREN
  // ============================================================

  step.toggle('children.present', {
    value: true,
    when: { field: 'children', isEmpty: false },
  }, 'toggle-enfants-oui'),
  step.sleep(300, 'wait-after-toggle-enfants'),

  // Child 0
  step.comment('=== Enfant 0 ==='),
  step.fill('children[].birthDate', {
    leadKey: 'children[0].birthDate',
    when: { field: 'children[0].birthDate', isEmpty: false },
    optional: true,
  }, 'fill-naissance-enfant-1'),
  // Use fill instead of select for Totem custom dropdown component
  step.fill('children[].regime', {
    leadKey: 'children[0].regime',
    when: { field: 'children[0].birthDate', isEmpty: false },
  }, 'fill-regime-enfant-1'),
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
  // Use fill instead of select for Totem custom dropdown component
  step.fill('children[].regime', {
    leadKey: 'children[1].regime',
    when: { field: 'children[1].birthDate', isEmpty: false },
  }, 'fill-regime-enfant-2'),
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
  // Use fill instead of select for Totem custom dropdown component
  step.fill('children[].regime', {
    leadKey: 'children[2].regime',
    when: { field: 'children[2].birthDate', isEmpty: false },
  }, 'fill-regime-enfant-3'),
  step.sleep(300, 'wait-after-regime-enfant-3'),

  step.sleep(500, 'final-wait'),
];
