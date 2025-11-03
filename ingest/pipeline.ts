/**
 * Ingestion Pipeline
 * ===================
 *
 * Pure functional pipeline for ingesting leads from various sources.
 *
 * Flow: parse -> normalize -> enrich -> validate -> fingerprint -> upsert
 */

import { randomUUID } from 'crypto';
import type { LeadData, Lead } from '../core/domain';
import { validateLeadData, computeFingerprints } from '../core/domain';
import { dateFrToIso, phoneToE164 } from '../core/adapters';
import { createLead, findLeadByFingerprint } from '../core/db';
import type { Database } from 'better-sqlite3';

/**
 * Pipeline result
 */
export interface IngestResult {
  success: boolean;
  lead?: Lead;
  duplicate?: boolean;
  duplicateId?: string;
  errors?: string[];
}

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
      // Normalize birth date to ISO
      birthDate: raw.subscriber.birthDate
        ? normalizeDateToISO(raw.subscriber.birthDate)
        : undefined,
      // Normalize phone to E.164
      phoneE164: raw.subscriber.telephone || raw.subscriber.phone
        ? phoneToE164(raw.subscriber.telephone || raw.subscriber.phone)
        : undefined,
    };

    // Remove old phone field
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
      // Normalize booleans
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
 * Supports: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
 */
function normalizeDateToISO(date: string): string {
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  // French format DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    return dateFrToIso(date);
  }

  // US format MM/DD/YYYY (less common, but handle it)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    const [month, day, year] = date.split('/');
    return `${year}-${month}-${day}`;
  }

  // Fallback: return as-is (will fail validation)
  return date;
}

/**
 * Normalize boolean values
 */
function normalizeBoolean(value: any): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return undefined;
}

/**
 * Enrich lead with defaults and computed values
 */
export function enrichLead(partial: Partial<LeadData>): Partial<LeadData> {
  const enriched = { ...partial };

  // Set default project name if missing
  if (enriched.project && !enriched.project.name && enriched.subscriber) {
    enriched.project.name = `Simulation ${enriched.subscriber.lastName || ''} ${enriched.subscriber.firstName || ''}`.trim();
  }

  // Set default dateEffet if missing (first of next month)
  if (enriched.project && !enriched.project.dateEffet) {
    const { firstOfNextMonth } = require('../core/adapters/date');
    enriched.project.dateEffet = firstOfNextMonth();
  }

  // Compute childrenCount if children array exists
  if (enriched.children && enriched.subscriber) {
    enriched.subscriber.childrenCount = enriched.children.length;
  }

  return enriched;
}

/**
 * Main ingestion pipeline
 */
export function ingestLead(
  db: Database,
  rawLead: any,
  options: { skipDuplicates?: boolean } = {}
): IngestResult {
  const errors: string[] = [];

  try {
    // Step 1: Normalize to ISO
    const normalized = normalizeToISO(rawLead);

    // Step 2: Enrich with defaults
    const enriched = enrichLead(normalized);

    // Step 3: Validate against schema
    let validatedData: LeadData;
    try {
      validatedData = validateLeadData(enriched);
    } catch (error: any) {
      errors.push(`Validation failed: ${error.message}`);
      return { success: false, errors };
    }

    // Step 4: Compute fingerprints
    const fingerprints = computeFingerprints(validatedData);

    // Step 5: Check for duplicates
    const existing = findLeadByFingerprint(db, fingerprints.primary);
    if (existing) {
      if (options.skipDuplicates) {
        return {
          success: false,
          duplicate: true,
          duplicateId: existing.id,
          errors: ['Duplicate lead found'],
        };
      }
      // Update existing lead
      return {
        success: true,
        lead: existing,
        duplicate: true,
        duplicateId: existing.id,
      };
    }

    // Step 6: Create new lead
    const now = new Date().toISOString();
    const lead: Lead = {
      id: randomUUID(),
      data: validatedData,
      fingerprintPrimary: fingerprints.primary,
      fingerprintEmail: fingerprints.email,
      fingerprintPhone: fingerprints.phone,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    createLead(db, lead);

    return {
      success: true,
      lead,
    };
  } catch (error: any) {
    errors.push(`Ingestion failed: ${error.message}`);
    return { success: false, errors };
  }
}

/**
 * Batch ingest multiple leads
 */
export function ingestLeadsBatch(
  db: Database,
  rawLeads: any[],
  options: { skipDuplicates?: boolean } = {}
): {
  total: number;
  success: number;
  failed: number;
  duplicates: number;
  errors: Array<{ index: number; errors: string[] }>;
} {
  const results = {
    total: rawLeads.length,
    success: 0,
    failed: 0,
    duplicates: 0,
    errors: [] as Array<{ index: number; errors: string[] }>,
  };

  for (let i = 0; i < rawLeads.length; i++) {
    const result = ingestLead(db, rawLeads[i], options);

    if (result.success) {
      results.success++;
      if (result.duplicate) {
        results.duplicates++;
      }
    } else {
      results.failed++;
      if (result.errors) {
        results.errors.push({ index: i, errors: result.errors });
      }
    }
  }

  return results;
}
