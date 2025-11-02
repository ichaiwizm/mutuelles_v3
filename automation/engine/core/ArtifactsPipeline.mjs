import path from 'node:path'
import { ScreenshotManager } from '../artifacts/ScreenshotManager.mjs'
import { DomCollector } from '../artifacts/DomCollector.mjs'
import { createLogger } from '../utils/logger.mjs'

const logger = createLogger('ArtifactsPipeline')

export class ArtifactsPipeline {
  constructor({ runDir, domDir, screenshotsDir, traceDir }) {
    this.runDir = runDir
    this.domDir = domDir
    this.screenshotsDir = screenshotsDir
    this.traceDir = traceDir
    this.screens = new ScreenshotManager()
    this.dom = new DomCollector()
  }

  async onStepOk({ page, index, step, domMode, a11y, getShotName, activeContext }) {
    const shotPath = path.join(this.screenshotsDir, getShotName())
    await this.screens.capture(page, shotPath)
    await this.dom.maybeCollect(activeContext, index, step, this.domDir, domMode, a11y, false)
    return shotPath
  }

  async onStepError({ page, index, step, domMode, a11y, getErrName, activeContext }) {
    const errPath = path.join(this.screenshotsDir, getErrName())
    try { await this.screens.capture(page, errPath) } catch (screenshotErr) { logger.warn('[Screenshot] Failed to capture error screenshot:', screenshotErr.message) }
    await this.dom.maybeCollect(activeContext, index, step, this.domDir, domMode, a11y, true)
    return errPath
  }
}

