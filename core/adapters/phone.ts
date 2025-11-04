/**
 * Phone Adapters
 * ===============
 *
 * Convert phone numbers between E.164 (+33...) and platform-specific formats.
 *
 * Canonical storage: E.164 format (+33612345678)
 * Platform adapters convert at the edge.
 */

/**
 * Normalize French phone to E.164 (+33...)
 */
export function phoneToE164(phone: string, defaultCountryCode = '+33'): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');

  // Handle different French formats
  if (digits.startsWith('0')) {
    // 06 12 34 56 78 -> 612345678
    digits = digits.substring(1);
  }

  // Add country code if not present
  if (!digits.startsWith('33')) {
    digits = defaultCountryCode.replace('+', '') + digits;
  }

  return `+${digits}`;
}

/**
 * Convert E.164 to French national format (06 12 34 56 78)
 */
export function phoneE164ToFrNational(e164: string): string {
  // Remove +33 prefix
  const digits = e164.replace(/^\+33/, '0');

  // Format as 0X XX XX XX XX
  return digits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
}

/**
 * Convert E.164 to international format with spaces (+33 6 12 34 56 78)
 */
export function phoneE164ToInternational(e164: string): string {
  // +33612345678 -> +33 6 12 34 56 78
  return e164.replace(/^\+(\d{2})(\d)(\d{2})(\d{2})(\d{2})(\d{2})/, '+$1 $2 $3 $4 $5 $6');
}

/**
 * Validate E.164 format
 */
export function isValidE164(phone: string): boolean {
  return /^\+\d{10,15}$/.test(phone);
}

/**
 * Detect if phone looks like French mobile
 */
export function isFrenchMobile(e164: string): boolean {
  // +336... or +337...
  return /^\+33[67]/.test(e164);
}

/**
 * Sanitize phone input (remove spaces, dashes, parentheses)
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\.]/g, '');
}
