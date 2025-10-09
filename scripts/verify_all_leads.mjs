#!/usr/bin/env node
/**
 * Script de vérification : Analyse TOUS les leads
 * Affiche un résumé de combien de champs platform-specific sont sauvegardés
 */

import { openDbRW } from './flows/lib/flows_io.mjs'

async function main() {
  console.log('🔍 Analyse de TOUS les leads\n')

  const db = openDbRW()
  try {
    // Récupérer tous les leads
    const leads = db.prepare(`
      SELECT
        id,
        contact_data,
        platform_data,
        cleaned_at
      FROM clean_leads
      ORDER BY cleaned_at DESC
    `).all()

    if (leads.length === 0) {
      console.log('❌ Aucun lead trouvé')
      process.exit(1)
    }

    console.log(`📊 ${leads.length} leads trouvés\n`)
    console.log('═'.repeat(100))

    let totalLeads = 0
    let leadsWithPlatformData = 0
    let totalAlptisFields = 0
    let totalSwisslifeFields = 0
    let leadsWithAlptis = 0
    let leadsWithSwisslife = 0

    leads.forEach((lead, index) => {
      totalLeads++
      const contact = JSON.parse(lead.contact_data)
      const platformData = lead.platform_data ? JSON.parse(lead.platform_data) : null

      const name = `${contact.prenom || '?'} ${contact.nom || '?'}`
      const date = new Date(lead.cleaned_at).toLocaleString('fr-FR')

      let alptisCount = 0
      let swisslifeCount = 0

      if (platformData) {
        if (platformData.alptis && Object.keys(platformData.alptis).length > 0) {
          alptisCount = Object.keys(platformData.alptis).length
          totalAlptisFields += alptisCount
          leadsWithAlptis++
        }

        if (platformData.swisslifeone && Object.keys(platformData.swisslifeone).length > 0) {
          swisslifeCount = Object.keys(platformData.swisslifeone).length
          totalSwisslifeFields += swisslifeCount
          leadsWithSwisslife++
        }

        if (alptisCount > 0 || swisslifeCount > 0) {
          leadsWithPlatformData++
        }
      }

      const status = (alptisCount > 0 || swisslifeCount > 0) ? '✅' : '⚠️ '

      console.log(`\n${'═'.repeat(100)}`)
      console.log(`${status} LEAD ${index + 1}: ${name.padEnd(20)} | ID: ${lead.id}`)
      console.log(`${'═'.repeat(100)}`)
      console.log(`Date création: ${date}`)
      console.log(`Platform data: Alptis=${alptisCount} champs, SwissLife=${swisslifeCount} champs`)

      // Afficher TOUTES les infos du lead
      console.log(`\n--- CONTACT_DATA (toutes les infos) ---`)
      console.log(JSON.stringify(contact, null, 2))

      if (platformData) {
        console.log(`\n--- PLATFORM_DATA (toutes les infos) ---`)
        console.log(JSON.stringify(platformData, null, 2))
      } else {
        console.log(`\n--- PLATFORM_DATA ---`)
        console.log('(aucune donnée)')
      }

      console.log()
    })

    console.log('═'.repeat(100))
    console.log('📈 STATISTIQUES GLOBALES')
    console.log('═'.repeat(100))
    console.log(`Total leads                    : ${totalLeads}`)
    console.log(`Leads avec platform_data       : ${leadsWithPlatformData} (${Math.round(leadsWithPlatformData/totalLeads*100)}%)`)
    console.log(`Leads avec données Alptis      : ${leadsWithAlptis}`)
    console.log(`Leads avec données SwissLife   : ${leadsWithSwisslife}`)
    console.log(`Total champs Alptis            : ${totalAlptisFields}`)
    console.log(`Total champs SwissLife         : ${totalSwisslifeFields}`)
    console.log(`Moyenne champs/lead (Alptis)   : ${totalLeads > 0 ? (totalAlptisFields/totalLeads).toFixed(1) : 0}`)
    console.log(`Moyenne champs/lead (SwissLife): ${totalLeads > 0 ? (totalSwisslifeFields/totalLeads).toFixed(1) : 0}`)
    console.log()

    if (leadsWithPlatformData === 0) {
      console.log('❌ PROBLÈME : Aucun lead n\'a de données platform-specific !')
      console.log('   → Les champs des sections Alptis/SwissLife ne sont PAS extraits')
      console.log('   → Il faut corriger la fonction extractPlatformData()')
    } else if (leadsWithPlatformData < totalLeads) {
      console.log(`⚠️  ATTENTION : ${totalLeads - leadsWithPlatformData}/${totalLeads} leads n'ont pas de platform_data`)
      console.log('   → Soit ces leads ont été créés avant la correction')
      console.log('   → Soit les sections Alptis/SwissLife n\'ont pas été remplies')
    } else {
      console.log('🎉 PARFAIT : Tous les leads ont des données platform-specific !')
    }

  } finally {
    try { db.close() } catch {}
  }
}

main().catch(err => {
  console.error('💥 Erreur:', err)
  process.exit(1)
})
