/**
 * Logger Utilities
 */

import * as fs from 'fs';
import type { LogEntry, StepLogEntry, LoggerOptions } from './log-types';
import { Logger } from './logger-class';

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
