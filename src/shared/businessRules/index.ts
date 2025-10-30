/**
 * Business rules - Main entry point
 *
 * Exports computed value functions for reactive field calculations.
 */

export {
  computeDerivedFields,
  inferDepartment,
  computeMadelin,
  inferStatusFromRegime,
  inferStatusFromProfession,
  getFieldDependencies,
  getAffectedFields,
  type ComputedFieldsResult,
} from './computedValues'
