import log from 'electron-log/renderer'

/**
 * Centralized logging service for the renderer process
 *
 * Log Levels:
 * - error: Critical errors (also shown to user via toast)
 * - warn: Warning messages for potential issues
 * - info: Informational messages about user actions
 * - debug: Detailed debug information (dev mode only)
 *
 * Logs are written to:
 * - Console (all levels in dev, info+ in production)
 * - File: logs/renderer.log (info+ level, sent to main process)
 */

// The renderer process uses electron-log/renderer which forwards to main process
const isDev = import.meta.env.DEV
log.transports.console.level = isDev ? 'debug' : 'info'

// Create scoped loggers for different components
export const createLogger = (scope: string) => {
  return {
    error: (message: string, ...args: unknown[]) => log.error(`[${scope}] ${message}`, ...args),
    warn: (message: string, ...args: unknown[]) => log.warn(`[${scope}] ${message}`, ...args),
    info: (message: string, ...args: unknown[]) => log.info(`[${scope}] ${message}`, ...args),
    debug: (message: string, ...args: unknown[]) => log.debug(`[${scope}] ${message}`, ...args),
  }
}

// Default export for renderer logger
export const logger = createLogger('Renderer')

export default log
