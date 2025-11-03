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

/**
 * Convert French date (DD/MM/YYYY) to ISO (YYYY-MM-DD)
 */
export function dateFrToIso(frDate: string): string {
  const [day, month, year] = frDate.split('/');
  return `${year}-${month}-${day}`;
}

/**
 * Convert ISO date to US format (MM/DD/YYYY)
 */
export function dateIsoToUs(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${month}/${day}/${year}`;
}

/**
 * Convert US date (MM/DD/YYYY) to ISO (YYYY-MM-DD)
 */
export function dateUsToIso(usDate: string): string {
  const [month, day, year] = usDate.split('/');
  return `${year}-${month}-${day}`;
}

/**
 * Validate ISO date format (YYYY-MM-DD)
 */
export function isValidIsoDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

/**
 * Get first day of next month (ISO format)
 */
export function firstOfNextMonth(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Get today's date (ISO format)
 */
export function today(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Add days to ISO date
 */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Calculate age from birthdate (ISO)
 */
export function calculateAge(birthDateIso: string): number {
  const birth = new Date(birthDateIso);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}
