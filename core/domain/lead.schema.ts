/**
 * Canonical Lead Data Schema (ISO, Strict)
 * ==========================================
 *
 * Single source of truth for lead data structure.
 *
 * Rules:
 * - Dates: YYYY-MM-DD (ISO 8601)
 * - Phone: E.164 format (+33...)
 * - Booleans: true booleans (not strings)
 * - No platformData in the lead (adapters handle platform-specific transformations)
 */

import { z } from 'zod';

/**
 * ISO Date validation (YYYY-MM-DD)
 */
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Date must be in YYYY-MM-DD format',
});

/**
 * E.164 Phone validation (+33...)
 */
const e164PhoneSchema = z.string().regex(/^\+\d{10,15}$/, {
  message: 'Phone must be in E.164 format (+33...)',
}).optional();

/**
 * Department code (01-99, 2A, 2B, 971-976)
 */
const departmentCodeSchema = z.union([
  z.number().int().min(1).max(99),
  z.string().regex(/^(0[1-9]|[1-8]\d|9[0-5]|2[AB]|97[1-6])$/),
]);

/**
 * Postal code (5 digits)
 */
const postalCodeSchema = z.string().regex(/^\d{5}$/, {
  message: 'Postal code must be 5 digits',
});

/**
 * Subscriber (main insured person)
 */
export const subscriberSchema = z.object({
  civility: z.enum(['MONSIEUR', 'MADAME']).optional(),
  lastName: z.string().min(1),
  firstName: z.string().min(1),
  birthDate: isoDateSchema,
  phoneE164: e164PhoneSchema,
  email: z.string().email().optional(),
  // Contact/location additions
  address: z.string().min(3).max(120).optional(),
  city: z.string().min(2).max(60).optional(),
  departmentCode: departmentCodeSchema.optional(), // Deprecated: Use postalCode instead (auto-extracted)
  postalCode: postalCodeSchema.optional(),
  regime: z.string().optional(),
  status: z.string().optional(),
  profession: z.string().optional(),
  category: z.string().optional(),
  workFramework: z.string().optional(),
  childrenCount: z.number().int().min(0).max(10).optional(),
});

/**
 * Spouse
 */
export const spouseSchema = z.object({
  civility: z.enum(['MONSIEUR', 'MADAME']).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  birthDate: isoDateSchema,
  regime: z.string().optional(),
  status: z.string().optional(),
  profession: z.string().optional(),
  category: z.string().optional(),
  workFramework: z.string().optional(),
});

/**
 * Child
 */
export const childSchema = z.object({
  birthDate: isoDateSchema,
  regime: z.string().optional(),
  ayantDroit: z.enum(['CLIENT', 'CONJOINT']).optional(),
});

/**
 * Project / Insurance needs
 */
export const projectSchema = z.object({
  name: z.string().optional(),
  dateEffet: isoDateSchema,
  plan: z.string().optional(),
  couverture: z.boolean().optional(),
  ij: z.boolean().optional(),
  // Parsed need levels (optional)
  medicalCareLevel: z.number().int().min(1).max(9).optional(),
  hospitalizationLevel: z.number().int().min(1).max(9).optional(),
  opticsLevel: z.number().int().min(1).max(9).optional(),
  dentalLevel: z.number().int().min(1).max(9).optional(),
  // Alternative nested container for levels, kept flexible and optional
  levels: z
    .object({
      medicalCare: z.number().int().min(1).max(9).optional(),
      hospitalization: z.number().int().min(1).max(9).optional(),
      optics: z.number().int().min(1).max(9).optional(),
      dental: z.number().int().min(1).max(9).optional(),
    })
    .partial()
    .optional(),
  simulationType: z.enum(['celibataire', 'couple']).optional(),
  madelin: z.boolean().optional(),
  resiliation: z.boolean().optional(),
  reprise: z.boolean().optional(),
  currentlyInsured: z.boolean().optional(),
});

/**
 * Complete Lead Data (canonical)
 */
export const leadDataSchema = z.object({
  subscriber: subscriberSchema,
  spouse: spouseSchema.optional(),
  children: z.array(childSchema).optional(),
  project: projectSchema,
});

/**
 * Full Lead with metadata
 */
export const leadSchema = z.object({
  id: z.string().uuid(),
  data: leadDataSchema,
  metadata: z.record(z.any()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Type exports (inferred from schemas)
 */
export type SubscriberInfo = z.infer<typeof subscriberSchema>;
export type SpouseInfo = z.infer<typeof spouseSchema>;
export type ChildInfo = z.infer<typeof childSchema>;
export type ProjectInfo = z.infer<typeof projectSchema>;
export type LeadData = z.infer<typeof leadDataSchema>;
export type Lead = z.infer<typeof leadSchema>;

/**
 * Validation helpers
 */
export function validateLeadData(data: unknown): LeadData {
  return leadDataSchema.parse(data);
}

export function validateLead(lead: unknown): Lead {
  return leadSchema.parse(lead);
}

export function isValidLeadData(data: unknown): data is LeadData {
  return leadDataSchema.safeParse(data).success;
}
