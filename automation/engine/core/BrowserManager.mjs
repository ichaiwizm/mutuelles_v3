import { chromium } from 'playwright-core'
import { createLogger } from '../utils/logger.mjs'

const logger = createLogger('BrowserManager')

export class BrowserManager {
  constructor({ chromePath, useChannel, videoDir }) {
    this.chromePath = chromePath
    this.useChannel = useChannel
    this.videoDir = videoDir
  }

  async launch(mode) {
    const headed = mode === 'dev' || mode === 'dev_private'
    const launchOpts = headed ? { headless: false, args: ['--incognito'] } : { headless: true }
    if (this.chromePath) launchOpts.executablePath = this.chromePath
    if (this.useChannel) launchOpts.channel = this.useChannel
    const browser = await chromium.launch(launchOpts)
    const ctxOpts = {}
    if (this.videoDir) ctxOpts.recordVideo = { dir: this.videoDir }
    const context = await browser.newContext(ctxOpts)
    let page = context.pages()[0] || (await context.newPage())
    page.setDefaultTimeout(15000)
    context.on('page', (p) => {
      try { page = p; page.setDefaultTimeout(15000) } catch (err) { logger.warn('[Browser] Failed to set timeout on new page:', err.message) }
    })
    return { browser, context, getPage: () => page }
  }
}

