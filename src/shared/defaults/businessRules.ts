/**
 * Business rules for intelligent default value computation
 *
 * This module contains the business logic for conditional defaults
 * that depend on other field values or context.
 */

import { DefaultsMap, DefaultContext, DefaultValue } from './types';
import { calculateAge } from './expressions';

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
 * Infer department code from postal code
 *
 * French postal codes follow the pattern: DDDXX where DDD is the department code
 * Special cases:
 * - Corsica: 2A (20000-20199), 2B (20200-20999)
 * - Overseas: 97X (971-978)
 *
 * @param postalCode - French postal code (5 digits)
 * @returns Department code or null if invalid
 */
export function inferDepartmentFromPostalCode(postalCode: string): string | null {
  if (!postalCode || typeof postalCode !== 'string') {
    return null;
  }

  const cleanCode = postalCode.trim().replace(/\s/g, '');

  // Must be 5 digits
  if (!/^\d{5}$/.test(cleanCode)) {
    return null;
  }

  const firstTwo = cleanCode.substring(0, 2);
  const firstThree = cleanCode.substring(0, 3);

  // Overseas departments (97X)
  if (firstThree.startsWith('97')) {
    return firstThree;
  }

  // Corsica
  if (firstTwo === '20') {
    const code = parseInt(cleanCode, 10);
    if (code >= 20000 && code <= 20199) {
      return '2A';
    } else if (code >= 20200 && code <= 20999) {
      return '2B';
    }
  }

  // Standard departments (01-95)
  return firstTwo;
}

/**
 * Rule: Determine if madelin deduction should be enabled
 *
 * Madelin deduction is available for:
 * - TNS (Travailleur Non Salarié)
 * - Exploitant Agricole
 * - Age < 70 years
 *
 * @param currentValues - Current form values
 * @returns true if madelin should be enabled
 */
export function shouldEnableMadelin(currentValues: Record<string, any>): boolean {
  const status = currentValues.subscriber?.status || currentValues.status;
  const birthDate = currentValues.subscriber?.birthDate || currentValues.birthDate;

  // Madelin only applies to TNS and EXPLOITANT_AGRICOLE
  const eligibleStatus = status === 'TNS' || status === 'EXPLOITANT_AGRICOLE';

  if (!eligibleStatus) {
    return false;
  }

  // Check age constraint (< 70 years)
  if (birthDate) {
    const age = calculateAge(birthDate);
    if (age !== null && age >= 70) {
      return false; // Too old for madelin
    }
  }

  return true;
}

/**
 * Rule: Infer status from regime
 *
 * If regime is TNS, status should be TNS
 */
export function inferStatusFromRegime(regime: string): string | null {
  if (regime === 'TNS') {
    return 'TNS';
  }
  return null;
}

/**
 * Rule: Infer status from profession
 *
 * Detects specific professions that indicate employment status
 */
export function inferStatusFromProfession(profession: string): string | null {
  if (!profession || typeof profession !== 'string') {
    return null;
  }

  const lowerProf = profession.toLowerCase();

  if (lowerProf.includes('agricole') || lowerProf.includes('agriculteur')) {
    return 'EXPLOITANT_AGRICOLE';
  }

  if (
    lowerProf.includes('indépendant') ||
    lowerProf.includes('tns') ||
    lowerProf.includes('libéral')
  ) {
    return 'TNS';
  }

  return null;
}

/**
 * Apply business rules to subscriber data
 *
 * @param currentValues - Current subscriber values
 * @param context - Default context
 * @returns Defaults to apply
 */
export function applySubscriberRules(
  currentValues: Record<string, any>,
  context: DefaultContext
): Partial<DefaultsMap> {
  const defaults: Partial<DefaultsMap> = {};
  const subscriberData = currentValues.subscriber || currentValues;

  // Infer department from postal code
  const postalCode = subscriberData.postalCode;
  if (postalCode && !subscriberData.departmentCode) {
    const department = inferDepartmentFromPostalCode(postalCode);
    if (department) {
      defaults['subscriber.departmentCode'] = createDefault(
        department,
        'inference',
        'high',
        `Inferred from postal code ${postalCode}`
      );
    }
  }

  // Infer status from regime
  const regime = subscriberData.regime;
  if (regime && !subscriberData.status) {
    const inferredStatus = inferStatusFromRegime(regime);
    if (inferredStatus) {
      defaults['subscriber.status'] = createDefault(
        inferredStatus,
        'business_rule',
        'medium',
        `Inferred from regime ${regime}`
      );
    }
  }

  // Infer status from profession
  const profession = subscriberData.profession;
  if (profession && !subscriberData.status) {
    const inferredStatus = inferStatusFromProfession(profession);
    if (inferredStatus) {
      defaults['subscriber.status'] = createDefault(
        inferredStatus,
        'business_rule',
        'medium',
        `Inferred from profession ${profession}`
      );
    }
  }

  return defaults;
}

