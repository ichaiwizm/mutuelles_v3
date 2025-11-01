import type { LeadGenerique, Person, Task, TaskStatus, Quote, QuoteStatus } from '../types/canonical'

const FIRST_NAMES = ['Alex', 'Marie', 'Luc', 'Sophie', 'Adam', 'Lina', 'Hugo', 'Chloe', 'Paul', 'Nina']
const LAST_NAMES = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau']
const DOMAINS = ['gmail.com', 'outlook.com', 'orange.fr', 'yahoo.fr']
const FOLDERS = ['Nouveaux', 'En cours', 'Gagnés', 'Perdus', 'Archives'] as const
const PLATFORMS = ['swisslife', 'alptis', 'april', 'axa']
const PRODUCTS = ['sante-pro', 'sante-plus', 'prevoyance', 'epargne']

function rnd<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickStatus(): TaskStatus {
  const r = Math.random()
  if (r < 0.15) return 'failed'
  if (r < 0.45) return 'running'
  if (r < 0.8) return 'pending'
  return 'success'
}

function person(): Person {
  const firstName = rnd(FIRST_NAMES)
  const lastName = rnd(LAST_NAMES)
  return { firstName, lastName }
}

function randomDateWithin(days: number): string {
  const now = Date.now()
  const delta = Math.floor(Math.random() * days * 24 * 3600 * 1000)
  return new Date(now - delta).toISOString()
}

export function generateLeads(count = 24): LeadGenerique[] {
  const leads: LeadGenerique[] = []
  for (let i = 0; i < count; i++) {
    const id = crypto.randomUUID()
    const subscriber = person()
    const email = `${subscriber.firstName?.toLowerCase()}.${subscriber.lastName?.toLowerCase()}@${rnd(DOMAINS)}`
    const createdAt = randomDateWithin(30)
    const folder = rnd(FOLDERS)
    leads.push({
      id,
      subscriber,
      contact: { email, telephone: `06${Math.floor(10000000 + Math.random() * 89999999)}` },
      needs: [],
      metadata: { folder },
      createdAt,
    })
  }
  return leads
}

export function generateTasks(leads: LeadGenerique[], maxPerLead = 4): Task[] {
  const out: Task[] = []
  for (const lead of leads) {
    const n = Math.floor(Math.random() * (maxPerLead + 1))
    for (let i = 0; i < n; i++) {
      const platform = rnd(PLATFORMS)
      const product = rnd(PRODUCTS)
      const status = pickStatus()
      const createdAt = randomDateWithin(15)
      const id = crypto.randomUUID()
      const logs = status !== 'pending' ? `Run ${platform}/${product} for ${lead.id}\nStep A... OK\nStep B...` : null
      const resultPath = status === 'success' ? `/tmp/${id}.pdf` : null
      out.push({ id, leadId: lead.id, platform, product, status, logs, resultPath, createdAt })
    }
  }
  // Sort newest first
  return out.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
}

export type Folder = typeof FOLDERS[number]
export const DEFAULT_FOLDERS: Folder[] = [...FOLDERS]

function pickQuoteStatus(): QuoteStatus {
  const r = Math.random()
  if (r < 0.15) return 'draft'
  if (r < 0.30) return 'ready'
  if (r < 0.55) return 'submitted'
  if (r < 0.80) return 'priced'
  if (r < 0.90) return 'won'
  return 'lost'
}

export function generateQuotes(leads: LeadGenerique[], maxPerLead = 3): Quote[] {
  const out: Quote[] = []
  for (const lead of leads) {
    const n = Math.floor(Math.random() * (maxPerLead + 1))
    for (let i = 0; i < n; i++) {
      const platform = rnd(PLATFORMS)
      const product = rnd(PRODUCTS)
      const status = pickQuoteStatus()
      const id = crypto.randomUUID()
      const createdAt = randomDateWithin(20)
      const updatedAt = createdAt
      const premium = status === 'priced' || status === 'won' || status === 'lost' ? Math.round(300 + Math.random() * 900) : null
      out.push({ id, leadId: lead.id, platform, product, status, premium, currency: 'EUR', createdAt, updatedAt, notes: null })
    }
  }
  return out.sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1))
}
