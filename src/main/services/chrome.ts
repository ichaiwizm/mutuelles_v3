import fs from 'node:fs'
import path from 'node:path'
import { getChromePath as getStoredPath, setChromePath as setStoredPath } from './settings'

// Cross-platform Chrome/Chromium detection paths
const chromeCandidates = [
  // Windows - Chrome
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA || ''}/Google/Chrome/Application/chrome.exe`,
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

export function detectChromePath(): string | undefined {
  for (const p of chromeCandidates) {
    if (p && fs.existsSync(p)) return path.normalize(p)
  }
  return undefined
}

export function getChromePath(): string | undefined {
  const stored = getStoredPath()
  if (stored && fs.existsSync(stored)) return stored
  const detected = detectChromePath()
  if (detected) setStoredPath(detected)
  return detected
}

export function setChromePath(p: string) {
  if (!p) throw new Error('Chemin vide')
  if (!fs.existsSync(p)) throw new Error('Fichier introuvable')
  setStoredPath(path.normalize(p))
}

