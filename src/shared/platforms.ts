import { z } from 'zod'

export const PlatformSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(2),
  login_url: z.string().url().optional().or(z.literal(''))
})

export type Platform = z.infer<typeof PlatformSchema>

