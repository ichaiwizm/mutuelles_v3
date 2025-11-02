import fs from 'node:fs'
import path from 'node:path'
import { createLogger } from '../utils/logger.mjs'

const logger = createLogger('ChromeDetector')

/**
 * Détecte le chemin de Chrome/Chromium sur la machine
 * Compatible Windows, Linux/WSL et macOS
 */
export function detectChromePath() {
  const local = process.env.LOCALAPPDATA || ''

  const candidates = [
    // Windows - Chrome
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    `${local}/Google/Chrome/Application/chrome.exe`,
    // Windows - Edge
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    // Linux/WSL - Chrome
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    // Linux/WSL - Chromium
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    // macOS - Chrome
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    // macOS - Chromium
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  ]

  const normalized = candidates.filter(Boolean).map(chromePath => path.normalize(chromePath))

  for (const chromePath of normalized) {
    try {
      if (fs.existsSync(chromePath)) return chromePath
    } catch (err) {
      logger.debug('[ChromeDetector] Cannot access:', chromePath, err.message)
    }
  }

  return undefined
}
