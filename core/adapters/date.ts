/**
 * Date Adapters
 * ==============
 *
 * Convert dates between ISO (YYYY-MM-DD) and platform-specific formats.
 *
 * Canonical storage: ISO 8601 (YYYY-MM-DD)
 * Platform adapters convert at the edge (selector level).
 */

/**
 * Convert ISO date (YYYY-MM-DD) to French format (DD/MM/YYYY)
 */
export function dateIsoToFr(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}
