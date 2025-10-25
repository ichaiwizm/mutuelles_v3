import type { RunContext } from './types'

export function createWindowTracker(runContext: RunContext) {
  async function ensure(itemId: string) {
    const bc = runContext.activeBrowsers.get(itemId)
    if (!bc) { console.log('[WindowTracker] ensure: no active browser for item', itemId); return null }
    try {
      const pages = bc.context?.pages?.() || []
      const page = pages[pages.length - 1] || (await bc.context.newPage())
      const browserSession = await bc.browser.newBrowserCDPSession()
      const pageSession = await bc.context.newCDPSession(page)
      const ti = await pageSession.send('Target.getTargetInfo').catch((e:any)=>{ console.log('[WindowTracker] ensure getTargetInfo error', e?.message); return null })
      const targetId = ti?.targetInfo?.targetId || ti?.targetId
      if (!targetId) { console.log('[WindowTracker] ensure: no targetId'); return null }
      const win = await browserSession.send('Browser.getWindowForTarget', { targetId }).catch((e:any)=>{ console.log('[WindowTracker] ensure getWindowForTarget error', e?.message); return null })
      if (!win || typeof win.windowId !== 'number') { console.log('[WindowTracker] ensure: no windowId'); return null }
      const state = (win.bounds?.windowState as any) || 'normal'
      runContext.windowInfos.set(itemId, { windowId: win.windowId, state, targetId })
      console.log('[WindowTracker] ensure ok', { itemId, windowId: win.windowId, state })
      return runContext.windowInfos.get(itemId)!
    } catch (e:any) {
      console.log('[WindowTracker] ensure exception', e?.message)
      return null
    }
  }
  async function track(itemId: string, browser: any, context: any) {
    try {
      console.log('[WindowTracker] track start', { itemId, displayMode: runContext.displayMode })
      // Ensure there is at least one page
      const page = context?.pages?.()[0] || (await context.newPage())
      if (!page) return

      const info = await ensure(itemId)
      if (info) console.log('[WindowTracker] tracked', { itemId, windowId: info.windowId, state: info.state })

      // Auto-minimize if configured
      if (runContext.displayMode === 'headless-minimized') {
        await new Promise(r => setTimeout(r, 150))
        const ok = await minimize(itemId).catch(() => false)
        console.log('[WindowTracker] auto-minimize', { itemId, ok })
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
      console.log('[WindowTracker] minimize req', { itemId, info })
      const browserSession = await bc.browser.newBrowserCDPSession()
      await browserSession.send('Browser.setWindowBounds', {
        windowId: info.windowId,
        bounds: { windowState: 'minimized' }
      })
      info.state = 'minimized'
      console.log('[WindowTracker] minimized', { itemId, windowId: info.windowId })
      return true
    } catch (e:any) {
      console.log('[WindowTracker] minimize failed, retry ensure', e?.message)
      info = await ensure(itemId)
      if (!info) return false
      try {
        const browserSession = await bc.browser.newBrowserCDPSession()
        await browserSession.send('Browser.setWindowBounds', { windowId: info.windowId, bounds: { windowState: 'minimized' } })
        info.state = 'minimized'
        console.log('[WindowTracker] minimized (retry)', { itemId, windowId: info.windowId })
        return true
      } catch { return false }
    }
  }

  async function restore(itemId: string) {
    let info = runContext.windowInfos.get(itemId) || await ensure(itemId)
    const bc = runContext.activeBrowsers.get(itemId)
    if (!info || !bc) return false
    try {
      console.log('[WindowTracker] restore req', { itemId, info })
      const browserSession = await bc.browser.newBrowserCDPSession()
      await browserSession.send('Browser.setWindowBounds', {
        windowId: info.windowId,
        bounds: { windowState: 'normal' }
      })
      info.state = 'normal'
      // Bring front best-effort
      const page = bc.context?.pages?.()[0]
      if (page?.bringToFront) await page.bringToFront().catch((e: any) => console.log('[WindowTracker] bringToFront error', e?.message))
      console.log('[WindowTracker] restored', { itemId, windowId: info.windowId })
      return true
    } catch (e:any) {
      console.log('[WindowTracker] restore failed, retry ensure', e?.message)
      info = await ensure(itemId)
      if (!info) return false
      try {
        const browserSession = await bc.browser.newBrowserCDPSession()
        await browserSession.send('Browser.setWindowBounds', { windowId: info.windowId, bounds: { windowState: 'normal' } })
        info.state = 'normal'
        const page = bc.context?.pages?.()[0]
        if (page?.bringToFront) await page.bringToFront().catch((e: any) => console.log('[WindowTracker] bringToFront error (retry)', e?.message))
        console.log('[WindowTracker] restored (retry)', { itemId, windowId: info.windowId })
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
