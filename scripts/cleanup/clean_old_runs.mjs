#!/usr/bin/env node

/**
 * Script de nettoyage des anciens runs dans admin/runs-cli/
 * Garde uniquement les N runs les plus récents par flow
 *
 * Usage:
 *   node scripts/cleanup/clean_old_runs.mjs [--keep=5] [--dry-run]
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const DEFAULT_KEEP = 5
const RUNS_DIR = path.resolve(__dirname, '../../admin/runs-cli')

// Parse arguments
const args = process.argv.slice(2)
const keepCount = parseInt(args.find(arg => arg.startsWith('--keep='))?.split('=')[1] || DEFAULT_KEEP)
const isDryRun = args.includes('--dry-run')

function usage() {
  console.log(`
Usage: node scripts/cleanup/clean_old_runs.mjs [options]

Options:
  --keep=N      Nombre de runs à conserver par flow (défaut: ${DEFAULT_KEEP})
  --dry-run     Afficher ce qui serait supprimé sans le faire
  --help        Afficher cette aide

Exemples:
  node scripts/cleanup/clean_old_runs.mjs --dry-run
  node scripts/cleanup/clean_old_runs.mjs --keep=3
  node scripts/cleanup/clean_old_runs.mjs --keep=10 --dry-run
`)
  process.exit(0)
}

if (args.includes('--help')) {
  usage()
}

/**
 * Obtenir la taille d'un dossier en Mo
 */
function getFolderSize(dirPath) {
  let size = 0

  function calculateSize(currentPath) {
    try {
      const stat = fs.statSync(currentPath)
      if (stat.isFile()) {
        size += stat.size
      } else if (stat.isDirectory()) {
        const files = fs.readdirSync(currentPath)
        files.forEach(file => {
          calculateSize(path.join(currentPath, file))
        })
      }
    } catch (err) {
      // Ignorer les erreurs d'accès
    }
  }

  calculateSize(dirPath)
  return (size / (1024 * 1024)).toFixed(2) // Mo
}

/**
 * Supprimer récursivement un dossier
 */
function removeDirRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file)
      if (fs.lstatSync(curPath).isDirectory()) {
        removeDirRecursive(curPath)
      } else {
        fs.unlinkSync(curPath)
      }
    })
    fs.rmdirSync(dirPath)
  }
}

/**
 * Nettoyer les anciens runs
 */
function cleanOldRuns() {
  console.log(`\n🧹 Nettoyage des anciens runs (conservation: ${keepCount} runs par flow)`)
  console.log(`📁 Dossier: ${RUNS_DIR}`)
  console.log(`${isDryRun ? '⚠️  Mode DRY-RUN (aucune suppression réelle)' : ''}`)
  console.log('')

  if (!fs.existsSync(RUNS_DIR)) {
    console.log('❌ Le dossier admin/runs-cli n\'existe pas')
    return
  }

  const flows = fs.readdirSync(RUNS_DIR).filter(file => {
    const fullPath = path.join(RUNS_DIR, file)
    return fs.statSync(fullPath).isDirectory()
  })

  if (flows.length === 0) {
    console.log('✅ Aucun flow trouvé')
    return
  }

  let totalDeleted = 0
  let totalSizeSaved = 0

  flows.forEach(flowName => {
    const flowDir = path.join(RUNS_DIR, flowName)
    console.log(`\n📦 Flow: ${flowName}`)

    // Lister tous les runs
    const runs = fs.readdirSync(flowDir)
      .filter(file => {
        const fullPath = path.join(flowDir, file)
        return fs.statSync(fullPath).isDirectory()
      })
      .map(runDir => {
        const fullPath = path.join(flowDir, runDir)
        const stat = fs.statSync(fullPath)
        return {
          name: runDir,
          path: fullPath,
          mtime: stat.mtime.getTime()
        }
      })
      .sort((a, b) => b.mtime - a.mtime) // Trier du plus récent au plus ancien

    console.log(`   Runs trouvés: ${runs.length}`)

    if (runs.length <= keepCount) {
      console.log(`   ✅ Rien à supprimer (≤ ${keepCount} runs)`)
      return
    }

    // Runs à supprimer
    const runsToDelete = runs.slice(keepCount)
    console.log(`   ⚠️  À supprimer: ${runsToDelete.length} runs`)

    runsToDelete.forEach(run => {
      const size = getFolderSize(run.path)
      const date = new Date(run.mtime).toLocaleString('fr-FR')

      if (isDryRun) {
        console.log(`      [DRY] ${run.name} (${size} Mo) - ${date}`)
      } else {
        console.log(`      🗑️  ${run.name} (${size} Mo) - ${date}`)
        try {
          removeDirRecursive(run.path)
          totalDeleted++
          totalSizeSaved += parseFloat(size)
        } catch (err) {
          console.error(`      ❌ Erreur lors de la suppression: ${err.message}`)
        }
      }
    })
  })

  console.log('\n' + '='.repeat(60))
  console.log(`\n📊 Résumé:`)
  console.log(`   Runs supprimés: ${totalDeleted}`)
  console.log(`   Espace libéré: ${totalSizeSaved.toFixed(2)} Mo`)

  if (isDryRun) {
    console.log(`\n💡 Pour effectuer le nettoyage, exécutez sans --dry-run`)
  } else {
    console.log(`\n✅ Nettoyage terminé`)
  }
}

// Exécution
try {
  cleanOldRuns()
} catch (err) {
  console.error('\n❌ Erreur:', err.message)
  process.exit(1)
}
