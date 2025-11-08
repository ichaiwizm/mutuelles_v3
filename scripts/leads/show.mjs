#!/usr/bin/env node
/**
 * Show Lead Script
 * ================
 *
 * Display a single lead by ID or search by name.
 */

import { openDb } from '../../src/shared/db/connection.mjs';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    query: null,
    format: 'table',
    help: false,
    timeout: 3000
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--format':
        opts.format = args[++i];
        break;
      case '--timeout':
        opts.timeout = parseInt(args[++i], 10) || 3000;
        break;
      case '--help':
      case '-h':
        opts.help = true;
        break;
      default:
        if (!arg.startsWith('--')) {
          opts.query = arg;
        }
        break;
    }
  }

  return opts;
}

function usage() {
  console.log(`
📋 Show Lead Tool

Usage:
  npm run leads:show <id|name> [options]

Arguments:
  <id|name>           Lead ID (UUID) or name to search for

Options:
  --format <type>     Output format (table|json) [default: table]
  --timeout <ms>      Auto-exit after <ms> milliseconds (default: 3000)
  --help, -h          Show this help

Examples:
  # Show lead by full ID
  npm run leads:show 3e0dc672-2069-45e3-93b2-0ff8a30c8ca6

  # Show lead by partial ID (beginning of the UUID)
  npm run leads:show 3e0dc672

  # Search lead by name
  npm run leads:show "DAIRE"

  # Show lead in JSON format
  npm run leads:show 3e0dc672 -- --format json
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

function findLead(db, query) {
  // Try to find by exact ID first
  let stmt = db.prepare('SELECT * FROM clean_leads WHERE id = ?');
  let lead = stmt.get(query);

  if (lead) {
    return lead;
  }

  // Try to find by partial ID (starts with)
  stmt = db.prepare('SELECT * FROM clean_leads WHERE id LIKE ?');
  lead = stmt.get(`${query}%`);

  if (lead) {
    return lead;
  }

  // If not found by ID, search by name in the data
  stmt = db.prepare(`
    SELECT * FROM clean_leads
    WHERE data LIKE ?
    ORDER BY created_at DESC
    LIMIT 1
  `);

  lead = stmt.get(`%${query}%`);

  return lead;
}

function searchLeads(db, query) {
  const stmt = db.prepare(`
    SELECT * FROM clean_leads
    WHERE data LIKE ?
    ORDER BY created_at DESC
  `);

  return stmt.all(`%${query}%`);
}

function displayAsTable(lead) {
  const data = JSON.parse(lead.data);
  const metadata = lead.metadata ? JSON.parse(lead.metadata) : null;

  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                        📋 LEAD DETAILS                          │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  LEAD INFORMATION`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ID: ${lead.id}`);
  console.log(`  Created: ${formatDate(lead.created_at)}`);
  console.log(`  Updated: ${lead.updated_at ? formatDate(lead.updated_at) : 'N/A'}`);

  // Project info
  console.log('\n  📌 Project:');
  console.log(`     Type: ${data.project?.type || 'N/A'}`);
  console.log(`     Start Date: ${data.project?.startDate || 'N/A'}`);
  if (data.project?.postalCode) {
    console.log(`     Postal Code: ${data.project.postalCode}`);
  }
  if (data.project?.name) {
    console.log(`     Name: ${data.project.name}`);
  }

  // Subscriber info
  console.log('\n  👤 Subscriber:');
  console.log(`     Name: ${data.subscriber?.civility || ''} ${data.subscriber?.firstName || ''} ${data.subscriber?.lastName || ''}`);
  console.log(`     Birth Date: ${data.subscriber?.birthDate || 'N/A'}`);
  if (data.subscriber?.email) {
    console.log(`     Email: ${data.subscriber.email}`);
  }
  if (data.subscriber?.phone || data.subscriber?.telephone) {
    console.log(`     Phone: ${data.subscriber.phone || data.subscriber.telephone}`);
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

  // Spouse info
  if (data.spouse?.exists) {
    console.log('\n  💑 Spouse:');
    console.log(`     Name: ${data.spouse?.civility || ''} ${data.spouse?.firstName || ''} ${data.spouse?.lastName || ''}`);
    console.log(`     Birth Date: ${data.spouse?.birthDate || 'N/A'}`);
    console.log(`     Regime: ${data.spouse?.regime || 'N/A'}`);
    if (data.spouse?.profession) {
      console.log(`     Profession: ${data.spouse.profession}`);
    }
  }

  // Children info
  if (data.children && data.children.length > 0) {
    console.log('\n  👶 Children:');
    data.children.forEach((child, idx) => {
      console.log(`     Child ${idx + 1}:`);
      console.log(`       Name: ${child.firstName || 'N/A'} ${child.lastName || ''}`);
      console.log(`       Birth Date: ${child.birthDate || 'N/A'}`);
      if (child.schoolCertificate !== undefined) {
        console.log(`       School Certificate: ${child.schoolCertificate ? 'Yes' : 'No'}`);
      }
      if (child.regime) {
        console.log(`       Regime: ${child.regime}`);
      }
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
    if (metadata.provider) {
      console.log(`     Provider: ${metadata.provider}`);
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

  console.log('\n');
}

function displayAsJson(lead) {
  const formatted = {
    id: lead.id,
    data: JSON.parse(lead.data),
    fingerprintPrimary: lead.fingerprint_primary,
    fingerprintEmail: lead.fingerprint_email,
    fingerprintPhone: lead.fingerprint_phone,
    metadata: lead.metadata ? JSON.parse(lead.metadata) : null,
    createdAt: lead.created_at,
    updatedAt: lead.updated_at,
  };

  console.log(JSON.stringify(formatted, null, 2));
}

function displayMultipleResults(leads) {
  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                   🔍 MULTIPLE RESULTS FOUND                     │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');

  console.log(`Found ${leads.length} leads matching your query:\n`);

  leads.forEach((lead, idx) => {
    const data = JSON.parse(lead.data);
    const name = `${data.subscriber?.civility || ''} ${data.subscriber?.firstName || ''} ${data.subscriber?.lastName || ''}`.trim();

    console.log(`  ${idx + 1}. ${lead.id}`);
    console.log(`     Name: ${name || 'N/A'}`);
    console.log(`     Email: ${data.subscriber?.email || 'N/A'}`);
    console.log(`     Created: ${formatDate(lead.created_at)}`);
    console.log('');
  });

  console.log('\nUse the full ID to show a specific lead.\n');
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    usage();
    return;
  }

  if (!options.query) {
    console.error('[ERROR] Missing required argument: <id|name>');
    console.error('Use --help to see usage information.');
    process.exit(1);
  }

  if (!['table', 'json'].includes(options.format)) {
    console.error(`[ERROR] Invalid format: ${options.format}`);
    console.error('Valid formats: table, json');
    process.exit(1);
  }

  // Safety timer to avoid hanging forever
  const killer = setTimeout(() => {
    console.log(`\n[leads:show] Timeout reached after ${options.timeout}ms. Exiting.`);
    process.exit(0);
  }, options.timeout);

  const db = openDb();

  try {
    // First, try to find exact match by ID
    const lead = findLead(db, options.query);

    if (lead) {
      switch (options.format) {
        case 'json':
          displayAsJson(lead);
          break;
        case 'table':
        default:
          displayAsTable(lead);
          break;
      }
    } else {
      // If no exact match, search for multiple results
      const leads = searchLeads(db, options.query);

      if (leads.length === 0) {
        console.error(`\n[ERROR] No lead found matching: "${options.query}"\n`);
        process.exit(1);
      } else if (leads.length === 1) {
        // If only one result, display it
        switch (options.format) {
          case 'json':
            displayAsJson(leads[0]);
            break;
          case 'table':
          default:
            displayAsTable(leads[0]);
            break;
        }
      } else {
        // Multiple results found
        displayMultipleResults(leads);
      }
    }
  } catch (error) {
    console.error('[ERROR] Failed to show lead:', error.message);
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
