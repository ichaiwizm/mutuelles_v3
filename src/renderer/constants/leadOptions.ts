/**
 * Options partagées pour les formulaires de leads
 * Évite la duplication à travers l'application
 */

export const CIVILITE_OPTIONS = [
  { value: 'M.', label: 'M.' },
  { value: 'Mme', label: 'Mme' },
  { value: 'Mlle', label: 'Mlle' }
] as const

export const REGIME_OPTIONS = [
  { value: 'Salarié', label: 'Salarié' },
  { value: 'TNS', label: 'TNS' },
  { value: 'Fonctionnaire', label: 'Fonctionnaire' },
  { value: 'Retraité', label: 'Retraité' },
  { value: 'Libéral', label: 'Libéral' },
  { value: 'Indépendant', label: 'Indépendant' }
] as const

export const NIVEAU_OPTIONS = [
  { value: 1, label: 'Niveau 1' },
  { value: 2, label: 'Niveau 2' },
  { value: 3, label: 'Niveau 3' },
  { value: 4, label: 'Niveau 4' }
] as const

export const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'Oui' },
  { value: 'false', label: 'Non' }
] as const
