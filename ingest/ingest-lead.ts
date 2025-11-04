/**
 * Lead Ingestion
 * Main pipeline: normalize → enrich → validate → fingerprint → upsert
 */

import { randomUUID } from 'crypto';
import type { Database } from 'better-sqlite3';
import type { LeadData, Lead } from '../core/domain';
import { validateLeadData, computeFingerprints } from '../core/domain';
import { createLead, findLeadByFingerprint } from '../core/db';
import { normalizeToISO } from './normalize';
import { enrichLead } from './enrich';

export interface IngestResult {
  success: boolean;
  lead?: Lead;
  duplicate?: boolean;
  duplicateId?: string;
  errors?: string[];
}

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
