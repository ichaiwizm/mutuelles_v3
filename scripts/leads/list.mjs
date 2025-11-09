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
    help: false,
    timeout: 3000
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
      case '--timeout':
        opts.timeout = parseInt(args[++i], 10) || 3000;
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
  --timeout <ms>      Auto-exit after <ms> milliseconds (default: 3000)
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

// Format YYYY-MM-DD → DD/MM/YYYY (without time)
function formatISODate(iso) {
  if (!iso || typeof iso !== 'string') return 'N/A';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso; // fallback raw
  return `${m[3]}/${m[2]}/${m[1]}`;
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
    console.log(`  Updated: ${lead.updated_at ? formatDate(lead.updated_at) : 'N/A'}`);

    // Project info (v2 canonical: plan, dateEffet, name)
    console.log('\n  📌 Project:');
    console.log(`     Plan: ${data.project?.plan || 'N/A'}`);
    console.log(`     Date d'effet: ${data.project?.dateEffet ? formatISODate(data.project.dateEffet) : 'N/A'}`);
    if (data.project?.name) {
      console.log(`     Name: ${data.project.name}`);
    }
    if (data.project?.medicalCareLevel || data.project?.hospitalizationLevel || data.project?.opticsLevel || data.project?.dentalLevel) {
      console.log('     Levels:');
      if (data.project?.medicalCareLevel !== undefined) console.log(`       Soins médicaux: ${data.project.medicalCareLevel}`);
      if (data.project?.hospitalizationLevel !== undefined) console.log(`       Hospitalisation: ${data.project.hospitalizationLevel}`);
      if (data.project?.opticsLevel !== undefined) console.log(`       Optique: ${data.project.opticsLevel}`);
      if (data.project?.dentalLevel !== undefined) console.log(`       Dentaire: ${data.project.dentalLevel}`);
    }

    // Subscriber info
    console.log('\n  👤 Subscriber:');
    console.log(`     Name: ${data.subscriber?.civility || ''} ${data.subscriber?.firstName || ''} ${data.subscriber?.lastName || ''}`);
    console.log(`     Birth Date: ${data.subscriber?.birthDate || 'N/A'}`);
    if (data.subscriber?.email) {
      console.log(`     Email: ${data.subscriber.email}`);
    }
    if (data.subscriber?.phoneE164 || data.subscriber?.telephone) {
      console.log(`     Phone: ${data.subscriber.phoneE164 || data.subscriber.telephone}`);
    }
    if (data.subscriber?.address) {
      console.log(`     Address: ${data.subscriber.address}`);
    }
    if (data.subscriber?.postalCode && data.subscriber?.city) {
      console.log(`     Location: ${data.subscriber.postalCode} ${data.subscriber.city}`);
    }
    if (data.subscriber?.regime) {
      console.log(`     Regime: ${data.subscriber.regime}`);
    }
    if (data.subscriber?.profession) {
      console.log(`     Profession: ${data.subscriber.profession}`);
    }

    // Spouse info (present if object exists)
    if (data.spouse) {
      console.log('\n  💑 Spouse:');
      const civ = data.spouse.civility ? `${data.spouse.civility} ` : '';
      console.log(`     Name: ${civ}${data.spouse.firstName || ''} ${data.spouse.lastName || ''}`.trim());
      console.log(`     Birth Date: ${data.spouse.birthDate ? formatISODate(data.spouse.birthDate) : 'N/A'}`);
      if (data.spouse.regime) console.log(`     Regime: ${data.spouse.regime}`);
      if (data.spouse.status) console.log(`     Status: ${data.spouse.status}`);
      if (data.spouse.profession) console.log(`     Profession: ${data.spouse.profession}`);
      if (data.spouse.category) console.log(`     Category: ${data.spouse.category}`);
      if (data.spouse.workFramework) console.log(`     Work: ${data.spouse.workFramework}`);
    }

    // Children info (v2 canonical: birthDate, regime, ayantDroit)
    if (Array.isArray(data.children) && data.children.length > 0) {
      console.log('\n  👶 Children:');
      data.children.forEach((child, idx) => {
        console.log(`     Child ${idx + 1}:`);
        console.log(`       Birth Date: ${child.birthDate ? formatISODate(child.birthDate) : 'N/A'}`);
        if (child.regime) console.log(`       Regime: ${child.regime}`);
        if (child.ayantDroit) console.log(`       Ayant droit: ${child.ayantDroit}`);
      });
    }

    // Platform specific data
    if (data.platformData) {
      console.log('\n  🔧 Platform Data:');
      console.log(`     Available platforms: ${Object.keys(data.platformData).filter(k => k.startsWith('alptis.') || k.startsWith('swisslifeone.')).map(k => k.split('.')[0]).filter((v, i, a) => a.indexOf(v) === i).join(', ') || 'None'}`);
    }

    // Metadata
    if (metadata) {
      console.log('\n  ℹ️  Metadata:');
      if (metadata.source) {
        console.log(`     Source: ${metadata.source}`);
      }
      if (metadata.emailId) {
        console.log(`     Email ID: ${metadata.emailId}`);
      }
      if (metadata.parserUsed) {
        console.log(`     Parser: ${metadata.parserUsed}`);
      }
      if (metadata.parsingConfidence) {
        console.log(`     Parsing Confidence: ${metadata.parsingConfidence}%`);
      }
      if (metadata.tags && metadata.tags.length > 0) {
        console.log(`     Tags: ${metadata.tags.join(', ')}`);
      }
      if (metadata.warnings && metadata.warnings.length > 0) {
        console.log(`     Warnings: ${metadata.warnings.join(', ')}`);
      }
    }

    // Fingerprints
    console.log('\n  🔍 Fingerprints:');
    console.log(`     Primary: ${lead.fingerprint_primary || 'N/A'}`);
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

  // Safety timer to avoid hanging forever
  const killer = setTimeout(() => {
    console.log(`\n[leads:list] Timeout reached after ${options.timeout}ms. Exiting.`);
    process.exit(0);
  }, options.timeout);

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
    clearTimeout(killer);
  }
}

main().catch(err => {
  console.error('[ERROR]', err.message);
  process.exit(1);
});
