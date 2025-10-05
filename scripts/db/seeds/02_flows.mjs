#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default {
  name: 'flows',
  description: 'Import flows from JSON files',
  required: false,

  async run(db, options = {}) {
    const {
      flowsDir = null,
      slugs = ['alptis_login', 'alptis_sante_select_pro_full', 'swisslifeone_login'],
      skipExisting = true
    } = options

    // Get project root and flows directory
    const projectRoot = path.resolve(__dirname, '../../../')
    const defaultFlowsDir = path.join(projectRoot, 'admin/flows')
    const flowsDirPath = flowsDir || defaultFlowsDir

    if (!fs.existsSync(flowsDirPath)) {
      console.log(`     Flows directory not found: ${flowsDirPath}`)
      return { count: 0, error: 'Flows directory not found' }
    }

    const targetSlugs = Array.isArray(slugs) ? slugs : slugs.split(',').map(s => s.trim())

    // Check if flows already exist
    if (skipExisting) {
      const existingCount = db.prepare('SELECT COUNT(*) as c FROM flows_catalog').get().c
      if (existingCount > 0) {
        console.log('     Flows already seeded, skipping...')
        return { count: existingCount, skipped: true }
      }
    }

    // Get platform mappings
    const platformRows = db.prepare('SELECT id, slug FROM platforms_catalog').all()
    const platformBySlug = Object.fromEntries(platformRows.map(p => [p.slug, p.id]))

    let imported = 0

    for (const flowSlug of targetSlugs) {
      try {
        const flowFile = await findFlowFile(flowsDirPath, flowSlug)
        if (!flowFile) {
          console.log(`     Flow file not found: ${flowSlug}`)
          continue
        }

        const flowData = JSON.parse(fs.readFileSync(flowFile, 'utf-8'))

        // Validate flow data
        if (!flowData.platform || !flowData.slug || !flowData.name || !flowData.steps) {
          console.log(`     Invalid flow data in: ${flowFile}`)
          continue
        }

        const platformId = platformBySlug[flowData.platform]
        if (!platformId) {
          console.log(`     Platform not found: ${flowData.platform} for flow ${flowSlug}`)
          continue
        }

        // Import flow
        await importFlow(db, flowData, platformId)
        imported++
        console.log(`     Imported flow: ${flowData.name} (${flowData.slug})`)

      } catch (err) {
        console.log(`     Error importing flow ${flowSlug}: ${err.message}`)
      }
    }

    return { count: imported }
  }
}

async function findFlowFile(flowsDir, slug) {
  // Look for the flow file in platform subdirectories
  const platformDirs = fs.readdirSync(flowsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

  for (const platformDir of platformDirs) {
    const platformPath = path.join(flowsDir, platformDir)
    const files = fs.readdirSync(platformPath)

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(platformPath, file)
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
          if (content.slug === slug) {
            return filePath
          }
        } catch (err) {
          // Skip invalid JSON files
        }
      }
    }
  }

  return null
}

async function importFlow(db, flowData, platformId) {
  const insertFlow = db.prepare(`
    INSERT INTO flows_catalog(platform_id, slug, name, active)
    VALUES(?, ?, ?, ?)
  `)

  const insertStep = db.prepare(`
    INSERT INTO flow_steps(flow_id, order_index, type, selector, value, url, screenshot_label, timeout_ms, assert_text)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    // Insert flow
    const flowInfo = insertFlow.run(
      platformId,
      flowData.slug,
      flowData.name,
      flowData.active ? 1 : 0
    )
    const flowId = Number(flowInfo.lastInsertRowid)

    // Insert steps
    flowData.steps.forEach((step, index) => {
      insertStep.run(
        flowId,
        index + 1,
        step.type,
        step.selector || null,
        step.value || null,
        step.url || null,
        step.screenshot_label || null,
        step.timeout_ms || null,
        step.assert_text || null
      )
    })
  })

  transaction()
}