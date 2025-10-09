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
    let totalPlatformFields = 0

    leads.forEach((lead, index) => {
      totalLeads++
      const contact = JSON.parse(lead.contact_data)
      const platformData = lead.platform_data ? JSON.parse(lead.platform_data) : null

      const name = `${contact.prenom || '?'} ${contact.nom || '?'}`
      const date = new Date(lead.cleaned_at).toLocaleString('fr-FR')

      let fieldCount = 0

      if (platformData && typeof platformData === 'object') {
        fieldCount = Object.keys(platformData).length
        totalPlatformFields += fieldCount

        if (fieldCount > 0) {
          leadsWithPlatformData++
        }
      }

      const status = fieldCount > 0 ? '✅' : '⚠️ '

      console.log(`\n${'═'.repeat(100)}`)
      console.log(`${status} LEAD ${index + 1}: ${name.padEnd(20)} | ID: ${lead.id}`)
      console.log(`${'═'.repeat(100)}`)
      console.log(`Date création: ${date}`)
      console.log(`Platform data: ${fieldCount} champs`)

      // Afficher TOUTES les infos du lead
      console.log(`\n--- CONTACT_DATA (toutes les infos) ---`)
      console.log(JSON.stringify(contact, null, 2))

      if (platformData && fieldCount > 0) {
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
    console.log(`Total leads                      : ${totalLeads}`)
    console.log(`Leads avec platform_data         : ${leadsWithPlatformData} (${totalLeads > 0 ? Math.round(leadsWithPlatformData/totalLeads*100) : 0}%)`)
    console.log(`Total champs platform_data       : ${totalPlatformFields}`)
    console.log(`Moyenne champs/lead              : ${totalLeads > 0 ? (totalPlatformFields/totalLeads).toFixed(1) : 0}`)
    console.log()

    if (leadsWithPlatformData === 0) {
      console.log('❌ PROBLÈME : Aucun lead n\'a de données platform_data !')
      console.log('   → Les champs du formulaire ne sont PAS stockés')
      console.log('   → Vérifier le flux de données frontend → backend')
    } else if (leadsWithPlatformData < totalLeads) {
      console.log(`⚠️  ATTENTION : ${totalLeads - leadsWithPlatformData}/${totalLeads} leads n'ont pas de platform_data`)
      console.log('   → Ces leads ont été créés avant la correction')
      console.log('   → Ou les champs n\'ont pas été remplis dans le formulaire')
    } else {
      console.log('🎉 PARFAIT : Tous les leads ont des données platform_data stockées !')
    }

  } finally {
    try { db.close() } catch {}
  }
}

main().catch(err => {
  console.error('💥 Erreur:', err)
  process.exit(1)
})
