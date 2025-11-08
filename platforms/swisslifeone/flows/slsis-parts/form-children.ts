/**
 * SLSIS Flow - Children & Exit Steps
 */

import { step, type FlowStep } from '../../../../core/dsl';

export const formChildrenSteps: FlowStep[] = [
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
];
