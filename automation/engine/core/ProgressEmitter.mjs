import path from 'node:path'
import { appendText } from '../utils/fileSystem.mjs'

export class ProgressEmitter {
  constructor(runDir) {
    this.progressFile = path.join(runDir, 'progress.ndjson')
  }
  emit(evt) {
    try {
      const rec = { ts: new Date().toISOString(), ...evt }
      appendText(this.progressFile, JSON.stringify(rec) + '\n')
      console.log('[run]', evt.type, evt.status || '', evt.message || '')
    } catch (err) {
      console.error('[ProgressEmitter] Failed to write progress:', err?.message)
    }
  }
}

