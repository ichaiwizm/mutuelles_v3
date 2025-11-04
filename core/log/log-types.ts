/**
 * Logger Types
 */

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
