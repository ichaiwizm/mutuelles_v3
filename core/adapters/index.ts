/**
 * Adapters Module
 * ================
 *
 * Converts data between canonical ISO format and platform-specific formats.
 *
 * Exports:
 * - Date converters (ISO <-> DD/MM/YYYY, MM/DD/YYYY)
 * - Phone converters (E.164 <-> national formats)
 * - Validation helpers
 */

export * from './date';
export * from './phone';
