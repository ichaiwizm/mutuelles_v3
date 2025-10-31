/**
 * TYPES POUR LES MAPPERS (Traducteurs)
 *
 * Les Mappers sont des fonctions pures qui convertissent
 * un LeadGenerique en données spécifiques à une plateforme/produit.
 */

import { LeadGenerique } from './models';

// ============================================================================
// MAPPER INTERFACE
// ============================================================================

export interface Mapper<T = Record<string, any>> {
  /**
   * Convertit un LeadGenerique en données spécifiques
   * @param lead - Le lead générique à convertir
   * @returns Données formatées pour la plateforme/produit
   */
  map(lead: LeadGenerique): T;

  /**
   * Valide que le lead contient les données minimales requises
   * @param lead - Le lead à valider
   * @returns Résultat de validation
   */
  validate(lead: LeadGenerique): MapperValidationResult;

  /**
   * Métadonnées du mapper
   */
  metadata: MapperMetadata;
}

export interface MapperMetadata {
  platformKey: string;          // Ex: "swisslife"
  productKey: string;           // Ex: "sante-pro"
  version: string;              // Version du mapper (pour migration)
}

export interface MapperValidationResult {
  valid: boolean;
  errors?: string[];            // Erreurs de validation
  warnings?: string[];          // Avertissements (données manquantes non-bloquantes)
}

// ============================================================================
// TYPES SPECIFIQUES PAR PLATEFORME
// ============================================================================

// SwissLife One - Santé Pro
export interface SwissLifeSanteProData {
  projet: {
    nom: string;
    couverture_individuelle: boolean;
    indemnites_journalieres: boolean;
    resiliation_contrat: boolean;
    reprise_concurrence: boolean;
    loi_madelin: boolean;
    date_effet: string;
  };
  souscripteur: {
    civilite: 'MONSIEUR' | 'MADAME';
    nom: string;
    prenom: string;
    date_naissance: string;
    departement: string | number;
    regime_social: string;
    statut: string;
    profession?: string;
  };
  conjoint?: {
    civilite: 'MONSIEUR' | 'MADAME';
    date_naissance: string;
    regime_social: string;
    statut: string;
    profession?: string;
  };
  enfants?: Array<{
    date_naissance: string;
    ayant_droit: 'CLIENT' | 'CONJOINT';
  }>;
}

// Alptis - Santé Pro
export interface AlptisSanteProData {
  date_effet: string;
  souscripteur: {
    civilite: 'MONSIEUR' | 'MADAME';
    nom: string;
    prenom: string;
    date_naissance: string;
    code_postal: string;
    categorie_socioprofessionnelle: string;
    regime_obligatoire: string;
    cadre_exercice?: 'SALARIE' | 'INDEPENDANT';
  };
  conjoint?: {
    civilite: 'MONSIEUR' | 'MADAME';
    date_naissance: string;
    categorie_socioprofessionnelle: string;
    regime_obligatoire: string;
    cadre_exercice?: 'SALARIE' | 'INDEPENDANT';
  };
  enfants?: Array<{
    date_naissance: string;
    regime_obligatoire: string;
  }>;
}

// ============================================================================
// MAPPER FACTORY
// ============================================================================

export type MapperFactory = (platformKey: string, productKey: string) => Mapper | null;
