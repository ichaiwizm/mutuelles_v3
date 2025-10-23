/**
 * Notification Service (Main Process)
 * Handles desktop notifications for execution failures
 */

import { Notification, BrowserWindow } from 'electron'

export interface FailureNotification {
  leadName: string
  platform: string
  error?: string
}

/**
 * Send grouped failure notification
 */
export function sendFailureNotification(
  failures: FailureNotification[],
  window?: BrowserWindow
): void {
  if (failures.length === 0) {
    return
  }

  // Check if app is focused
  const isAppFocused = window?.isFocused() ?? false

  // Build notification body
  const body = failures
    .slice(0, 5) // Limit to 5 items
    .map(f => `• ${f.leadName} (${f.platform})`)
    .join('\n')

  const title = failures.length === 1
    ? '⚠️ Échec détecté'
    : `⚠️ ${failures.length} échecs détectés`

  // Create notification
  const notification = new Notification({
    title,
    body: failures.length > 5
      ? `${body}\n... et ${failures.length - 5} autres`
      : body,
    silent: isAppFocused, // Silent if app is focused
    urgency: 'normal',
    timeoutType: 'default'
  })

  // Show notification
  notification.show()

  // Focus window on click
  notification.on('click', () => {
    if (window) {
      if (window.isMinimized()) {
        window.restore()
      }
      window.focus()
    }
  })

  // silent
}
