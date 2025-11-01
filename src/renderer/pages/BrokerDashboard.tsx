import React, { useEffect, useMemo, useState } from 'react'
import type { LeadGenerique, Task, Quote } from '../../shared/types/canonical'
import { MockBridge } from '../mocks/bridge'
import { AppShell } from '../cockpit/AppShell'
import { Header, type Mode } from '../linear/Header'
import { Inspector } from '../linear/Inspector'
import { LeadsTable, QuotesTable, RunsTable } from '../linear/Tables'
import { LeadsPage } from '../cockpit/pages/LeadsPage'
import { LeadDetail } from '../cockpit/pages/LeadDetail'
import { AutomationsPage } from '../cockpit/pages/AutomationsPage'
import { HistoryPage } from '../cockpit/pages/HistoryPage'
import { SettingsPage } from '../cockpit/pages/SettingsPage'
import { CredentialsPage } from '../cockpit/pages/CredentialsPage'
import { QuoteWizard } from '../ui/QuoteWizard'
import { LeadDialog } from '../ui/LeadDialog'
import { Toaster } from 'sonner'
import { SpotlightDialog } from '../cockpit/modals/SpotlightDialog'
// Removed task status filter for quotes-focused view

export default function BrokerDashboard() {
  const [leads, setLeads] = useState<LeadGenerique[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)
  const [folder, setFolder] = useState<'Nouveaux'|'En cours'|'Gagnés'|'Perdus'|'Archives'>('Nouveaux')
  const [leadFilter, setLeadFilter] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<Mode>('quotes')
  const [nav, setNav] = useState<'leads'|'automations'|'history'|'settings'|'credentials'>('leads')
  const [openLeadId, setOpenLeadId] = useState<string | null>(null)
  const [openQuoteWizard, setOpenQuoteWizard] = useState(false)
  const [openLeadDialog, setOpenLeadDialog] = useState(false)
  const [openSpotlight, setOpenSpotlight] = useState(false)
  const [dense, setDense] = useState<boolean>(() => localStorage.getItem('ui:dense') === '1')
  // const [statusFilter, setStatusFilter] = useState<StatusKey>('all')

  useEffect(() => {
    MockBridge.init()
    const refresh = async () => {
      const ls = await MockBridge.leads.list()
      const ts = await MockBridge.tasks.listRecent(100)
      const qs = await MockBridge.quotes.listRecent(200)
      setLeads(ls)
      setTasks(ts)
      setQuotes(qs)
    }
    refresh()
    return MockBridge.subscribe(refresh)
  }, [])

  // keyboard shortcuts added later (after deps are declared)

  const nameOf = (id: string) => {
    const l = leads.find((x) => x.id === id)
    const f = l?.subscriber.firstName || ''
    const n = l?.subscriber.lastName || ''
    return (f + ' ' + n).trim() || l?.id.slice(0, 8) || id.slice(0, 8)
  }

  const filteredTasks = useMemo(() => {
    const leadIds = new Set(
      leads.filter((l) => (l.metadata?.folder || 'Nouveaux') === folder).map((l) => l.id)
    )
    let list = tasks.filter((t) => leadIds.has(t.leadId))
    if (leadFilter) list = list.filter((t) => t.leadId === leadFilter)
    // if (statusFilter !== 'all') list = list.filter((t) => t.status === statusFilter)
    return list
  }, [tasks, leads, folder, leadFilter])

  const folders = useMemo(() => MockBridge.leads.folders(), [])

  const selTask = tasks.find((t) => t.id === selectedTaskId) || null
  const selQuote = quotes.find((q) => q.id === selectedQuoteId) || null
  const selLead = (selQuote ? leads.find((l) => l.id === selQuote.leadId)
    : selTask ? leads.find((l) => l.id === selTask.leadId)
    : leads.find((l) => l.id === leadFilter)) || null

  const filteredLeads = useMemo(() => {
    const ids = new Set(leads.filter((l) => (l.metadata?.folder || 'Nouveaux') === folder).map((l) => l.id))
    return leads.filter((l) => ids.has(l.id) && (!q || (nameOf(l.id) + ' ' + (l.contact?.email||'')).toLowerCase().includes(q.toLowerCase())))
  }, [leads, folder, q])

  const filteredQuotes = useMemo(() => {
    const ids = new Set(filteredLeads.map((l) => l.id))
    return quotes.filter((qu) => ids.has(qu.leadId) && (!q || `${qu.platform} ${qu.product}`.toLowerCase().includes(q.toLowerCase())))
  }, [quotes, filteredLeads, q])

  function navTitle(n: 'leads'|'automations'|'history'|'settings'|'credentials') {
    return n==='leads' ? ((openLeadId && selLead)? 'Lead' : 'Leads') : n==='automations' ? 'Automatisations en cours' : n==='history' ? 'Historique / Résultats' : n==='settings' ? 'Configuration' : 'Identifiants plateformes'
  }

  useEffect(()=> {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'n') { e.preventDefault(); setOpenLeadDialog(true) }
      if (mod && e.key.toLowerCase() === 'i') { e.preventDefault(); setNav('leads'); }
      if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpenSpotlight(true) }
      if (e.key === 'Enter' && nav==='leads' && !openLeadId && filteredLeads[0]) { setOpenLeadId(filteredLeads[0].id) }
      if (e.key === ' ' && selLead && nav==='leads') { e.preventDefault(); MockBridge.automations.runForLead(selLead.id, [{ platform: 'swisslife', product: 'sante-individuelle' }]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav, openLeadId, filteredLeads, selLead])

  // creation handled via dialogs

  return (
    <AppShell
      nav={nav}
      onNav={(k)=> setNav(k)}
      automationsActive={MockBridge.automations.runningLeadIds().length>0}
      leadsAwaiting={leads.filter(l=> l.status==='awaiting_action').length}
      density={dense?'compact':'comfortable'}
      onToggleDensity={()=> { const v = !dense; setDense(v); localStorage.setItem('ui:dense', v?'1':'0') }}
      title={navTitle(nav)}
      right={<Header q={q} onQ={setQ} mode={mode} onMode={setMode} onNewLead={()=> setOpenLeadDialog(true)} onNewQuote={()=> setOpenQuoteWizard(true)} />}
    >
      {nav==='leads' && !openLeadId && (
        <LeadsPage leads={filteredLeads} tasks={tasks} onOpenLead={(id)=> setOpenLeadId(id)} />
      )}
      {nav==='leads' && openLeadId && selLead && (
        <LeadDetail lead={selLead} tasks={tasks} quotes={quotes} />
      )}
      {nav==='automations' && <AutomationsPage />}
      {nav==='history' && <HistoryPage quotes={filteredQuotes} leads={leads} onSelect={setSelectedQuoteId} />}
      {nav==='settings' && <SettingsPage />}
      {nav==='credentials' && <CredentialsPage />}
      <QuoteWizard open={openQuoteWizard} onClose={()=> setOpenQuoteWizard(false)} lead={selLead} />
      <LeadDialog open={openLeadDialog} onClose={()=> setOpenLeadDialog(false)} defaultFolder={folder} />
      <SpotlightDialog open={openSpotlight} onClose={()=> setOpenSpotlight(false)} leads={leads} onOpenLead={(id)=> { setNav('leads'); setOpenLeadId(id) }} />
      <Toaster richColors />
    </AppShell>
  )
}
