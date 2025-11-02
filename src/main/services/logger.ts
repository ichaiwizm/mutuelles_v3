import log from 'electron-log'
import path from 'path'
import { app } from 'electron'

/**
 * Centralized logging service for the main process
 *
 * Log Levels:
 * - error: Critical errors that need immediate attention
 * - warn: Warning messages for potential issues
 * - info: Informational messages about application state
 * - debug: Detailed debug information (dev mode only)
 *
 * Logs are written to:
 * - Console (all levels in dev, info+ in production)
 * - File: logs/main.log (info+ level, 10MB rotation)
 */

// Configure file transport
log.transports.file.level = 'info'
log.transports.file.maxSize = 10 * 1024 * 1024 // 10MB
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'
log.transports.file.resolvePathFn = () => {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'logs', 'main.log')
}

// Configure console transport based on environment
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
log.transports.console.level = isDev ? 'debug' : 'info'
log.transports.console.format = '[{level}] {text}'

// Create scoped loggers for different modules
export const createLogger = (scope: string) => {
  return {
    error: (message: string, ...args: unknown[]) => log.error(`[${scope}] ${message}`, ...args),
    warn: (message: string, ...args: unknown[]) => log.warn(`[${scope}] ${message}`, ...args),
    info: (message: string, ...args: unknown[]) => log.info(`[${scope}] ${message}`, ...args),
    debug: (message: string, ...args: unknown[]) => log.debug(`[${scope}] ${message}`, ...args),
  }
}

// Default export for main logger
export const logger = createLogger('Main')

export default log
