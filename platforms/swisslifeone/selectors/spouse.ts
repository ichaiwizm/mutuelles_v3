/**
 * SwissLifeOne - Spouse Selectors
 */

import { dateIsoToFr } from '../../../core/adapters';
import type { SelectorMap } from '../../types';

export const spouseSelectors: SelectorMap = {
// ============================================================

'spouse.birthDate': {
  selector: '#date-naissance-assure-conjoint',
  adapter: dateIsoToFr,
  meta: { label: 'Date de naissance conjoint' },
},

'spouse.regime': {
  selector: '#regime-social-assure-conjoint',
  valueMap: {
    SECURITE_SOCIALE: 'SECURITE_SOCIALE',
    REGIME_GENERAL: 'SECURITE_SOCIALE',
    RG: 'SECURITE_SOCIALE',
    ALSACE_MOSELLE: 'SECURITE_SOCIALE_ALSACE_MOSELLE',
    SECURITE_SOCIALE_ALSACE_MOSELLE: 'SECURITE_SOCIALE_ALSACE_MOSELLE',
    TNS: 'TNS',
    INDEPENDANT: 'TNS',
    INDEPENDANTS: 'TNS',
    MSA: 'AMEXA',
    AMEXA: 'AMEXA',
    AUTRES: 'AUTRES_REGIME_SPECIAUX',
    AUTRES_REGIME_SPECIAUX: 'AUTRES_REGIME_SPECIAUX',
    '*': 'SECURITE_SOCIALE',
  },
  meta: { label: 'Régime social conjoint' },
},

'spouse.status': {
  selector: '#statut-assure-conjoint',
  meta: { label: 'Statut conjoint' },
},

'spouse.profession': {
  selector: '#profession-assure-conjoint',
  valueMap: {
    MEDECIN: 'MEDECIN',
    'Médecin': 'MEDECIN',
    CHIRURGIEN: 'CHIRURGIEN',
    'Chirurgien': 'CHIRURGIEN',
    CHIRURGIEN_DENTISTE: 'CHIRURGIEN_DENTISTE',
    'Chirurgien dentiste': 'CHIRURGIEN_DENTISTE',
    PHARMACIEN: 'PHARMACIEN',
    'Pharmacien': 'PHARMACIEN',
    AUXILIAIRE_MEDICAL: 'AUXILIAIRE_MEDICAL',
    'Auxiliaire médical': 'AUXILIAIRE_MEDICAL',
    AUTRE: 'AUTRE',
    'Autre': 'AUTRE',
    'Artisan': 'AUTRE',
    ARTISAN: 'AUTRE',
    'Independant': 'AUTRE',
    'Indépendant': 'AUTRE',
    INDEPENDANT: 'AUTRE',
    EMPLOYE: 'AUTRE',
    'Employé': 'AUTRE',
    'Cadre': 'AUTRE',
    'Salarié': 'AUTRE',
    SALARIE: 'AUTRE',
    '*': 'AUTRE',
  },
  meta: { label: 'Profession conjoint' },
},
};
