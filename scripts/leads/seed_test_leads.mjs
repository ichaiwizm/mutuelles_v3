#!/usr/bin/env node
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'
import { randomUUID } from 'crypto'

function getProjectRoot() {
  const __filename = new URL(import.meta.url).pathname
  const __dirname = path.dirname(__filename.replace(/^\/([A-Z]):/, '$1:'))
  return path.resolve(__dirname, '../../')
}

function getDbPath() {
  const root = getProjectRoot()
  const devDir = process.env.MUTUELLES_DB_DIR || path.join(root, 'dev-data')
  return path.join(devDir, 'mutuelles.sqlite3')
}

function openDbRW() {
  const require = createRequire(import.meta.url)
  const Database = require('better-sqlite3')
  const dbPath = getDbPath()

  if (!fs.existsSync(dbPath)) {
    console.error('❌ Base de données non trouvée:', dbPath)
    process.exit(1)
  }

  const db = new Database(dbPath)
  try { db.pragma('foreign_keys = ON') } catch {}
  return db
}

function createTestLeads() {
  return [
    {
      rawLead: {
        source: 'manual',
        provider: null,
        rawContent: 'Lead créé manuellement pour test',
        metadata: { createdBy: 'script' }
      },
      cleanLead: {
        contact: {
          civilite: 'M.',
          nom: 'Dubois',
          prenom: 'Jean',
          telephone: '0123456789',
          email: 'jean.dubois@example.com',
          adresse: '123 Rue de la Paix',
          codePostal: '75001',
          ville: 'Paris'
        },
        souscripteur: {
          dateNaissance: '1980-05-15',
          profession: 'Ingénieur',
          regimeSocial: 'Salarié',
          nombreEnfants: 2
        },
        conjoint: {
          civilite: 'Mme',
          prenom: 'Marie',
          nom: 'Dubois',
          dateNaissance: '1982-08-20',
          profession: 'Professeur',
          regimeSocial: 'Salarié'
        },
        enfants: [
          { dateNaissance: '2010-03-12', sexe: 'M' },
          { dateNaissance: '2012-11-08', sexe: 'F' }
        ],
        besoins: {
          dateEffet: '2024-01-01',
          assureActuellement: true,
          gammes: ['Sante'],
          niveaux: {
            soinsMedicaux: 3,
            hospitalisation: 4,
            optique: 2,
            dentaire: 3
          }
        },
        qualityScore: 8
      }
    },
    {
      rawLead: {
        source: 'gmail',
        provider: 'assurprospect',
        rawContent: 'Email depuis AssurProspect avec données prospect',
        metadata: {
          emailSubject: 'Nouveau prospect - Santé',
          extractedFrom: 'contact@assurprospect.com'
        }
      },
      cleanLead: {
        contact: {
          civilite: 'Mme',
          nom: 'Martin',
          prenom: 'Sophie',
          telephone: '0987654321',
          email: 'sophie.martin@example.com',
          adresse: '456 Avenue des Champs',
          codePostal: '69001',
          ville: 'Lyon'
        },
        souscripteur: {
          dateNaissance: '1975-12-03',
          profession: 'Médecin',
          regimeSocial: 'TNS',
          nombreEnfants: 0
        },
        besoins: {
          dateEffet: '2024-02-01',
          assureActuellement: false,
          gammes: ['Sante', 'Prevoyance'],
          niveaux: {
            soinsMedicaux: 4,
            hospitalisation: 5,
            optique: 3,
            dentaire: 4
          }
        },
        qualityScore: 7
      }
    },
    {
      rawLead: {
        source: 'file',
        provider: null,
        rawContent: 'Import depuis fichier CSV',
        metadata: {
          filename: 'leads_import_test.csv',
          row: 1
        }
      },
      cleanLead: {
        contact: {
          civilite: 'M.',
          nom: 'Moreau',
          prenom: 'Pierre',
          telephone: '0145678901',
          email: 'pierre.moreau@example.com',
          ville: 'Marseille',
          codePostal: '13001'
        },
        souscripteur: {
          dateNaissance: '1985-07-18',
          profession: 'Artisan',
          regimeSocial: 'TNS',
          nombreEnfants: 3
        },
        enfants: [
          { dateNaissance: '2008-01-15', sexe: 'M' },
          { dateNaissance: '2010-06-22', sexe: 'F' },
          { dateNaissance: '2014-09-30', sexe: 'M' }
        ],
        besoins: {
          dateEffet: '2024-03-01',
          assureActuellement: true,
          madelin: true,
          niveaux: {
            soinsMedicaux: 2,
            hospitalisation: 3,
            optique: 1,
            dentaire: 2
          }
        },
        qualityScore: 6
      }
    }
  ]
}

