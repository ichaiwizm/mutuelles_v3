/**
 * Postal Code Adapters
 * =====================
 *
 * Extract and transform postal code information
 */

/**
 * Extract department code from French postal code
 *
 * Rules:
 * - Standard: First 2 digits (75001 → 75, 13008 → 13)
 * - Corsica: 20XXX → 2A (south) or 2B (north)
 * - DOM-TOM: 971XX-976XX → keep first 3 digits
 *
 * @param postalCode - 5-digit French postal code
 * @returns Department code (string or number)
 */
export function extractDepartmentCode(postalCode: string | number): string {
  const code = String(postalCode).padStart(5, '0');

  // Validate format
  if (!/^\d{5}$/.test(code)) {
    throw new Error(`Invalid postal code format: ${postalCode}`);
  }

  const firstTwo = code.substring(0, 2);
  const firstThree = code.substring(0, 3);

  // DOM-TOM (971-976)
  if (['971', '972', '973', '974', '975', '976'].includes(firstThree)) {
    return firstThree;
  }

  // Corsica (20XXX)
  if (firstTwo === '20') {
    // 20000-20199: Corse-du-Sud (2A)
    // 20200-20999: Haute-Corse (2B)
    const num = parseInt(code, 10);
    return num < 20200 ? '2A' : '2B';
  }

  // Standard departments (01-95)
  return firstTwo;
}

/**
 * Validate French postal code
 */
export function isValidPostalCode(postalCode: string | number): boolean {
  const code = String(postalCode);
  return /^\d{5}$/.test(code);
}

/**
 * Format postal code (ensure 5 digits with leading zeros)
 */
export function formatPostalCode(postalCode: string | number): string {
  return String(postalCode).padStart(5, '0');
}
