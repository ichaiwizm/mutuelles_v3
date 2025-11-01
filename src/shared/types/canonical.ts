// Canonical domain types for Broker-Automation v2
// These types are the single source of truth used across UI, DB and workers.

export type Civility = 'mr' | 'mrs' | 'ms' | 'na'

export type Person = {
  civility?: Civility
  firstName?: string
  lastName?: string
  birthDate?: string // ISO or DD/MM/YYYY for display
}

export type Contact = {
  email?: string
  telephone?: string
  address1?: string
  address2?: string
  postalCode?: string
  city?: string
}

export type Need = {
  category: 'sante' | 'prevoyance' | 'epargne' | 'autre'
  product?: string
  details?: Record<string, any>
}

export type LeadGenerique = {
  id: string
  subscriber: Person
  spouse?: Person
  children?: Person[]
  contact?: Contact
  needs?: Need[]
  metadata?: Record<string, any>
  createdAt: string
  status?: 'new'|'in_progress'|'completed'|'partial_failure'|'awaiting_action'
}

export type TaskStatus = 'pending' | 'running' | 'success' | 'failed'

export type Task = {
  id: string
  leadId: string
  platform: string // e.g., 'swisslife', 'alptis'
  product: string // e.g., 'sante-pro', 'sante-plus'
  status: TaskStatus
  resultPath?: string | null
  logs?: string | null
  createdAt: string
  startedAt?: string | null
  finishedAt?: string | null
}

// Mapper output is a plain object whose structure depends on the product.
export type MappedData = Record<string, unknown>

// Quotes (Devis)
export type QuoteStatus = 'draft' | 'ready' | 'submitted' | 'priced' | 'won' | 'lost' | 'canceled'

export type Quote = {
  id: string
  leadId: string
  platform: string
  product: string
  status: QuoteStatus
  premium?: number | null
  currency?: 'EUR'
  createdAt: string
  updatedAt: string
  notes?: string | null
}