async function main() {
  const db = openDbRW()

  console.log('🌱 Création de leads de test...\n')

  // Vérifier si les tables existent
  const tables = ['raw_leads', 'clean_leads']
  for (const table of tables) {
    const exists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table)
    if (!exists) {
      console.error(`❌ Table ${table} non trouvée. Exécutez d'abord l'application pour créer les tables.`)
      process.exit(1)
    }
  }

  // Vérifier si des leads existent déjà
  const existing = db.prepare('SELECT COUNT(*) as count FROM clean_leads').get()
  if (existing.count > 0) {
    console.log(`⚠️  ${existing.count} leads déjà présents. Ajout des nouveaux leads...`)
  }

  const testLeads = createTestLeads()
  let created = 0

  const insertRawLead = db.prepare(`
    INSERT INTO raw_leads (id, source, provider, raw_content, metadata, extracted_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const insertCleanLead = db.prepare(`
    INSERT INTO clean_leads (
      id, raw_lead_id, contact_data, souscripteur_data, conjoint_data,
      enfants_data, besoins_data, quality_score, cleaned_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction((leads) => {
    for (const leadData of leads) {
      const rawId = randomUUID()
      const cleanId = randomUUID()
      const now = new Date().toISOString()

      // Insérer raw lead
      insertRawLead.run(
        rawId,
        leadData.rawLead.source,
        leadData.rawLead.provider,
        leadData.rawLead.rawContent,
        JSON.stringify(leadData.rawLead.metadata),
        now
      )

      // Insérer clean lead
      insertCleanLead.run(
        cleanId,
        rawId,
        JSON.stringify(leadData.cleanLead.contact),
        JSON.stringify(leadData.cleanLead.souscripteur),
        leadData.cleanLead.conjoint ? JSON.stringify(leadData.cleanLead.conjoint) : null,
        JSON.stringify(leadData.cleanLead.enfants || []),
        JSON.stringify(leadData.cleanLead.besoins),
        leadData.cleanLead.qualityScore,
        now
      )

      created++
      console.log(`  ✅ Lead créé: ${leadData.cleanLead.contact.prenom} ${leadData.cleanLead.contact.nom} (${leadData.rawLead.source})`)
    }
  })

  try {
    transaction(testLeads)
    console.log(`\n🎉 ${created} leads de test créés avec succès!`)

    // Afficher les statistiques
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN rl.source = 'manual' THEN 1 END) as manual,
        COUNT(CASE WHEN rl.source = 'gmail' THEN 1 END) as gmail,
        COUNT(CASE WHEN rl.source = 'file' THEN 1 END) as file,
        AVG(cl.quality_score) as avg_score
      FROM clean_leads cl
      JOIN raw_leads rl ON cl.raw_lead_id = rl.id
    `).get()

    console.log('\n📊 Statistiques:')
    console.log(`  Total leads: ${stats.total}`)
    console.log(`  Manuels: ${stats.manual}`)
    console.log(`  Gmail: ${stats.gmail}`)
    console.log(`  Fichier: ${stats.file}`)
    console.log(`  Score moyen: ${Math.round(stats.avg_score * 10) / 10}`)

  } catch (error) {
    console.error('❌ Erreur lors de la création des leads:', error.message)
    process.exit(1)
  } finally {
    db.close()
  }
}

main().catch(err => {
  console.error('❌ Erreur:', err.stack || err)
  process.exit(1)
})