/**
 * Notification Batcher (Renderer)
 * Batches failure notifications to avoid spam
 * Groups multiple failures within 10 seconds into a single notification
 */

import { createLogger } from './logger'

const logger = createLogger('NotificationBatcher')

interface FailureItem {
  leadName: string
  platform: string
  error?: string
}

class NotificationBatcher {
  private pendingFailures: FailureItem[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private readonly BATCH_DELAY_MS = 10000 // 10 seconds

  /**
   * Add a failure to the batch
   */
  addFailure(failure: FailureItem): void {
    this.pendingFailures.push(failure)

    // Clear existing timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
    }

    // Set new timer to send batch
    this.batchTimer = setTimeout(() => {
      this.sendBatch()
    }, this.BATCH_DELAY_MS)
  }

  /**
   * Send batched notifications immediately
   */
  private async sendBatch(): Promise<void> {
    if (this.pendingFailures.length === 0) {
      return
    }

    const failures = [...this.pendingFailures]
    this.pendingFailures = []
    this.batchTimer = null

    try {
      // Send to main process
      await window.api.sendFailureNotification(failures)
      // silent
    } catch (error) {
      logger.error('[NotificationBatcher] Failed to send notification:', error)
    }
  }

  /**
   * Flush pending notifications immediately (for cleanup)
   */
  async flush(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    await this.sendBatch()
  }
}

// Singleton instance
export const notificationBatcher = new NotificationBatcher()
