/**
 * Platform Selector Types
 * ========================
 *
 * Type definitions for platform-specific field selectors.
 */

/**
 * Value adapter function (e.g., dateIsoToFr)
 */
export type ValueAdapter = (value: any) => any;

/**
 * Selector definition for a single field
 */
export interface FieldSelector {
  /** CSS selector (string or function for dynamic index) */
  selector: string | ((index: number) => string);

  /** Value mapping (domain value -> platform value) */
  valueMap?: Record<string, any>;

  /** Value adapter function (applied after valueMap) */
  adapter?: ValueAdapter;

  /** Dynamic index support (for arrays like children) */
  dynamicIndex?: boolean;

  /** Additional metadata */
  meta?: {
    label?: string;
    notes?: string;
    required?: boolean;
  };
}

/**
 * Map of domain keys to selectors
 */
export interface SelectorMap {
  [domainKey: string]: FieldSelector;
}

/**
 * Platform configuration
 */
export interface PlatformConfig {
  /** Platform identifier */
  slug: string;

  /** Human-readable name */
  name: string;

  /** Base URL */
  baseUrl: string;

  /** Selector map */
  selectors: SelectorMap;

  /** Platform-specific notes */
  notes?: string;
}
