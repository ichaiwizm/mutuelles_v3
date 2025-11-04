/**
 * Logger Class
 */

import * as fs from 'fs';
import * as path from 'path';
import type { LogLevel, LogEntry, StepLogEntry, LoggerOptions } from './log-types';

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
