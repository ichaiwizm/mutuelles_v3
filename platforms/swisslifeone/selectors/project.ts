/**
 * SwissLifeOne - Project Selectors
 */

import { dateIsoToFr } from '../../../core/adapters';
import type { SelectorMap } from '../../types';

export const projectSelectors: SelectorMap = {
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
};
