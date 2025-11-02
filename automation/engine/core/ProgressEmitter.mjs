import path from 'node:path'
import { appendText } from '../utils/fileSystem.mjs'
import { createLogger } from '../utils/logger.mjs'

const logger = createLogger('ProgressEmitter')

export class ProgressEmitter {
  constructor(runDir) {
    this.progressFile = path.join(runDir, 'progress.ndjson')
  }
  emit(evt) {
    try {
      const rec = { ts: new Date().toISOString(), ...evt }
      appendText(this.progressFile, JSON.stringify(rec) + '\n')
      logger.info(`[run] ${evt.type} ${evt.status || ''} ${evt.message || ''}`)
    } catch (err) {
      logger.error('Failed to write progress:', err?.message)
    }
  }
}

