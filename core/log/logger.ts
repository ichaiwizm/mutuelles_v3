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

export * from './log-types';
export * from './logger-class';
export * from './logger-utils';
