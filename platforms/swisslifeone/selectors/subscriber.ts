/**
 * SwissLifeOne - Subscriber Selectors
 */

import { dateIsoToFr } from '../../../core/adapters';
import type { SelectorMap } from '../../types';

export const subscriberSelectors: SelectorMap = {
'subscriber.birthDate': {
  selector: '#date-naissance-assure-principal',
  adapter: dateIsoToFr,
  meta: { label: 'Date de naissance souscripteur' },
},

'subscriber.regime': {
  selector: '#regime-social-assure-principal',
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
  meta: { label: 'Régime social' },
},

'subscriber.status': {
  selector: '#statut-assure-principal',
  meta: { label: 'Statut' },
},

'subscriber.profession': {
  selector: '#profession-assure-principal',
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
  meta: { label: 'Profession' },
},

'subscriber.departmentCode': {
  selector: '#departement-assure-principal',
  meta: { label: 'Département' },
},
};
