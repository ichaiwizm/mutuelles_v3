import { Notification, BrowserWindow } from 'electron'

export interface FailureNotification {
  leadName: string
  platform: string
  error?: string
}

export function sendFailureNotification(
  failures: FailureNotification[],
  window?: BrowserWindow
): void {
  if (failures.length === 0) {
    return
  }

  const isAppFocused = window?.isFocused() ?? false

  const body = failures
    .slice(0, 5) // Limit to 5 items
    .map(f => `• ${f.leadName} (${f.platform})`)
    .join('\n')

  const title = failures.length === 1
    ? '⚠️ Échec détecté'
    : `⚠️ ${failures.length} échecs détectés`

  const notification = new Notification({
    title,
    body: failures.length > 5
      ? `${body}\n... et ${failures.length - 5} autres`
      : body,
    silent: isAppFocused, // Silent if app is focused
    urgency: 'normal',
    timeoutType: 'default'
  })

  notification.show()

  notification.on('click', () => {
    if (window) {
      if (window.isMinimized()) {
        window.restore()
      }
      window.focus()
    }
  })
}