/**
 * Apply business rules to project data
 *
 * @param currentValues - Current form values
 * @param context - Default context
 * @returns Defaults to apply
 */
export function applyProjectRules(
  currentValues: Record<string, any>,
  context: DefaultContext
): Partial<DefaultsMap> {
  const defaults: Partial<DefaultsMap> = {};

  // Madelin rule: true if TNS + age < 70
  const shouldHaveMadelin = shouldEnableMadelin(currentValues);
  defaults['project.madelin'] = createDefault(
    shouldHaveMadelin,
    'business_rule',
    'high',
    shouldHaveMadelin
      ? 'Enabled for TNS/Exploitant under 70 years'
      : 'Disabled (not TNS or age >= 70)'
  );

  return defaults;
}

/**
 * Apply business rules to spouse data
 *
 * @param currentValues - Current spouse values
 * @param context - Default context
 * @returns Defaults to apply
 */
export function applySpouseRules(
  currentValues: Record<string, any>,
  context: DefaultContext
): Partial<DefaultsMap> {
  const defaults: Partial<DefaultsMap> = {};
  const spouseData = currentValues.spouse || {};

  // Infer department from postal code
  const postalCode = spouseData.postalCode;
  if (postalCode && !spouseData.departmentCode) {
    const department = inferDepartmentFromPostalCode(postalCode);
    if (department) {
      defaults['spouse.departmentCode'] = createDefault(
        department,
        'inference',
        'high',
        `Inferred from postal code ${postalCode}`
      );
    }
  }

  // Infer status from regime
  const regime = spouseData.regime;
  if (regime && !spouseData.status) {
    const inferredStatus = inferStatusFromRegime(regime);
    if (inferredStatus) {
      defaults['spouse.status'] = createDefault(
        inferredStatus,
        'business_rule',
        'medium',
        `Inferred from regime ${regime}`
      );
    }
  }

  return defaults;
}

/**
 * Apply business rules to child data
 *
 * @param childData - Current child values
 * @param childIndex - Index of the child
 * @param context - Default context
 * @returns Defaults to apply
 */
export function applyChildRules(
  childData: Record<string, any>,
  childIndex: number,
  context: DefaultContext
): Partial<DefaultsMap> {
  const defaults: Partial<DefaultsMap> = {};

  // Infer department from postal code
  const postalCode = childData.postalCode;
  if (postalCode && !childData.departmentCode) {
    const department = inferDepartmentFromPostalCode(postalCode);
    if (department) {
      defaults[`children[${childIndex}].departmentCode`] = createDefault(
        department,
        'inference',
        'high',
        `Inferred from postal code ${postalCode}`
      );
    }
  }

  return defaults;
}

/**
 * Apply all business rules to the current values
 *
 * @param currentValues - Current form values
 * @param context - Default context
 * @returns All defaults from business rules
 */
export function applyAllBusinessRules(
  currentValues: Record<string, any>,
  context: DefaultContext
): Partial<DefaultsMap> {
  const defaults: Partial<DefaultsMap> = {};

  // Apply subscriber rules
  Object.assign(defaults, applySubscriberRules(currentValues, context));

  // Apply project rules
  Object.assign(defaults, applyProjectRules(currentValues, context));

  // Apply spouse rules if spouse exists
  if (currentValues.spouse) {
    Object.assign(defaults, applySpouseRules(currentValues, context));
  }

  // Apply child rules for each child
  if (Array.isArray(currentValues.children)) {
    currentValues.children.forEach((child, index) => {
      Object.assign(defaults, applyChildRules(child, index, context));
    });
  }

  return defaults;
}
