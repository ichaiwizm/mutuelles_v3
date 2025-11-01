import { DEFAULT_FOLDERS, generateLeads, generateTasks, generateQuotes } from '../../shared/mocks/fakes'
import type { LeadGenerique, Task, TaskStatus, Quote, QuoteStatus } from '../../shared/types/canonical'

type Listener = () => void

type TimelineEvent = { id: string; leadId: string; at: string; text: string; kind: 'task-success'|'task-failed'|'info' }

class MockStore {
  leads: LeadGenerique[] = []
  tasks: Task[] = []
  quotes: Quote[] = []
  secrets: Record<string, { username: string; password: string }[]> = {}
  timeline: TimelineEvent[] = []
  running: Record<string, { percent: number; step: string }[]> = {}
  listeners: Set<Listener> = new Set()

  seed() {
    if (this.leads.length) return
    this.leads = generateLeads(48)
    this.leads.forEach(l => { l.status = 'new' })
    this.tasks = generateTasks(this.leads, 6)
    this.quotes = generateQuotes(this.leads, 4)
    // initial timeline
    this.tasks.slice(0, 10).forEach((t) => {
      if (t.status === 'success' || t.status === 'failed')
        this.timeline.unshift({ id: crypto.randomUUID(), leadId: t.leadId, at: t.createdAt, text: `${t.platform}/${t.product}`, kind: t.status === 'success' ? 'task-success' : 'task-failed' })
    })
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  notify() {
    this.listeners.forEach((fn) => fn())
  }
}

const store = new MockStore()

function randomDelay(min = 400, max = 1600) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function nextStatus(s: TaskStatus): TaskStatus {
  if (s === 'pending') return 'running'
  if (s === 'running') return Math.random() < 0.8 ? 'success' : 'failed'
  return s
}

function nextQuoteStatus(s: QuoteStatus): QuoteStatus {
  if (s === 'ready') return 'submitted'
  if (s === 'submitted') return 'priced'
  return s
}

// background simulation loop
let loopStarted = false
function startLoop() {
  if (loopStarted) return
  loopStarted = true
  setInterval(() => {
    if (store.leads.length === 0) return
    // chance to create a new task
    if (Math.random() < 0.35) {
      const lead = store.leads[Math.floor(Math.random() * store.leads.length)]
      const [t] = generateTasks([lead], 1)
      if (t) store.tasks.unshift(t)
    }
    // progress some tasks
    const updatable = store.tasks.filter((t) => t.status === 'pending' || t.status === 'running')
    updatable.slice(0, 3).forEach((t) => {
      t.status = nextStatus(t.status)
      t.logs = (t.logs || '') + `\nTick: ${new Date().toLocaleTimeString()}`
      if (t.status === 'success' && !t.resultPath) t.resultPath = `/tmp/${t.id}.pdf`
      if (t.status === 'success' || t.status === 'failed') {
        store.timeline.unshift({ id: crypto.randomUUID(), leadId: t.leadId, at: new Date().toISOString(), text: `${t.platform}/${t.product}`, kind: t.status === 'success' ? 'task-success' : 'task-failed' })
        const lead = store.leads.find(l => l.id === t.leadId)
        if (lead) lead.status = t.status === 'success' ? 'completed' : 'partial_failure'
      }
    })
    store.notify()
  }, 1500)
  // quotes progression every 2.5s
  setInterval(() => {
    if (store.quotes.length === 0) return
    const candidates = store.quotes.filter((q) => q.status === 'submitted' || q.status === 'ready')
    candidates.slice(0, 3).forEach((q) => {
      q.status = nextQuoteStatus(q.status)
      if (q.status === 'priced' && !q.premium) q.premium = Math.round(300 + Math.random() * 900)
      q.updatedAt = new Date().toISOString()
    })
    store.notify()
  }, 2500)
}

export const MockBridge = {
  init() {
    store.seed()
    startLoop()
  },
  automations: {
    runForLead: async (leadId: string, selections: { platform: string; product: string }[]) => {
      const steps = ['Initialisation', 'Login', 'Remplissage formulaire', 'Soumission', 'Récupération devis']
      const arr = selections.map(() => ({ percent: 0, step: steps[0] }))
      store.running[leadId] = arr
      const lead = store.leads.find(l => l.id === leadId)
      if (lead) lead.status = 'in_progress'
      // seed tasks
      selections.forEach(s => {
        store.tasks.unshift({ id: crypto.randomUUID(), leadId, platform: s.platform, product: s.product, status: 'running', createdAt: new Date().toISOString() } as any)
      })
      store.notify()
      // progress simulation
      let tick = 0
      const iv = setInterval(() => {
        tick++
        const arr = store.running[leadId]
        if (!arr) return
        for (const r of arr) {
          r.percent = Math.min(100, r.percent + Math.floor(Math.random()*25))
          r.step = steps[Math.min(steps.length-1, Math.floor(r.percent/25))]
        }
        if (arr.every(r => r.percent >= 100)) {
          clearInterval(iv)
          delete store.running[leadId]
          const lead = store.leads.find(l => l.id === leadId)
          if (lead) lead.status = 'completed'
          // mark tasks success
          store.tasks.filter(t => t.leadId===leadId && t.status==='running').forEach(t => t.status='success')
        }
        store.notify()
      }, 1200)
      return true
    },
    getProgress: (leadId: string) => store.running[leadId] || [],
    runningLeadIds: () => Object.keys(store.running),
    pause: async (_leadId: string) => true,
    stop: async (leadId: string) => { delete store.running[leadId]; store.notify(); return true },
  },
  gmail: {
    list: async () => Array.from({ length: 8 }).map((_,i) => ({ id: `mail_${i}`, from: 'prospect@gmail.com', subject: `Demande devis #${i+1}`, snippet: 'Bonjour, je souhaite un devis santé...', detected: { firstName: 'Jean', lastName: 'Dupont', email: 'jean.dupont@gmail.com' } })),
    import: async (ids: string[]) => ids.map((id, idx) => ({ id: crypto.randomUUID(), subscriber: { firstName: 'Jean', lastName: `Dupont${idx}` }, contact: { email: `jean.dupont${idx}@gmail.com` }, needs: [], metadata: { folder: 'Nouveaux' }, createdAt: new Date().toISOString(), status: 'new' } as LeadGenerique)),
  },
  csv: {
    preview: async () => ({
      headers: ['prenom','nom','email','telephone'],
      sample: [ ['Jean','Dupont','jean@example.com','0612345678'], ['Marie','Martin','marie@example.com','0677889900'] ],
      mapping: { prenom: 'subscriber.firstName', nom: 'subscriber.lastName', email: 'contact.email', telephone: 'contact.telephone' }
    }),
    import: async (_mapping: any) => true,
  },
  platformsConfig: {
    test: async (_platform: string, _payload: any) => { await new Promise(r=>setTimeout(r,800)); return Math.random() > 0.2 },
  },
  subscribe: (fn: Listener) => store.subscribe(fn),
  leads: {
    list: async () => store.leads,
    get: async (id: string) => store.leads.find((l) => l.id === id) || null,
    create: async (l: LeadGenerique) => {
      store.leads.unshift(l)
      store.notify()
      return true
    },
    moveToFolder: async (id: string, folder: string) => {
      const lead = store.leads.find((x) => x.id === id)
      if (lead) {
        lead.metadata = { ...(lead.metadata || {}), folder }
        store.notify()
      }
    },
    folders: () => DEFAULT_FOLDERS,
  },
  tasks: {
    listRecent: async (limit = 100) => store.tasks.slice(0, limit),
    listByLead: async (leadId: string) => store.tasks.filter((t) => t.leadId === leadId),
    enqueue: async (tasks: Task[]) => {
      tasks.forEach((t) => store.tasks.unshift(t))
      store.notify()
      return true
    },
    rerun: async (id: string) => {
      const t = store.tasks.find((x) => x.id === id)
      if (!t) return false
      t.status = 'pending'
      t.logs = (t.logs || '') + `\nRelance ${new Date().toISOString()}`
      store.notify()
      return true
    },
  },
  quotes: {
    listByLead: async (leadId: string) => store.quotes.filter((q) => q.leadId === leadId),
    listByFolder: async (folder: string) => {
      const ids = new Set(store.leads.filter((l) => (l.metadata?.folder || 'Nouveaux') === folder).map((l) => l.id))
      return store.quotes.filter((q) => ids.has(q.leadId))
    },
    listRecent: async (limit = 100) => store.quotes.slice(0, limit),
    create: async (q: Quote) => { store.quotes.unshift(q); store.notify(); return true },
    update: async (q: Partial<Quote> & { id: string }) => {
      const idx = store.quotes.findIndex((x) => x.id === q.id)
      if (idx < 0) return false
      store.quotes[idx] = { ...store.quotes[idx], ...q, updatedAt: new Date().toISOString() }
      store.notify();
      return true
    },
    moveStatus: async (id: string, status: QuoteStatus) => {
      const q = store.quotes.find((x) => x.id === id)
      if (!q) return false
      q.status = status
      if (status === 'priced' && !q.premium) q.premium = Math.round(300 + Math.random() * 900)
      q.updatedAt = new Date().toISOString()
      store.notify();
      return true
    }
  },
  secrets: {
    set: async ({ platform, username, password }: { platform: string; username: string; password: string }) => {
      const list = store.secrets[platform] || []
      const idx = list.findIndex((c) => c.username === username)
      if (idx >= 0) list[idx] = { username, password }
      else list.push({ username, password })
      store.secrets[platform] = list
      store.notify()
      return true
    },
    getAll: async () => store.secrets,
  },
  timeline: {
    listByLead: async (leadId: string, limit = 10) => store.timeline.filter((e) => e.leadId === leadId).slice(0, limit),
    listRecent: async (limit = 20) => store.timeline.slice(0, limit),
  },
  suggest: {
    nextActions: async (leadId: string) => {
      const l = store.leads.find((x) => x.id === leadId)
      const base = l?.subscriber.firstName || 'Client'
      return [
        `Envoyer relance email (J+2) à ${base}`,
        `Tenter plateforme alternative (April Santé Pro)`,
        `Compléter champ manquant: Code NAF`,
      ]
    }
  },
  platforms: {
    list: () => [
      { key: 'swisslife', label: 'Swiss Life', status: pick(['ok', 'degrade', 'incident']) },
      { key: 'alptis', label: 'Alptis', status: pick(['ok', 'degrade', 'incident']) },
      { key: 'april', label: 'April', status: pick(['ok', 'degrade', 'incident']) },
      { key: 'axa', label: 'AXA', status: pick(['ok', 'degrade', 'incident']) },
    ],
  },
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

export type PlatformStatus = ReturnType<typeof MockBridge.platforms.list>[number]
