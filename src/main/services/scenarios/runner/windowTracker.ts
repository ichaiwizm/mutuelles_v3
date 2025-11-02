import type { RunContext } from './types'

export function createWindowTracker(runContext: RunContext) {
  async function ensure(itemId: string) {
    const bc = runContext.activeBrowsers.get(itemId)
    if (!bc) return null
    try {
      const pages = bc.context?.pages?.() || []
      const page = pages[pages.length - 1] || (await bc.context.newPage())
      const browserSession = await bc.browser.newBrowserCDPSession()
      const pageSession = await bc.context.newCDPSession(page)
      const ti = await pageSession.send('Target.getTargetInfo').catch(() => null)
      const targetId = ti?.targetInfo?.targetId || ti?.targetId
      if (!targetId) return null
      const win = await browserSession.send('Browser.getWindowForTarget', { targetId }).catch(() => null)
      if (!win || typeof win.windowId !== 'number') return null
      const state = (win.bounds?.windowState as any) || 'normal'
      runContext.windowInfos.set(itemId, { windowId: win.windowId, state, targetId })
      return runContext.windowInfos.get(itemId)!
    } catch {
      return null
    }
  }
  async function track(itemId: string, browser: any, context: any) {
    try {
      // Ensure there is at least one page
      const page = context?.pages?.()[0] || (await context.newPage())
      if (!page) return

      await ensure(itemId)

      // Auto-minimize if configured
      if (runContext.displayMode === 'headless-minimized') {
        await new Promise(r => setTimeout(r, 150))
        await minimize(itemId).catch(() => false)
      }

      // Track new pages to keep windowId up-to-date
      try {
        context?.on?.('page', () => { void ensure(itemId) })
      } catch {}
    } catch {}
  }

  async function minimize(itemId: string) {
    let info = runContext.windowInfos.get(itemId) || await ensure(itemId)
    const bc = runContext.activeBrowsers.get(itemId)
    if (!info || !bc) return false
    try {
      const browserSession = await bc.browser.newBrowserCDPSession()
      await browserSession.send('Browser.setWindowBounds', {
        windowId: info.windowId,
        bounds: { windowState: 'minimized' }
      })
      info.state = 'minimized'
      return true
    } catch (e:any) {
      info = await ensure(itemId)
      if (!info) return false
      try {
        const browserSession = await bc.browser.newBrowserCDPSession()
        await browserSession.send('Browser.setWindowBounds', { windowId: info.windowId, bounds: { windowState: 'minimized' } })
        info.state = 'minimized'
        return true
      } catch { return false }
    }
  }

  async function restore(itemId: string) {
    let info = runContext.windowInfos.get(itemId) || await ensure(itemId)
    const bc = runContext.activeBrowsers.get(itemId)
    if (!info || !bc) return false
    try {
      const browserSession = await bc.browser.newBrowserCDPSession()
      await browserSession.send('Browser.setWindowBounds', {
        windowId: info.windowId,
        bounds: { windowState: 'normal' }
      })
      info.state = 'normal'
      // Bring front best-effort
      const page = bc.context?.pages?.()[0]
      if (page?.bringToFront) await page.bringToFront().catch(() => {})
      return true
    } catch (e:any) {
      info = await ensure(itemId)
      if (!info) return false
      try {
        const browserSession = await bc.browser.newBrowserCDPSession()
        await browserSession.send('Browser.setWindowBounds', { windowId: info.windowId, bounds: { windowState: 'normal' } })
        info.state = 'normal'
        const page = bc.context?.pages?.()[0]
        if (page?.bringToFront) await page.bringToFront().catch(() => {})
        return true
      } catch { return false }
    }
  }

  async function bringToFront(itemId: string) {
    const bc = runContext.activeBrowsers.get(itemId)
    const page = bc?.context?.pages?.()[0]
    if (!page) return false
    try {
      await page.bringToFront()
      return true
    } catch { return false }
  }

  async function getState(itemId: string) {
    const info = runContext.windowInfos.get(itemId) || await ensure(itemId)
    return info?.state || null
  }

  return { track, minimize, restore, bringToFront, getState }
}
