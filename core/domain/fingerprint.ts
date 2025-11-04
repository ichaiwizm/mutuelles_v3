/**
 * Lead Fingerprinting for Deduplication
 * ======================================
 *
 * Generates unique fingerprints for leads to detect duplicates.
 *
 * Strategy:
 * - Primary: sha256(lowercase(lastName) + lowercase(firstName) + birthDate)
 * - Email: sha256(lowercase(email))
 * - Phone: sha256(E.164 phone)
 *
 * Database will have UNIQUE constraint on fingerprintPrimary.
 */

import crypto from 'crypto';
import type { LeadData } from './lead.schema';

/**
 * Normalize string for fingerprinting (lowercase, trim, remove accents)
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove accents
}

/**
 * Generate SHA-256 hash
 */
function sha256(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Compute primary fingerprint (lastName + firstName + birthDate)
 */
export function computePrimaryFingerprint(lead: LeadData): string {
  const lastName = normalize(lead.subscriber.lastName);
  const firstName = normalize(lead.subscriber.firstName);
  const birthDate = lead.subscriber.birthDate; // Already ISO YYYY-MM-DD

  const raw = `${lastName}:${firstName}:${birthDate}`;
  return sha256(raw);
}

/**
 * Compute email fingerprint
 */
export function computeEmailFingerprint(email?: string): string | undefined {
  if (!email) return undefined;

  const normalized = normalize(email);
  return sha256(normalized);
}

/**
 * Compute phone fingerprint (E.164 format)
 */
export function computePhoneFingerprint(phoneE164?: string): string | undefined {
  if (!phoneE164) return undefined;

  // Phone is already in E.164 format (+33...)
  return sha256(phoneE164);
}

/**
 * Compute all fingerprints for a lead
 */
export interface LeadFingerprints {
  primary: string;
  email?: string;
  phone?: string;
}

export function computeFingerprints(lead: LeadData): LeadFingerprints {
  return {
    primary: computePrimaryFingerprint(lead),
    email: computeEmailFingerprint(lead.subscriber.email),
    phone: computePhoneFingerprint(lead.subscriber.phoneE164),
  };
}

/**
 * Check if two leads are likely duplicates
 */
export function areLikelyDuplicates(lead1: LeadData, lead2: LeadData): boolean {
  const fp1 = computeFingerprints(lead1);
  const fp2 = computeFingerprints(lead2);

  // Exact match on primary fingerprint
  if (fp1.primary === fp2.primary) return true;

  // Soft match: same email OR same phone (if both present)
  if (fp1.email && fp2.email && fp1.email === fp2.email) return true;
  if (fp1.phone && fp2.phone && fp1.phone === fp2.phone) return true;

  return false;
}
