#!/usr/bin/env ts-node
/**
 * Migrate Legacy Data
 * ====================
 *
 * Migrate existing leads from old format to new canonical ISO format.
 *
 * Usage:
 *   npm run migrate:data
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import { normalizeToISO, enrichLead } from '../ingest/pipeline';
import { validateLeadData, computeFingerprints } from '../core/domain';

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ id: string; error: string }>;
}

async function migrateDatabase(dbPath: string): Promise<MigrationStats> {
  const db = new Database(dbPath);
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  };

  console.log('🔄 Starting migration of legacy leads...\n');

  // Get all leads from old table (assuming 'clean_leads')
  const oldLeads = db.prepare('SELECT * FROM clean_leads').all() as any[];
  stats.total = oldLeads.length;

  console.log(`Found ${stats.total} leads to migrate\n`);

  // Create new tables if not exist
  const schemaSql = require('fs').readFileSync(
    path.join(__dirname, '../core/db/schema.sql'),
    'utf8'
  );
  db.exec(schemaSql);

  // Migrate each lead
  for (const oldLead of oldLeads) {
    try {
      // Parse old data
      const oldData = JSON.parse(oldLead.data);

      // Check if already migrated (check new leads table)
      const existing = db
        .prepare('SELECT id FROM leads WHERE id = ?')
        .get(oldLead.id);

      if (existing) {
        stats.skipped++;
        continue;
      }

      // Normalize to ISO
      const normalized = normalizeToISO(oldData);
      const enriched = enrichLead(normalized);

      // Validate
      const validated = validateLeadData(enriched);

      // Compute fingerprints
      const fingerprints = computeFingerprints(validated);

      // Check for duplicate by fingerprint
      const duplicate = db
        .prepare('SELECT id FROM leads WHERE fingerprint_primary = ?')
        .get(fingerprints.primary);

      if (duplicate) {
        console.log(`  ⚠️  Duplicate found for lead ${oldLead.id}, skipping`);
        stats.skipped++;
        continue;
      }

      // Insert into new table
      db.prepare(`
        INSERT INTO leads (id, data, fingerprint_primary, fingerprint_email, fingerprint_phone, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        oldLead.id,
        JSON.stringify(validated),
        fingerprints.primary,
        fingerprints.email || null,
        fingerprints.phone || null,
        oldLead.metadata || null,
        oldLead.created_at || new Date().toISOString(),
        new Date().toISOString()
      );

      stats.migrated++;

      if (stats.migrated % 100 === 0) {
        console.log(`  ✓ Migrated ${stats.migrated}/${stats.total} leads...`);
      }
    } catch (error: any) {
      stats.errors++;
      stats.errorDetails.push({
        id: oldLead.id,
        error: error.message,
      });
      console.error(`  ✗ Error migrating lead ${oldLead.id}:`, error.message);
    }
  }

  db.close();

  return stats;
}

// Main execution
(async () => {
  const dbPath = path.join(process.cwd(), 'database.sqlite');

  console.log('🗄️  Database:', dbPath);
  console.log('');

  try {
    const stats = await migrateDatabase(dbPath);

    console.log('\n✅ Migration completed!\n');
    console.log('Statistics:');
    console.log(`  Total:    ${stats.total}`);
    console.log(`  Migrated: ${stats.migrated}`);
    console.log(`  Skipped:  ${stats.skipped}`);
    console.log(`  Errors:   ${stats.errors}`);

    if (stats.errorDetails.length > 0) {
      console.log('\nErrors:');
      stats.errorDetails.forEach((err) => {
        console.log(`  - ${err.id}: ${err.error}`);
      });
    }

    process.exit(stats.errors > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
})();
