#!/usr/bin/env node
export default {
  name: 'leads',
  description: 'Seed test leads data',
  required: false,

  async run(db, options = {}) {
    const { count = 3, skipExisting = true } = options

    // Check if leads already exist
    if (skipExisting) {
      const existingCount = db.prepare('SELECT COUNT(*) as c FROM raw_leads').get().c
      if (existingCount > 0) {
        console.log('     Leads already seeded, skipping...')
        return { count: existingCount, skipped: true }
      }
    }

    const insertRawLead = db.prepare(`
      INSERT INTO raw_leads(id, source, provider, raw_content, metadata)
      VALUES(?, ?, ?, ?, ?)
    `)

    const insertCleanLead = db.prepare(`
      INSERT INTO clean_leads(id, raw_lead_id, contact_data, souscripteur_data, conjoint_data, enfants_data, besoins_data, quality_score)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const testLeads = [
      {
        id: 'lead-001-manual-jean-dubois',
        source: 'manual',
        provider: 'generic',
        raw_content: 'Lead créé manuellement pour test',
        metadata: JSON.stringify({ created_by: 'test_seeder' }),
        contact_data: JSON.stringify({
          nom: 'Dubois',
          prenom: 'Jean',
          email: 'jean.dubois@email.com',
          telephone: '0123456789',
          adresse: {
            rue: '123 Rue de la Paix',
            code_postal: '69001',
            ville: 'Lyon'
          }
        }),
        souscripteur_data: JSON.stringify({
          date_naissance: '1980-05-15',
          profession: 'Cadre',
          regime_social: 'Sécurité sociale',
          revenus_annuels: 45000
        }),
        conjoint_data: JSON.stringify({
          date_naissance: '1982-08-20',
          profession: 'Employé',
          regime_social: 'Sécurité sociale'
        }),
        enfants_data: JSON.stringify([
          { date_naissance: '2010-03-12' },
          { date_naissance: '2013-07-25' }
        ]),
        besoins_data: JSON.stringify({
          type_contrat: 'famille',
          niveau_couverture: 'confort',
          budget_mensuel: 150
        }),
        quality_score: 8
      },
      {
        id: 'lead-002-gmail-sophie-martin',
        source: 'gmail',
        provider: 'assurprospect',
        raw_content: 'Email reçu via AssurProspect - Demande de devis santé',
        metadata: JSON.stringify({
          email_id: 'gmail-12345',
          received_at: '2024-01-15T10:30:00Z'
        }),
        contact_data: JSON.stringify({
          nom: 'Martin',
          prenom: 'Sophie',
          email: 'sophie.martin@email.com',
          telephone: '0987654321',
          adresse: {
            rue: '456 Avenue des Champs',
            code_postal: '75008',
            ville: 'Paris'
          }
        }),
        souscripteur_data: JSON.stringify({
          date_naissance: '1985-12-03',
          profession: 'TNS',
          regime_social: 'RSI',
          revenus_annuels: 65000
        }),
        conjoint_data: null,
        enfants_data: JSON.stringify([]),
        besoins_data: JSON.stringify({
          type_contrat: 'individuel',
          niveau_couverture: 'premium',
          budget_mensuel: 200
        }),
        quality_score: 9
      },
      {
        id: 'lead-003-file-pierre-moreau',
        source: 'file',
        provider: 'assurlead',
        raw_content: 'Import depuis fichier CSV AsssurLead',
        metadata: JSON.stringify({
          file_name: 'leads_janvier_2024.csv',
          import_batch: 'batch-001'
        }),
        contact_data: JSON.stringify({
          nom: 'Moreau',
          prenom: 'Pierre',
          email: 'pierre.moreau@email.com',
          telephone: '0147258369',
          adresse: {
            rue: '789 Boulevard de la République',
            code_postal: '13001',
            ville: 'Marseille'
          }
        }),
        souscripteur_data: JSON.stringify({
          date_naissance: '1975-09-18',
          profession: 'Artisan',
          regime_social: 'Sécurité sociale',
          revenus_annuels: 38000
        }),
        conjoint_data: JSON.stringify({
          date_naissance: '1978-11-14',
          profession: 'Employé',
          regime_social: 'Sécurité sociale'
        }),
        enfants_data: JSON.stringify([
          { date_naissance: '2005-01-20' },
          { date_naissance: '2008-06-15' },
          { date_naissance: '2012-04-10' }
        ]),
        besoins_data: JSON.stringify({
          type_contrat: 'famille',
          niveau_couverture: 'essentiel',
          budget_mensuel: 120
        }),
        quality_score: 7
      }
    ]

    let inserted = 0

    const transaction = db.transaction(() => {
      for (const lead of testLeads.slice(0, count)) {
        // Insert raw lead
        insertRawLead.run(
          lead.id,
          lead.source,
          lead.provider,
          lead.raw_content,
          lead.metadata
        )

        // Insert clean lead
        const cleanLeadId = lead.id.replace('lead-', 'clean-')
        insertCleanLead.run(
          cleanLeadId,
          lead.id,
          lead.contact_data,
          lead.souscripteur_data,
          lead.conjoint_data,
          lead.enfants_data,
          lead.besoins_data,
          lead.quality_score
        )

        inserted++
      }
    })

    transaction()

    return { count: inserted }
  }
}