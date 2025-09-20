import { z } from 'zod'

export const PlatformStatus = z.enum(['ready', 'maintenance', 'building', 'deprecated'])
export type PlatformStatus = z.infer<typeof PlatformStatus>

export const PlatformPageType = z.enum(['login', 'quote_form', 'quote_result', 'dashboard', 'other'])
export type PlatformPageType = z.infer<typeof PlatformPageType>

export const FieldType = z.enum(['text','password','email','tel','number','select','checkbox','otp','totp_secret'])
export type FieldType = z.infer<typeof FieldType>

export const PlatformWithSelected = z.object({
  id: z.number().int().positive(),
  slug: z.string(),
  name: z.string(),
  status: PlatformStatus,
  base_url: z.string().optional().nullable(),
  website_url: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  selected: z.boolean()
})
export type PlatformWithSelected = z.infer<typeof PlatformWithSelected>

export const PlatformPage = z.object({
  id: z.number().int().positive(),
  platform_id: z.number().int().positive(),
  slug: z.string(),
  name: z.string(),
  type: PlatformPageType,
  url: z.string().optional().nullable(),
  status: PlatformStatus,
  order_index: z.number().int()
})
export type PlatformPage = z.infer<typeof PlatformPage>

export const PlatformField = z.object({
  id: z.number().int().positive(),
  page_id: z.number().int().positive(),
  key: z.string(),
  label: z.string(),
  type: FieldType,
  required: z.boolean(),
  secure: z.boolean(),
  order_index: z.number().int()
})
export type PlatformField = z.infer<typeof PlatformField>
