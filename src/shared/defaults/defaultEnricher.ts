/**
 * Core default value enrichment logic
 *
 * This module provides the main API for generating and applying default values
 * to lead data, used by both email parsing and manual form filling.
 */

import {
  DefaultContext,
  DefaultsMap,
  DefaultValue,
  EnrichmentResult,
  ApplyDefaultsOptions,
} from './types';
import { evaluateExpression, firstOfNextMonth } from './expressions';
import { applyAllBusinessRules, shouldEnableMadelin } from './businessRules';

/**
 * Field schema definition (simplified from base.domain.json)
 */
interface FieldSchema {
  type: string;
  default?: any;
  defaultExpression?: string;
  defaultsByCarrier?: Record<string, any>;
  options?: Array<{ value: string; label: string }>;
  optionSets?: Record<string, Array<{ value: string; label: string }>>;
  repeat?: { key: string };
  disabled?: boolean;
}

/**
 * Domain schema (structure from base.domain.json)
 */
interface DomainSchema {
  [sectionName: string]: {
    [fieldName: string]: FieldSchema;
  };
}

/**
 * Create a default value with metadata
 */
function createDefault<T>(
  value: T,
  source: DefaultValue['metadata']['source'],
  confidence: DefaultValue['metadata']['confidence'],
  reason?: string
): DefaultValue<T> {
  return {
    value,
    metadata: {
      source,
      confidence,
      reason,
    },
  };
}

/**
 * Get the default value for a field from schema
 *
 * Priority order:
 * 1. defaultsByCarrier (if platform specified in context)
 * 2. defaultExpression (evaluated at runtime)
 * 3. default (static value)
 * 4. Intelligent fallback for select/radio fields
 *
 * @param field - Field schema
 * @param context - Default context
 * @returns Default value or null
 */
function getFieldDefault(field: FieldSchema, context: DefaultContext): any {
  // Priority 1: Carrier-specific default
  if (field.defaultsByCarrier && context.platform) {
    const carrierDefault = field.defaultsByCarrier[context.platform];
    if (carrierDefault !== undefined) {
      return createDefault(carrierDefault, 'schema', 'high', `Carrier-specific default for ${context.platform}`);
    }
  }

  // Priority 2: Dynamic expression
  if (field.defaultExpression) {
    const evaluated = evaluateExpression(field.defaultExpression);
    return createDefault(evaluated, 'expression', 'high', `Evaluated from expression: ${field.defaultExpression}`);
  }

  // Priority 3: Static default
  if (field.default !== undefined) {
    return createDefault(field.default, 'schema', 'high', 'Schema default value');
  }

  // Priority 4: Intelligent fallback for select/radio fields with options
  if (field.type === 'select' || field.type === 'radio') {
    let options = field.options;

    // Get carrier-specific option set if available
    if (field.optionSets && context.platform) {
      options = field.optionSets[context.platform] || options;
    }

    if (options && options.length > 0) {
      // Preferred values in order
      const preferredValues = [
        'SECURITE_SOCIALE',
        'CADRES',
        'SALARIE',
        'AUTRE',
      ];

      // Try to find a preferred value
      for (const preferred of preferredValues) {
        const found = options.find((opt) => opt.value === preferred);
        if (found) {
          return createDefault(found.value, 'fallback', 'low', `Preferred fallback: ${preferred}`);
        }
      }

      // Otherwise, use first option
      return createDefault(options[0].value, 'fallback', 'low', 'First available option');
    }
  }

  return null;
}

/**
 * Get static defaults from schema
 *
 * Reads default values from the domain schema for all fields.
 *
 * @param schema - Domain schema (from base.domain.json)
 * @param context - Default context
 * @returns Map of field names to default values
 */
