import type { BrowserWindow } from 'electron'
import type { RunProgressEvent } from './types'

export function makeProgressSender(window: BrowserWindow | undefined, runId: string) {
  const send = (evt: RunProgressEvent) => {
    if (!window) return
    try {
      window.webContents.send(`scenarios:progress:${runId}`, evt)
      const stepInfo =
        evt.currentStep !== undefined && evt.totalSteps !== undefined
          ? ` (step ${evt.currentStep}/${evt.totalSteps})`
          : ''
    } catch (err) {
      console.error('[Runner] ❌ IPC send failed:', err, 'Event:', evt.type)
    }
  }
  return send
}
