/**
 * Structured Logger (NDJSON)
 * ===========================
 *
 * Logs step-by-step execution in NDJSON format for easy parsing and analysis.
 *
 * Format (one line per step):
 * {"ts":"2025-11-03T19:21:10Z","run":"slsis-20251103-192110-abc123","item":"...","idx":7,
 *  "type":"select","field":"subscriber.regime","selector":"#regime-social-assure-principal",
 *  "raw":"TNS","mapped":"TNS","ok":true,"ms":184}
 *
 * Levels: debug, info, warn, error, step
 */

import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'step';

export interface StepLogEntry {
  ts: string; // ISO timestamp
  run: string; // Run ID
  item?: string; // Item ID (lead_id + platform + flow)
  idx: number; // Step index
  type: string; // Step type
  field?: string; // Domain field key
  selector?: string; // CSS selector used
  raw?: any; // Raw value from lead data
  mapped?: any; // Mapped value (after valueMap)
  action?: string; // Action performed (fill, click, select, etc.)
  ok: boolean; // Success status
  ms: number; // Duration in milliseconds
  error?: string; // Error message if failed
  screenshot?: string; // Screenshot path
}

export interface LogEntry {
  ts: string;
  level: LogLevel;
  run?: string;
  item?: string;
  message: string;
  [key: string]: any;
}

export interface LoggerOptions {
  level?: LogLevel;
  outputPath?: string; // File path for NDJSON output
  pretty?: boolean; // Pretty-print for dev (not NDJSON)
}

export class Logger {
  private level: LogLevel;
  private outputPath?: string;
  private outputStream?: fs.WriteStream;
  private pretty: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || 'info';
    this.outputPath = options.outputPath;
    this.pretty = options.pretty || false;

    if (this.outputPath) {
      const dir = path.dirname(this.outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.outputStream = fs.createWriteStream(this.outputPath, { flags: 'a' });
    }
  }

  private write(entry: LogEntry | StepLogEntry): void {
    const line = this.pretty
      ? JSON.stringify(entry, null, 2)
      : JSON.stringify(entry);

    if (this.outputStream) {
      this.outputStream.write(line + '\n');
    } else {
      console.log(line);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'step'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      this.write({
        ts: new Date().toISOString(),
        level: 'debug',
        message,
        ...meta,
      });
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      this.write({
        ts: new Date().toISOString(),
        level: 'info',
        message,
        ...meta,
      });
    }
  }

  warn(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('warn')) {
      this.write({
        ts: new Date().toISOString(),
        level: 'warn',
        message,
        ...meta,
      });
    }
  }

  error(message: string, error?: Error | string, meta?: Record<string, any>): void {
    if (this.shouldLog('error')) {
      this.write({
        ts: new Date().toISOString(),
        level: 'error',
        message,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        ...meta,
      });
    }
  }

  /**
   * Log a step execution (most important log type)
   */
  step(entry: Omit<StepLogEntry, 'ts'>): void {
    this.write({
      ts: new Date().toISOString(),
      ...entry,
    });
  }

  close(): void {
    if (this.outputStream) {
      this.outputStream.end();
    }
  }
}

/**
 * Create a logger instance
 */
export function createLogger(runId: string, options: LoggerOptions = {}): Logger {
  const defaultPath = options.outputPath || `logs/runs/${runId}.ndjson`;
  return new Logger({ ...options, outputPath: defaultPath });
}

/**
 * Parse NDJSON log file
 */
export function parseLogFile(filePath: string): (LogEntry | StepLogEntry)[] {
  const content = fs.readFileSync(filePath, 'utf8');
  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

/**
 * Filter step logs only
 */
export function filterStepLogs(logs: (LogEntry | StepLogEntry)[]): StepLogEntry[] {
  return logs.filter((log) => 'idx' in log && 'type' in log) as StepLogEntry[];
}

/**
 * Calculate total duration from step logs
 */
export function calculateTotalDuration(stepLogs: StepLogEntry[]): number {
  return stepLogs.reduce((sum, log) => sum + log.ms, 0);
}

/**
 * Count errors in step logs
 */
export function countErrors(stepLogs: StepLogEntry[]): number {
  return stepLogs.filter((log) => !log.ok).length;
}
