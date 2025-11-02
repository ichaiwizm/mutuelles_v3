/**
 * Logger for automation engine
 * Uses console for now but can be enhanced with file logging
 */

const isDev = process.env.NODE_ENV !== 'production'

export class Logger {
  constructor(scope) {
    this.scope = scope
  }

  _format(level, message, ...args) {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level}] [${this.scope}]`
    return args.length > 0 ? [prefix, message, ...args] : [prefix, message]
  }

  error(message, ...args) {
    console.error(...this._format('ERROR', message, ...args))
  }

  warn(message, ...args) {
    console.warn(...this._format('WARN', message, ...args))
  }

  info(message, ...args) {
    console.log(...this._format('INFO', message, ...args))
  }

  debug(message, ...args) {
    if (isDev) {
      console.log(...this._format('DEBUG', message, ...args))
    }
  }
}

export function createLogger(scope) {
  return new Logger(scope)
}
