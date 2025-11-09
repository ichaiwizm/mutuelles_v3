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
  // Validate input
  if (!isoDate || typeof isoDate !== 'string') {
    console.error(`[dateIsoToFr] Invalid input: ${isoDate}`);
    return '';
  }

  // If already in French format (DD/MM/YYYY), return as is
  if (isoDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return isoDate;
  }

  // Convert ISO format (YYYY-MM-DD) to French format
  const [year, month, day] = isoDate.split('-');

  if (!year || !month || !day) {
    console.error(`[dateIsoToFr] Malformed ISO date: ${isoDate}`);
    return '';
  }

  return `${day}/${month}/${year}`;
}
