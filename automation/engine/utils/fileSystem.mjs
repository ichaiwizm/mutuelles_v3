import fs from 'node:fs'
import path from 'node:path'

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

export function writeJson(file, data) {
  ensureDir(path.dirname(file))
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
}

export function writeText(file, data) {
  ensureDir(path.dirname(file))
  fs.writeFileSync(file, data, 'utf-8')
}

export function appendText(file, data) {
  ensureDir(path.dirname(file))
  fs.appendFileSync(file, data, 'utf-8')
}
