import type { LeadGenerique } from '../../shared/types/canonical'

export function toLeadGenerique(input: any): LeadGenerique {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const out: LeadGenerique = {
    id,
    subscriber: {
      firstName: input?.subscriber?.firstName,
      lastName: input?.subscriber?.lastName,
      birthDate: input?.subscriber?.birthDate,
    },
    contact: {
      email: input?.subscriber?.email,
      telephone: input?.subscriber?.telephone,
      postalCode: input?.subscriber?.postalCode,
      city: input?.subscriber?.city,
    },
    needs: input?.needs || [],
    metadata: { source: 'parser' },
    createdAt: now,
  }
  return out
}

