/**
 * Unified Default Values System
 *
 * This module provides a single source of truth for default values
 * used across both email import (backend) and manual form filling (frontend).
 *
 * @module shared/defaults
 *
 * @example
 * ```typescript
 * import { enrich, getAllDefaults } from '@/shared/defaults';
 *
 * // Enrich lead data with defaults
 * const result = enrich(
 *   currentValues,
 *   { source: 'email', platform: 'swisslifeone' }
 * );
 *
 * // Get available defaults without applying
 * const defaults = getAllDefaults(
 *   currentValues,
 *   { source: 'manual', platform: 'alptis' }
 * );
 * ```
 */

// Re-export main API
export {
  enrich,
  getAllDefaults,
  getSchemaDefaults,
  getHardcodedDefaults,
} from './defaultEnricher';

// Re-export business rules
export {
  shouldEnableMadelin,
  inferDepartmentFromPostalCode,
  inferStatusFromRegime,
  inferStatusFromProfession,
  applySubscriberRules,
  applyProjectRules,
  applySpouseRules,
  applyChildRules,
  applyAllBusinessRules,
} from './businessRules';

// Re-export expressions
export {
  firstOfNextMonth,
  today,
  parseDate,
  calculateAge,
  evaluateExpression,
} from './expressions';

// Re-export all types
export type {
  DefaultContext,
  DefaultValue,
  DefaultsMap,
  DefaultMetadata,
  EnrichmentResult,
  ApplyDefaultsOptions,
  BusinessRule,
  ConfidenceLevel,
  DefaultSource,
} from './types';
