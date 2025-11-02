import type { RunContext } from './types'
import { createLogger } from '../../logger'

const logger = createLogger('BrowserTracker')

export function createBrowserTracker(runContext: RunContext) {
  function track(itemId: string, browser: any, context: any) {
    try {
      runContext.activeBrowsers.set(itemId, { browser, context, itemId })
    } catch {}
  }

  async function closeAll() {
    const entries = Array.from(runContext.activeBrowsers.entries())
    for (const [itemId, { browser, context }] of entries) {
      try {
        if (context && typeof context.close === 'function') {
          await context.close().catch((err: any) => logger.debug('[Runner] Context close error:', err?.message))
        }
        if (browser && typeof browser.close === 'function') {
          await browser.close().catch((err: any) => logger.debug('[Runner] Browser close error:', err?.message))
        }
      } catch (err) {
        logger.debug(`[Runner] Failed to close browser for ${itemId}:`, err instanceof Error ? err.message : err)
      }
    }
    runContext.activeBrowsers.clear()
  }

  async function closeOne(itemId: string) {
    const entry = runContext.activeBrowsers.get(itemId)
    if (!entry) return
    const { browser, context } = entry
    try {
      if (context && typeof context.close === 'function') {
        await context.close().catch((err: any) => logger.debug('[Runner] Context close error (one):', err?.message))
      }
      if (browser && typeof browser.close === 'function') {
        await browser.close().catch((err: any) => logger.debug('[Runner] Browser close error (one):', err?.message))
      }
    } catch (err) {
      logger.debug(`[Runner] Failed to close browser for ${itemId}:`, err instanceof Error ? err.message : err)
    } finally {
      runContext.activeBrowsers.delete(itemId)
    }
  }

  function untrack(itemId: string) {
    runContext.activeBrowsers.delete(itemId)
  }

  return { track, closeAll, closeOne, untrack }
}
