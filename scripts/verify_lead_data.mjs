#!/usr/bin/env node
/**
 * Script de vérification : Analyse le dernier lead créé
 * Vérifie que les données platform-specific sont bien sauvegardées
 */

import { openDbRW } from './flows/lib/flows_io.mjs'

function main() {
  console.log('🔍 Vérification du dernier lead créé\n')

  const db = openDbRW()
  try {
    // Récupérer le dernier lead créé
    const lead = db.prepare(`
      SELECT
        id,
        contact_data,
        souscripteur_data,
        conjoint_data,
        enfants_data,
        besoins_data,
        platform_data,
        cleaned_at
      FROM clean_leads
      ORDER BY cleaned_at DESC
      LIMIT 1
    `).get()

    if (!lead) {
      console.log('❌ Aucun lead trouvé dans la base de données')
      process.exit(1)
    }

    console.log('📋 LEAD TROUVÉ')
    console.log('─'.repeat(80))
    console.log(`ID: ${lead.id}`)
    console.log(`Créé le: ${lead.cleaned_at}`)
    console.log()

    // Parser les données JSON
    const contact = JSON.parse(lead.contact_data)
    const souscripteur = JSON.parse(lead.souscripteur_data)
    const conjoint = lead.conjoint_data ? JSON.parse(lead.conjoint_data) : null
    const enfants = JSON.parse(lead.enfants_data)
    const besoins = JSON.parse(lead.besoins_data)
    const platformData = lead.platform_data ? JSON.parse(lead.platform_data) : null

    // Afficher les données génériques
    console.log('👤 CONTACT')
    console.log('─'.repeat(80))
    console.log(JSON.stringify(contact, null, 2))
    console.log()

    console.log('📝 SOUSCRIPTEUR')
    console.log('─'.repeat(80))
    console.log(JSON.stringify(souscripteur, null, 2))
    console.log()

    if (conjoint) {
      console.log('💑 CONJOINT')
      console.log('─'.repeat(80))
      console.log(JSON.stringify(conjoint, null, 2))
      console.log()
    }

    if (enfants && enfants.length > 0) {
      console.log(`👶 ENFANTS (${enfants.length})`)
      console.log('─'.repeat(80))
      console.log(JSON.stringify(enfants, null, 2))
      console.log()
    }

    console.log('🎯 BESOINS')
    console.log('─'.repeat(80))
    console.log(JSON.stringify(besoins, null, 2))
    console.log()

    // VÉRIFICATION CRITIQUE : platform_data
    console.log('🏢 PLATFORM DATA (CRITIQUE)')
    console.log('═'.repeat(80))

    if (!platformData) {
      console.log('❌ ERREUR : platform_data est NULL ou vide !')
      console.log('   → Les données platform-specific n\'ont PAS été sauvegardées')
      process.exit(1)
    }

    console.log('✅ platform_data existe')
    console.log()

    // Vérifier Alptis
    if (platformData.alptis) {
      const alptisFields = Object.keys(platformData.alptis)
      console.log(`📦 ALPTIS (${alptisFields.length} champs)`)
      console.log('─'.repeat(80))
      console.log(JSON.stringify(platformData.alptis, null, 2))
      console.log()
    } else {
      console.log('⚠️  ALPTIS : Aucune donnée')
      console.log()
    }

    // Vérifier SwissLife
    if (platformData.swisslifeone) {
      const swisslifeFields = Object.keys(platformData.swisslifeone)
      console.log(`📦 SWISSLIFE (${swisslifeFields.length} champs)`)
      console.log('─'.repeat(80))
      console.log(JSON.stringify(platformData.swisslifeone, null, 2))
      console.log()
    } else {
      console.log('⚠️  SWISSLIFE : Aucune donnée')
      console.log()
    }

    // Résumé final
    console.log('═'.repeat(80))
    console.log('📊 RÉSUMÉ')
    console.log('═'.repeat(80))

    const alptisCount = platformData.alptis ? Object.keys(platformData.alptis).length : 0
    const swisslifeCount = platformData.swisslifeone ? Object.keys(platformData.swisslifeone).length : 0
    const totalPlatformFields = alptisCount + swisslifeCount

    if (totalPlatformFields === 0) {
      console.log('❌ PROBLÈME : Aucune donnée platform-specific sauvegardée')
      console.log('   → Vérifier que tu as rempli les sections Alptis et SwissLife dans l\'UI')
    } else {
      console.log(`✅ ${totalPlatformFields} champs platform-specific sauvegardés`)
      console.log(`   - Alptis : ${alptisCount} champs`)
      console.log(`   - SwissLife : ${swisslifeCount} champs`)
      console.log()
      console.log('🎉 SUCCÈS : Les données platform-specific sont bien conservées !')
    }

  } finally {
    try { db.close() } catch {}
  }
}

main().catch(err => {
  console.error('💥 Erreur:', err)
  process.exit(1)
})
