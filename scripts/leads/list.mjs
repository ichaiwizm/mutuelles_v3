#!/usr/bin/env node
/**
 * List Leads Script
 * =================
 *
 * Display all leads with their full information in a formatted way.
 */

import { openDb } from '../../src/shared/db/connection.mjs';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    format: 'table',
    limit: 1000,
    offset: 0,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--format':
        opts.format = args[++i];
        break;
      case '--limit':
        opts.limit = parseInt(args[++i], 10);
        break;
      case '--offset':
        opts.offset = parseInt(args[++i], 10);
        break;
      case '--help':
      case '-h':
        opts.help = true;
        break;
    }
  }

  return opts;
}

function usage() {
  console.log(`
📋 List Leads Tool

Usage:
  npm run leads:list [options]

Options:
  --format <type>     Output format (table|json|detailed) [default: table]
  --limit <number>    Maximum number of leads to display [default: 1000]
  --offset <number>   Number of leads to skip [default: 0]
  --help, -h          Show this help

Examples:
  # List all leads in table format
  npm run leads:list

  # List leads in JSON format
  npm run leads:list -- --format json

  # List first 10 leads
  npm run leads:list -- --limit 10

  # List leads with detailed view
  npm run leads:list -- --format detailed
`);
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function listLeads(db, options) {
  const { limit, offset } = options;

  const countStmt = db.prepare('SELECT COUNT(*) as count FROM clean_leads');
  const total = countStmt.get().count;

  const stmt = db.prepare(`
    SELECT * FROM clean_leads ORDER BY created_at DESC LIMIT ? OFFSET ?
  `);

  const rows = stmt.all(limit, offset);

  return { leads: rows, total };
}

function displayAsTable(leads, total) {
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
    const data = JSON.parse(lead.data);
    const metadata = lead.metadata ? JSON.parse(lead.metadata) : null;

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  Lead #${index + 1}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  ID: ${lead.id}`);
    console.log(`  Created: ${formatDate(lead.created_at)}`);
    console.log(`  Updated: ${formatDate(lead.updated_at)}`);

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
    console.log(`     Primary: ${lead.fingerprint_primary}`);
    if (lead.fingerprint_email) {
      console.log(`     Email: ${lead.fingerprint_email}`);
    }
    if (lead.fingerprint_phone) {
      console.log(`     Phone: ${lead.fingerprint_phone}`);
    }

    console.log('');
  });
}

function displayAsJson(leads) {
  const formatted = leads.map(lead => ({
    id: lead.id,
    data: JSON.parse(lead.data),
    fingerprintPrimary: lead.fingerprint_primary,
    fingerprintEmail: lead.fingerprint_email,
    fingerprintPhone: lead.fingerprint_phone,
    metadata: lead.metadata ? JSON.parse(lead.metadata) : null,
    createdAt: lead.created_at,
    updatedAt: lead.updated_at,
  }));

  console.log(JSON.stringify(formatted, null, 2));
}

function displayDetailed(leads, total) {
  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                   📋 LEADS DETAILED VIEW                        │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');

  console.log(`Total leads: ${total}\n`);

  leads.forEach((lead, index) => {
    const fullLead = {
      id: lead.id,
      data: JSON.parse(lead.data),
      fingerprintPrimary: lead.fingerprint_primary,
      fingerprintEmail: lead.fingerprint_email,
      fingerprintPhone: lead.fingerprint_phone,
      metadata: lead.metadata ? JSON.parse(lead.metadata) : null,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at,
    };

    console.log(`\n${'='.repeat(70)}`);
    console.log(`LEAD #${index + 1}: ${lead.id}`);
    console.log('='.repeat(70));
    console.log('\nFull JSON Data:');
    console.log(JSON.stringify(fullLead, null, 2));
  });
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    usage();
    return;
  }

  if (!['table', 'json', 'detailed'].includes(options.format)) {
    console.error(`[ERROR] Invalid format: ${options.format}`);
    console.error('Valid formats: table, json, detailed');
    process.exit(1);
  }

  const db = openDb();

  try {
    const { leads, total } = listLeads(db, options);

    switch (options.format) {
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
  } catch (error) {
    console.error('[ERROR] Failed to list leads:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    db.close();
  }
}

main().catch(err => {
  console.error('[ERROR]', err.message);
  process.exit(1);
});
