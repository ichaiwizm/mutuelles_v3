#!/usr/bin/env node
export default {
  version: '018',
  name: 'simplify_to_single_json_column',
  description: 'Simplify leads structure: merge all JSON columns into single data column, remove raw_leads table',

  up(db) {
    // Create new simplified leads table
    db.exec(`
      CREATE TABLE leads_new (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL DEFAULT '{}',
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)

    console.log('  ✓ Created new simplified leads table')

    // Check if clean_leads table exists and has data
    const tableExists = db.prepare(`
      SELECT COUNT(*) as count FROM sqlite_master
      WHERE type='table' AND name='clean_leads'
    `).get()

    if (tableExists.count > 0) {
      // Get column info to handle different migration states
      const columns = db.prepare(`
        PRAGMA table_info(clean_leads)
      `).all()

      const columnNames = columns.map(col => col.name)

      // Build SELECT query based on available columns
      const selectParts = ['id']
      const hasOldStructure = columnNames.includes('contact_data')

      if (hasOldStructure) {
        selectParts.push('contact_data', 'souscripteur_data', 'conjoint_data',
                        'enfants_data', 'besoins_data')

        // platform_data might not exist in older migrations
        if (columnNames.includes('platform_data')) {
          selectParts.push('platform_data')
        }

        // Handle different timestamp column names
        if (columnNames.includes('cleaned_at')) {
          selectParts.push('cleaned_at')
        } else if (columnNames.includes('created_at')) {
          selectParts.push('created_at')
        }
      }

      const selectQuery = `SELECT ${selectParts.join(', ')} FROM clean_leads`
      const existingLeads = db.prepare(selectQuery).all()

      if (existingLeads.length > 0) {
        const insertStmt = db.prepare(`
          INSERT INTO leads_new (id, data, metadata, created_at)
          VALUES (?, ?, ?, ?)
        `)

        for (const row of existingLeads) {
          // Merge all data into a single JSON object
          const mergedData = {
            contact: hasOldStructure ? JSON.parse(row.contact_data || '{}') : {},
            souscripteur: hasOldStructure ? JSON.parse(row.souscripteur_data || '{}') : {},
            conjoint: row.conjoint_data ? JSON.parse(row.conjoint_data) : undefined,
            enfants: hasOldStructure ? JSON.parse(row.enfants_data || '[]') : [],
            besoins: hasOldStructure ? JSON.parse(row.besoins_data || '{}') : {},
            platformData: row.platform_data ? JSON.parse(row.platform_data) : undefined
          }

          // Default metadata
          const metadata = {
            migratedFrom: 'clean_leads'
          }

          const timestamp = row.cleaned_at || row.created_at || new Date().toISOString()

          insertStmt.run(
            row.id,
            JSON.stringify(mergedData),
            JSON.stringify(metadata),
            timestamp
          )
        }

        console.log(`  ✓ Migrated ${existingLeads.length} leads to new structure`)
      }
    }

    // Drop old tables
    db.exec(`
      DROP TABLE IF EXISTS clean_leads;
      DROP TABLE IF EXISTS raw_leads;
    `)

    console.log('  ✓ Dropped old clean_leads and raw_leads tables')

    // Rename new table to clean_leads (keep the same name for compatibility)
    db.exec(`
      ALTER TABLE leads_new RENAME TO clean_leads;
    `)

    console.log('  ✓ Renamed leads_new to clean_leads')

    // Create index on created_at for performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_clean_leads_created_at
        ON clean_leads(created_at DESC);
    `)

    console.log('  ✓ Created index on created_at')
    console.log('  ℹ New structure: id, data (all JSON merged), metadata, created_at')
  },

  down(db) {
    // Rollback: recreate old structure
    db.exec(`
      CREATE TABLE raw_leads (
        id TEXT PRIMARY KEY,
        raw_content TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        extracted_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE clean_leads_old (
        id TEXT PRIMARY KEY,
        raw_lead_id TEXT REFERENCES raw_leads(id) ON DELETE CASCADE,
        contact_data TEXT NOT NULL DEFAULT '{}',
        souscripteur_data TEXT NOT NULL DEFAULT '{}',
        conjoint_data TEXT DEFAULT NULL,
        enfants_data TEXT DEFAULT '[]',
        besoins_data TEXT DEFAULT '{}',
        platform_data TEXT DEFAULT NULL,
        cleaned_at TEXT DEFAULT (datetime('now')),
        version INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT DEFAULT NULL
      );
    `)

    // Migrate data back
    const leads = db.prepare('SELECT id, data, created_at FROM clean_leads').all()

    if (leads.length > 0) {
      const insertRaw = db.prepare(`
        INSERT INTO raw_leads (id, raw_content, metadata, extracted_at)
        VALUES (?, ?, ?, ?)
      `)

      const insertClean = db.prepare(`
        INSERT INTO clean_leads_old (
          id, raw_lead_id, contact_data, souscripteur_data,
          conjoint_data, enfants_data, besoins_data, platform_data, cleaned_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const row of leads) {
        const data = JSON.parse(row.data || '{}')
        const rawId = `raw-${row.id}`

        // Create raw_lead
        insertRaw.run(
          rawId,
          'Lead migrated from simplified structure',
          '{}',
          row.created_at
        )

        // Create clean_lead with separated columns
        insertClean.run(
          row.id,
          rawId,
          JSON.stringify(data.contact || {}),
          JSON.stringify(data.souscripteur || {}),
          data.conjoint ? JSON.stringify(data.conjoint) : null,
          JSON.stringify(data.enfants || []),
          JSON.stringify(data.besoins || {}),
          data.platformData ? JSON.stringify(data.platformData) : null,
          row.created_at
        )
      }
    }

    // Drop simplified table and rename old one
    db.exec(`
      DROP TABLE clean_leads;
      ALTER TABLE clean_leads_old RENAME TO clean_leads;
    `)

    console.log('  ✓ Rollback completed - restored old structure')
  }
}
