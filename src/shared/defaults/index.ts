/**
 * Unified defaults system - Main entry point
 *
 * This module exports the new simplified defaults system.
 * The old complex system (defaultEnricher, businessRules, types)
 * has been completely removed and replaced.
 */

// New simple defaults system
export {
  applyDefaults,
  getAllDefaults,
  type DomainSchema,
  type FieldSchema,
  type ApplyDefaultsOptions,
} from './simpleDefaults'

// Expression evaluation (kept from old system)
export {
  evaluateExpression,
  firstOfNextMonth,
  today,
  calculateAge,
  parseDate,
} from './expressions'

// Schema loading
export { loadDomainSchema, loadDomainSchemaFromData, getCachedSchema, clearSchemaCache } from './schemaLoader'
