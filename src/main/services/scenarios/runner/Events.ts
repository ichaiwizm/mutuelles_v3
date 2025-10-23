import type { BrowserWindow } from 'electron'
import type { RunProgressEvent } from './types'

export function makeProgressSender(window: BrowserWindow | undefined, runId: string) {
  const send = (evt: RunProgressEvent) => {
    if (!window) {
      console.warn('[Runner] ⚠️  No sender for event:', evt.type, evt.itemId || '')
      return
    }
    try {
      window.webContents.send(`scenarios:progress:${runId}`, evt)
      const stepInfo =
        evt.currentStep !== undefined && evt.totalSteps !== undefined
          ? ` (step ${evt.currentStep}/${evt.totalSteps})`
          : ''
      console.log(`[Runner] ✅ Sent ${evt.type}${evt.itemId ? ' for ' + evt.itemId.slice(0, 8) : ''}${stepInfo}`)
    } catch (err) {
      console.error('[Runner] ❌ IPC send failed:', err, 'Event:', evt.type)
    }
  }
  return send
}

