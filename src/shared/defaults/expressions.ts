/**
 * Dynamic expressions for default values
 *
 * These expressions are evaluated at runtime to generate dynamic defaults
 * like dates, calculated values, etc.
 */

/**
 * Get the first day of the next month in DD/MM/YYYY format
 *
 * @example
 * // If today is 2024-01-15
 * firstOfNextMonth() // Returns "01/02/2024"
 *
 * @returns Date string in DD/MM/YYYY format
 */
export function firstOfNextMonth(): string {
  const now = new Date();
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const month = now.getMonth() === 11 ? 0 : now.getMonth() + 1;

  const firstDay = new Date(year, month, 1);

  const day = String(firstDay.getDate()).padStart(2, '0');
  const monthStr = String(firstDay.getMonth() + 1).padStart(2, '0');
  const yearStr = String(firstDay.getFullYear());

  return `${day}/${monthStr}/${yearStr}`;
}

/**
 * Get today's date in DD/MM/YYYY format
 *
 * @returns Date string in DD/MM/YYYY format
 */
export function today(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());

  return `${day}/${month}/${year}`;
}

/**
 * Parse a date string in DD/MM/YYYY format to a Date object
 *
 * @param dateStr - Date string in DD/MM/YYYY format
 * @returns Date object or null if invalid
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  const date = new Date(year, month, day);

  // Validate the date is valid
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return null;
  }

  return date;
}

/**
 * Calculate age from a birth date string
 *
 * @param birthDateStr - Birth date in DD/MM/YYYY format
 * @param referenceDate - Reference date to calculate age from (defaults to today)
 * @returns Age in years, or null if invalid date
 */
export function calculateAge(birthDateStr: string, referenceDate?: Date): number | null {
  const birthDate = parseDate(birthDateStr);
  if (!birthDate) return null;

  const reference = referenceDate || new Date();

  let age = reference.getFullYear() - birthDate.getFullYear();
  const monthDiff = reference.getMonth() - birthDate.getMonth();
  const dayDiff = reference.getDate() - birthDate.getDate();

  // Adjust age if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  return age;
}

/**
 * Evaluate a default expression string
 *
 * Supports expressions like:
 * - "firstOfNextMonth" → Evaluates to first day of next month
 * - "today" → Evaluates to today's date
 * - Any other string → Returns as-is
 *
 * @param expression - Expression string to evaluate
 * @returns Evaluated value
 */
export function evaluateExpression(expression: string): any {
  if (!expression || typeof expression !== 'string') {
    return expression;
  }

  const expr = expression.trim();

  switch (expr) {
    case 'firstOfNextMonth':
      return firstOfNextMonth();
    case 'today':
      return today();
    default:
      return expression;
  }
}
