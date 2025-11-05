/**
 * Form Data Transformer
 *
 * DEPRECATED: This file now re-exports functions from @shared/utils/leadFormData
 * to maintain backward compatibility. All transformation logic has been consolidated
 * in the shared module to avoid duplication and inconsistencies.
 *
 * Please import directly from '@shared/utils/leadFormData' in new code.
 */

export {
  transformToCleanLead,
  transformFromCleanLead
} from '@shared/utils/leadFormData'
