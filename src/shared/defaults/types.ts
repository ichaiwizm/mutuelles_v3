/**
 * Types for the unified defaults system
 *
 * This module provides shared types for default value generation
 * used by both email parsing (backend) and manual form filling (frontend).
 */

/**
 * Context for default value generation
 */
export interface DefaultContext {
  /**
   * Source of the lead data
   * - 'email': Lead created from email import
   * - 'manual': Lead created manually by user
   */
  source: 'email' | 'manual';

  /**
   * Platform/carrier name (e.g., 'swisslifeone', 'alptis')
   */
  platform?: string;

  /**
   * Current values to consider when computing defaults
   * Used for conditional defaults (e.g., if status=TNS then madelin=true)
   */
  currentValues?: Record<string, any>;
}

/**
 * Confidence level for a default value
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Source of a default value
 */
export type DefaultSource = 'schema' | 'business_rule' | 'inference' | 'expression' | 'fallback';

/**
 * Metadata about how a default value was determined
 */
export interface DefaultMetadata {
  /**
   * How confident we are in this default
   */
  confidence: ConfidenceLevel;

  /**
   * Where this default came from
   */
  source: DefaultSource;

  /**
   * Optional human-readable reason for this default
   */
  reason?: string;
}

/**
 * A default value with its metadata
 */
export interface DefaultValue<T = any> {
  /**
   * The actual default value
   */
  value: T;

  /**
   * Metadata about this default
   */
  metadata: DefaultMetadata;
}

/**
 * Map of field names to their default values with metadata
 */
export interface DefaultsMap {
  [fieldName: string]: DefaultValue | undefined;
}

/**
 * Result of enriching data with defaults
 */
export interface EnrichmentResult {
  /**
   * The enriched data with defaults applied
   */
  enrichedData: Record<string, any>;

  /**
   * Map of which fields received default values
   */
  defaultsApplied: DefaultsMap;

  /**
   * List of field names that were defaulted
   */
  defaultedFields: string[];
}

/**
 * Options for applying defaults
 */
export interface ApplyDefaultsOptions {
  /**
   * Only apply defaults to these fields (if specified)
   */
  includeFields?: string[];

  /**
   * Never apply defaults to these fields
   */
  excludeFields?: string[];

  /**
   * Whether to overwrite existing values
   * @default false
   */
  overwriteExisting?: boolean;

  /**
   * Minimum confidence level required to apply a default
   * @default 'low'
   */
  minConfidence?: ConfidenceLevel;
}

/**
 * Business rule function signature
 * Takes current values and context, returns defaults to apply
 */
export type BusinessRule = (
  currentValues: Record<string, any>,
  context: DefaultContext
) => Partial<DefaultsMap>;
