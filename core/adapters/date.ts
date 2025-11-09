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

/**
 * Validate and adjust dateEffet to meet Alptis constraints
 * - Date must be at least 5 days in the future
 * - If invalid, returns 1st day of next month
 */
export function dateEffetAlptis(isoDate: string): string {
  // First convert to FR format
  const dateFr = dateIsoToFr(isoDate);

  if (!dateFr) {
    // Fallback to 1st of next month
    return getFirstDayOfNextMonth();
  }

  // Parse the date
  const [day, month, year] = dateFr.split('/').map(Number);
  const inputDate = new Date(year, month - 1, day);

  // Calculate minimum date (today + 5 days)
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() + 5);

  // If input date is valid and at least 5 days in the future, use it
  if (inputDate >= minDate) {
    return dateFr;
  }

  // Otherwise, use 1st of next month
  console.warn(`[dateEffetAlptis] Date ${dateFr} is too soon or in the past. Using 1st of next month instead.`);
  return getFirstDayOfNextMonth();
}

/**
 * Get the first day of next month in French format (DD/MM/YYYY)
 */
function getFirstDayOfNextMonth(): string {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const day = String(nextMonth.getDate()).padStart(2, '0');
  const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
  const year = nextMonth.getFullYear();

  return `${day}/${month}/${year}`;
}
