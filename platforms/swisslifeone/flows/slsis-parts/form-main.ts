/**
 * SLSIS Flow - Main Form Steps
 * Project + Subscriber + Spouse
 */

import { step, type FlowStep } from '../../../../core/dsl';

export const formMainSteps: FlowStep[] = [
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
  step.waitField('subscriber.postalCode', 'wait-departement'),
  step.select('subscriber.postalCode', { leadKey: 'subscriber.postalCode' }, 'select-departement'),
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
  step.waitField('nav.onglet_conjoint', {
    when: { field: 'spouse', isEmpty: false },
    optional: true,
  }, 'wait-onglet-conjoint'),
  step.click('nav.onglet_conjoint', {
    when: { field: 'spouse', isEmpty: false },
    optional: true,
  }, 'click-onglet-conjoint'),
  step.sleep(500, 'wait-after-onglet-conjoint'),

  step.waitField('spouse.birthDate', {
    when: { field: 'spouse', isEmpty: false },
    optional: true,
  }, 'wait-conjoint-date-naissance'),
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
      and: [
        { field: 'spouse', isEmpty: false },
        {
          or: [
            { field: 'spouse.profession', isEmpty: true },
            {
              field: 'spouse.status',
              oneOf: ['SALARIE_AGRICOLE', 'EXPLOITANT_AGRICOLE', 'RETRAITE', 'RETRAITE_ANCIEN_SALARIE', 'RETRAITE_ANCIEN_EXPLOITANT'],
            },
          ],
        },
      ],
    },
    optional: true,
  }, 'select-conjoint-profession'),

  step.sleep(2000, 'network-after-conjoint'),

];
