/**
 * Normalization Stage
 * Converts raw lead data to canonical ISO format
 */

import type { LeadData } from '../core/domain';
import { dateFrToIso, phoneToE164 } from '../core/adapters';

/**
 * Normalize a raw lead to canonical ISO format
 */
export function normalizeToISO(raw: any): Partial<LeadData> {
  const normalized: any = {
    subscriber: {},
    project: {},
  };

  // Subscriber
  if (raw.subscriber) {
    normalized.subscriber = {
      ...raw.subscriber,
      birthDate: raw.subscriber.birthDate
        ? normalizeDateToISO(raw.subscriber.birthDate)
        : undefined,
      phoneE164: raw.subscriber.telephone || raw.subscriber.phone
        ? phoneToE164(raw.subscriber.telephone || raw.subscriber.phone)
        : undefined,
    };

    delete normalized.subscriber.telephone;
    delete normalized.subscriber.phone;
  }

  // Spouse
  if (raw.spouse) {
    normalized.spouse = {
      ...raw.spouse,
      birthDate: raw.spouse.birthDate
        ? normalizeDateToISO(raw.spouse.birthDate)
        : undefined,
    };
  }

  // Children
  if (raw.children && Array.isArray(raw.children)) {
    normalized.children = raw.children.map((child: any) => ({
      ...child,
      birthDate: child.birthDate
        ? normalizeDateToISO(child.birthDate)
        : undefined,
    }));
  }

  // Project
  if (raw.project) {
    normalized.project = {
      ...raw.project,
      dateEffet: raw.project.dateEffet
        ? normalizeDateToISO(raw.project.dateEffet)
        : undefined,
      couverture: normalizeBoolean(raw.project.couverture),
      ij: normalizeBoolean(raw.project.ij),
      madelin: normalizeBoolean(raw.project.madelin),
      resiliation: normalizeBoolean(raw.project.resiliation),
      reprise: normalizeBoolean(raw.project.reprise),
      currentlyInsured: normalizeBoolean(raw.project.currentlyInsured),
    };
  }

  return normalized as Partial<LeadData>;
}

/**
 * Normalize a date to ISO format (YYYY-MM-DD)
 */
function normalizeDateToISO(date: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    return dateFrToIso(date);
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
    const [day, month, year] = date.split('-');
    return `${year}-${month}-${day}`;
  }

  return date;
}

/**
 * Normalize a boolean value
 */
function normalizeBoolean(value: any): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 'oui' || value === 'Oui' || value === 'true' || value === '1') return true;
  if (value === 'non' || value === 'Non' || value === 'false' || value === '0') return false;
  return undefined;
}
