/**
 * List Leads Command
 * ===================
 *
 * Display all leads with their full information in a formatted way.
 */

import { openDb } from '../../core/db';
import { listLeads, countLeads } from '../../core/db/lead-queries';
import type { Lead } from '../../core/domain';

interface ListLeadsOptions {
  format?: 'table' | 'json' | 'detailed';
  limit?: number;
  offset?: number;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function displayAsTable(leads: Lead[], total: number): void {
  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                        📋 LEADS LIST                            │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');

  if (leads.length === 0) {
    console.log('  No leads found in database.\n');
    return;
  }

  console.log(`  Total leads: ${total}`);
  console.log(`  Showing: ${leads.length} leads\n`);

  leads.forEach((lead, index) => {
    const { data, metadata } = lead;

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  Lead #${index + 1}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  ID: ${lead.id}`);
    console.log(`  Created: ${formatDate(lead.createdAt)}`);
    console.log(`  Updated: ${formatDate(lead.updatedAt)}`);

    // Project info
    console.log('\n  📌 Project:');
    console.log(`     Type: ${data.project?.type || 'N/A'}`);
    console.log(`     Start Date: ${data.project?.startDate || 'N/A'}`);
    if (data.project?.postalCode) {
      console.log(`     Postal Code: ${data.project.postalCode}`);
    }

    // Subscriber info
    console.log('\n  👤 Subscriber:');
    console.log(`     Name: ${data.subscriber?.civility || ''} ${data.subscriber?.firstName || ''} ${data.subscriber?.lastName || ''}`);
    console.log(`     Birth Date: ${data.subscriber?.birthDate || 'N/A'}`);
    if (data.subscriber?.email) {
      console.log(`     Email: ${data.subscriber.email}`);
    }
    if (data.subscriber?.phone) {
      console.log(`     Phone: ${data.subscriber.phone}`);
    }

    // Spouse info
    if (data.spouse?.exists) {
      console.log('\n  💑 Spouse:');
      console.log(`     Name: ${data.spouse?.civility || ''} ${data.spouse?.firstName || ''} ${data.spouse?.lastName || ''}`);
      console.log(`     Birth Date: ${data.spouse?.birthDate || 'N/A'}`);
      console.log(`     Regime: ${data.spouse?.regime || 'N/A'}`);
    }

    // Children info
    if (data.children && data.children.length > 0) {
      console.log('\n  👶 Children:');
      data.children.forEach((child, idx) => {
        console.log(`     Child ${idx + 1}: ${child.firstName || 'N/A'} ${child.lastName || ''} (${child.birthDate || 'N/A'})`);
        if (child.schoolCertificate !== undefined) {
          console.log(`              School Certificate: ${child.schoolCertificate ? 'Yes' : 'No'}`);
        }
      });
    }

    // Metadata
    if (metadata) {
      console.log('\n  ℹ️  Metadata:');
      if (metadata.source) {
        console.log(`     Source: ${metadata.source}`);
      }
      if (metadata.provider) {
        console.log(`     Provider: ${metadata.provider}`);
      }
      if (metadata.tags && metadata.tags.length > 0) {
        console.log(`     Tags: ${metadata.tags.join(', ')}`);
      }
    }

    // Fingerprints
    console.log('\n  🔍 Fingerprints:');
    console.log(`     Primary: ${lead.fingerprintPrimary}`);
    if (lead.fingerprintEmail) {
      console.log(`     Email: ${lead.fingerprintEmail}`);
    }
    if (lead.fingerprintPhone) {
      console.log(`     Phone: ${lead.fingerprintPhone}`);
    }

    console.log('');
  });
}

function displayAsJson(leads: Lead[]): void {
  console.log(JSON.stringify(leads, null, 2));
}

function displayDetailed(leads: Lead[], total: number): void {
  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                   📋 LEADS DETAILED VIEW                        │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');

  console.log(`Total leads: ${total}\n`);

  leads.forEach((lead, index) => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`LEAD #${index + 1}: ${lead.id}`);
    console.log('='.repeat(70));
    console.log('\nFull JSON Data:');
    console.log(JSON.stringify(lead, null, 2));
  });
}

export async function listLeadsCommand(options: ListLeadsOptions = {}): Promise<void> {
  const db = openDb();
  const format = options.format || 'table';
  const limit = options.limit || 1000;
  const offset = options.offset || 0;

  try {
    const total = countLeads(db);
    const leads = listLeads(db, { limit, offset });

    switch (format) {
      case 'json':
        displayAsJson(leads);
        break;
      case 'detailed':
        displayDetailed(leads, total);
        break;
      case 'table':
      default:
        displayAsTable(leads, total);
        break;
    }
  } catch (error: any) {
    console.error('[ERROR] Failed to list leads:', error.message);
    throw error;
  } finally {
    db.close();
  }
}