export function getSchemaDefaults(
  schema: DomainSchema,
  context: DefaultContext
): Partial<DefaultsMap> {
  const defaults: Partial<DefaultsMap> = {};

  // Process each section (project, subscriber, spouse, children)
  for (const [sectionName, fields] of Object.entries(schema)) {
    for (const [fieldName, fieldSchema] of Object.entries(fields)) {
      // Skip disabled fields
      if (fieldSchema.disabled) {
        continue;
      }

      const fieldPath = sectionName === 'project' || sectionName === 'subscriber'
        ? `${sectionName}.${fieldName}`
        : sectionName === 'spouse'
        ? `spouse.${fieldName}`
        : fieldName; // children are handled separately

      const defaultValue = getFieldDefault(fieldSchema, context);
      if (defaultValue !== null) {
        defaults[fieldPath] = defaultValue;
      }
    }
  }

  return defaults;
}

/**
 * Get hardcoded defaults for fields not in schema
 *
 * These are the business defaults that should always apply
 * based on the user's choices.
 *
 * @param context - Default context
 * @returns Map of hardcoded defaults
 */
export function getHardcodedDefaults(context: DefaultContext): Partial<DefaultsMap> {
  const defaults: Partial<DefaultsMap> = {};

  // User's choice: Default status is TNS
  defaults['subscriber.status'] = createDefault(
    'TNS',
    'schema',
    'high',
    'Business default: TNS'
  );

  // User's choice: Default category is PERSONNES_SANS_ACTIVITE_PROFESSIONNELLE
  defaults['subscriber.category'] = createDefault(
    'PERSONNES_SANS_ACTIVITE_PROFESSIONNELLE',
    'schema',
    'high',
    'Business default'
  );

  // User's choice: Default civility
  defaults['subscriber.civility'] = createDefault(
    'MONSIEUR',
    'schema',
    'high',
    'Standard default'
  );

  // Project defaults
  defaults['project.dateEffet'] = createDefault(
    firstOfNextMonth(),
    'expression',
    'high',
    'First day of next month'
  );

  defaults['project.couverture'] = createDefault(
    true,
    'schema',
    'high',
    'Standard coverage enabled'
  );

  defaults['project.ij'] = createDefault(
    false,
    'schema',
    'high',
    'Daily allowances disabled by default'
  );

  defaults['project.resiliation'] = createDefault(
    false,
    'schema',
    'high',
    'No termination by default'
  );

  defaults['project.reprise'] = createDefault(
    false,
    'schema',
    'high',
    'No competitor takeover by default'
  );

  // Spouse defaults (if spouse exists in currentValues)
  defaults['spouse.civility'] = createDefault(
    'MADAME',
    'schema',
    'medium',
    'Standard spouse civility'
  );

  defaults['spouse.status'] = createDefault(
    'TNS',
    'schema',
    'medium',
    'Same as subscriber default'
  );

  defaults['spouse.category'] = createDefault(
    'PERSONNES_SANS_ACTIVITE_PROFESSIONNELLE',
    'schema',
    'medium',
    'Same as subscriber default'
  );

  // Children defaults
  defaults['children.ayantDroit'] = createDefault(
    '1',
    'schema',
    'high',
    'Default to subscriber (1)'
  );

  return defaults;
}

/**
 * Merge multiple default maps, with later maps taking precedence
 *
 * @param maps - Maps to merge (in order of increasing precedence)
 * @returns Merged map
 */
function mergeDefaultsMaps(...maps: Partial<DefaultsMap>[]): Partial<DefaultsMap> {
  const result: Partial<DefaultsMap> = {};

  for (const map of maps) {
    for (const [key, value] of Object.entries(map)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Set a nested property value using dot notation
 *
 * @param obj - Object to modify
 * @param path - Dot-separated path (e.g., 'subscriber.firstName')
 * @param value - Value to set
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    // Handle array notation like children[0]
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const arrayName = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);

      if (!current[arrayName]) {
        current[arrayName] = [];
      }
      if (!current[arrayName][index]) {
        current[arrayName][index] = {};
      }
      current = current[arrayName][index];
    } else {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
  }

  const lastPart = parts[parts.length - 1];
  current[lastPart] = value;
}

