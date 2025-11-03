/**
 * Core Module - v2 Architecture
 * ==============================
 *
 * Clean, dev-oriented architecture for leads and flows automation.
 *
 * Principles:
 * - Canonical data (ISO dates, E.164 phones, true booleans)
 * - Single source of truth (domain model)
 * - Typed TypeScript (no magic JSON)
 * - Unified condition language (when)
 * - Structured logs (NDJSON)
 * - Fingerprint-based deduplication
 */

export * from './domain';
export * from './dsl';
export * from './adapters';
export * from './log';
export * from './resolve';
