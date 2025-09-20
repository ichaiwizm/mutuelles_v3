import fs from 'node:fs'
import path from 'node:path'
import { getChromePath as getStoredPath, setChromePath as setStoredPath } from './settings'

const winCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA || ''}/Google/Chrome/Application/chrome.exe`
]

export function detectChromePath(): string | undefined {
  for (const p of winCandidates) {
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