/**
 * Get a nested property value using dot notation
 *
 * @param obj - Object to read from
 * @param path - Dot-separated path
 * @returns Value or undefined
 */
function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    // Handle array notation
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const arrayName = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);
      current = current?.[arrayName]?.[index];
    } else {
      current = current?.[part];
    }

    if (current === undefined) {
      return undefined;
    }
  }

  return current;
}

/**
 * Check if a field should be skipped based on options
 *
 * @param fieldPath - Field path
 * @param options - Apply options
 * @returns true if should skip
 */
function shouldSkipField(fieldPath: string, options: ApplyDefaultsOptions): boolean {
  if (options.includeFields && !options.includeFields.includes(fieldPath)) {
    return true;
  }

  if (options.excludeFields && options.excludeFields.includes(fieldPath)) {
    return true;
  }

  return false;
}

/**
 * Enrich data with default values
 *
 * Main entry point for the default enrichment system.
 *
 * @param currentValues - Current form values
 * @param context - Context for default generation
 * @param schema - Optional domain schema (if not provided, uses hardcoded defaults)
 * @param options - Options for applying defaults
 * @returns Enrichment result with enriched data and metadata
 */
export function enrich(
  currentValues: Record<string, any>,
  context: DefaultContext,
  schema?: DomainSchema,
  options: ApplyDefaultsOptions = {}
): EnrichmentResult {
  // Start with current values
  const enrichedData = JSON.parse(JSON.stringify(currentValues));

  // Collect all defaults
  const schemaDefaults = schema ? getSchemaDefaults(schema, context) : {};
  const hardcodedDefaults = getHardcodedDefaults(context);
  const businessDefaults = applyAllBusinessRules(currentValues, context);

  // Merge: schema < hardcoded < business rules (business rules win)
  const allDefaults = mergeDefaultsMaps(schemaDefaults, hardcodedDefaults, businessDefaults);

  // Track which defaults were actually applied
  const defaultsApplied: DefaultsMap = {};
  const defaultedFields: string[] = [];

  // Apply defaults
  for (const [fieldPath, defaultValue] of Object.entries(allDefaults)) {
    if (!defaultValue) continue;

    // Check options
    if (shouldSkipField(fieldPath, options)) {
      continue;
    }

    // Check confidence level
    const minConfidence = options.minConfidence || 'low';
    const confidenceLevels = { high: 3, medium: 2, low: 1 };
    if (confidenceLevels[defaultValue.metadata.confidence] < confidenceLevels[minConfidence]) {
      continue;
    }

    // Check if field already has a value
    const existingValue = getNestedValue(enrichedData, fieldPath);
    const hasValue = existingValue !== undefined && existingValue !== null && existingValue !== '';

    if (hasValue && !options.overwriteExisting) {
      continue; // Don't overwrite existing values
    }

    // Apply the default
    setNestedValue(enrichedData, fieldPath, defaultValue.value);
    defaultsApplied[fieldPath] = defaultValue;
    defaultedFields.push(fieldPath);
  }

  return {
    enrichedData,
    defaultsApplied,
    defaultedFields,
  };
}

/**
 * Get all available defaults without applying them
 *
 * Useful for previewing what defaults would be applied.
 *
 * @param currentValues - Current form values
 * @param context - Context for default generation
 * @param schema - Optional domain schema
 * @returns Map of all available defaults
 */
export function getAllDefaults(
  currentValues: Record<string, any>,
  context: DefaultContext,
  schema?: DomainSchema
): Partial<DefaultsMap> {
  const schemaDefaults = schema ? getSchemaDefaults(schema, context) : {};
  const hardcodedDefaults = getHardcodedDefaults(context);
  const businessDefaults = applyAllBusinessRules(currentValues, context);

  return mergeDefaultsMaps(schemaDefaults, hardcodedDefaults, businessDefaults);
}
