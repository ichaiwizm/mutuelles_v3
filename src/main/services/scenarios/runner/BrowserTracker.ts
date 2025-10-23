import type { RunContext } from './types'

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
      // silent
        if (context && typeof context.close === 'function') {
          await context.close().catch((err: any) => console.debug('[Runner] Context close error:', err?.message))
        }
        if (browser && typeof browser.close === 'function') {
          await browser.close().catch((err: any) => console.debug('[Runner] Browser close error:', err?.message))
        }
      } catch (err) {
        console.debug(`[Runner] Failed to close browser for ${itemId}:`, err instanceof Error ? err.message : err)
      }
    }
    runContext.activeBrowsers.clear()
  }

  function untrack(itemId: string) {
    runContext.activeBrowsers.delete(itemId)
  }

  return { track, closeAll, untrack }
}
