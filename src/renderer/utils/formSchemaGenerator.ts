/**
 * Form schema generator (v2 - Zod-based)
 *
 * This file provides backward compatibility with the old formSchemaGenerator.ts
 * while using the new Zod-based form generation system.
 */

export {
  type FormFieldDefinition,
  type FormSchema,
  generateFormSchema,
  shouldShowField,
  getFieldDefault,
} from '@shared/domain/form-generator'
