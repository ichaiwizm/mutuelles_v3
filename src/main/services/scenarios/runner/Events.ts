import type { BrowserWindow } from 'electron'
import type { RunProgressEvent } from './types'
import { createLogger } from '../../logger'

const logger = createLogger('Events')

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
      logger.error('[Runner] ❌ IPC send failed:', err, 'Event:', evt.type)
    }
  }
  return send
}
