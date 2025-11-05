/**
 * Smart Default Values
 * =====================
 *
 * Intelligent default value suggestions based on field relationships.
 * Used to auto-fill related fields and improve UX.
 */

/**
 * Map status to suggested regime (SwissLife)
 *
 * Logic:
 * - TNS → TNS regime
 * - Agricultural statuses → AMEXA
 * - Others → SECURITE_SOCIALE
 */
export function getRegimeFromStatus(status: string): string | undefined {
  const statusToRegimeMap: Record<string, string> = {
    TNS: 'TNS',
    EXPLOITANT_AGRICOLE: 'AMEXA',
    SALARIE_AGRICOLE: 'AMEXA',
    RETRAITE_ANCIEN_EXPLOITANT: 'AMEXA',
    SALARIE: 'SECURITE_SOCIALE',
    ETUDIANT: 'SECURITE_SOCIALE',
    RETRAITE: 'SECURITE_SOCIALE',
    RETRAITE_ANCIEN_SALARIE: 'SECURITE_SOCIALE',
    TRAVAILLEUR_TRANSFRONTALIER: 'SECURITE_SOCIALE',
    FONCTIONNAIRE: 'SECURITE_SOCIALE',
  };

  return statusToRegimeMap[status];
}

/**
 * Map regime to suggested status (SwissLife)
 *
 * Logic:
 * - TNS regime → TNS status
 * - AMEXA → EXPLOITANT_AGRICOLE (most common)
 * - SECURITE_SOCIALE → SALARIE (most common)
 */
export function getStatusFromRegime(regime: string): string | undefined {
  const regimeToStatusMap: Record<string, string> = {
    TNS: 'TNS',
    AMEXA: 'EXPLOITANT_AGRICOLE',
    SECURITE_SOCIALE: 'SALARIE',
    SECURITE_SOCIALE_ALSACE_MOSELLE: 'SALARIE',
    AUTRES_REGIME_SPECIAUX: 'SALARIE',
  };

  return regimeToStatusMap[regime];
}

/**
 * Get suggested profession based on status (SwissLife)
 *
 * Logic:
 * - Agricultural statuses → No profession field (not applicable)
 * - Others → AUTRE (default safe value)
 */
export function getProfessionFromStatus(status: string): string | undefined {
  const agricultureStatuses = [
    'SALARIE_AGRICOLE',
    'EXPLOITANT_AGRICOLE',
    'RETRAITE_ANCIEN_EXPLOITANT',
  ];

  // Agricultural statuses don't have profession field
  if (agricultureStatuses.includes(status)) {
    return undefined;
  }

  // Default to AUTRE for all others
  return 'AUTRE';
}

/**
 * Check if profession field should be shown based on status
 */
export function shouldShowProfession(status: string | undefined): boolean {
  if (!status) return true; // Show by default if no status

  const hiddenForStatuses = [
    'SALARIE_AGRICOLE',
    'EXPLOITANT_AGRICOLE',
    'RETRAITE_ANCIEN_EXPLOITANT',
  ];

  return !hiddenForStatuses.includes(status);
}

/**
 * Get suggested category based on regime (Alptis)
 *
 * Logic:
 * - AMEXA → AGRICULTEURS_EXPLOITANTS
 * - SECURITE_SOCIALE_INDEPENDANTS → PROFESSIONS_LIBERALES_ET_ASSIMILES
 * - Others → PERSONNES_SANS_ACTIVITE_PROFESSIONNELLE
 */
export function getCategoryFromRegime(regime: string): string | undefined {
  const regimeToCategoryMap: Record<string, string> = {
    AMEXA: 'AGRICULTEURS_EXPLOITANTS',
    REGIME_SALARIES_AGRICOLES: 'AGRICULTEURS_EXPLOITANTS',
    SECURITE_SOCIALE_INDEPENDANTS: 'PROFESSIONS_LIBERALES_ET_ASSIMILES',
    ALSACE_MOSELLE: 'PERSONNES_SANS_ACTIVITE_PROFESSIONNELLE',
    SECURITE_SOCIALE: 'PERSONNES_SANS_ACTIVITE_PROFESSIONNELLE',
  };

  return regimeToCategoryMap[regime];
}

/**
 * Get suggested work framework based on category (Alptis)
 *
 * Logic:
 * - Independent categories → INDEPENDANT
 * - Others → SALARIE
 */
export function getWorkFrameworkFromCategory(category: string): string | undefined {
  const independentCategories = [
    'CHEFS_D_ENTREPRISE',
    'PROFESSIONS_LIBERALES_ET_ASSIMILES',
    'ARTISANS',
    'COMMERCANTS_ET_ASSIMILES',
    'AGRICULTEURS_EXPLOITANTS',
  ];

  return independentCategories.includes(category) ? 'INDEPENDANT' : 'SALARIE';
}
