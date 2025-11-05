#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

function rimraf(p) {
  try { fs.rmSync(p, { recursive: true, force: true }) } catch {}
}

function safeUnlink(p) {
  try { fs.unlinkSync(p) } catch {}
}

function main() {
  const root = process.cwd()
  const outDir = path.join(root, 'out')
  const runsDir = path.join(root, 'runs')
  const devData = path.join(root, 'dev-data')

  console.log('🧹 Cleaning build artifacts and dumps...')
  rimraf(outDir)
  rimraf(runsDir)

  if (fs.existsSync(devData)) {
    for (const f of fs.readdirSync(devData)) {
      if (f.endsWith('.sql')) safeUnlink(path.join(devData, f))
    }
  }

  console.log('✓ Clean complete')
}

main()

