import React from 'react'
import Button from '../components/Button'
import { useToastContext } from '../contexts/ToastContext'

type CatalogRow = { id:number; slug:string; name:string; selected:boolean; has_creds:boolean }
type Lead = { id:string; data: { subscriber?: any } }
type ItemEvt = { type:'run-start'|'item-start'|'item-success'|'item-error'|'run-done'; runId:string; itemId?:string; leadId?:string; platform?:string; message?:string; runDir?:string }

export default function Automations() {
  const toast = useToastContext()
  const [platforms, setPlatforms] = React.useState<CatalogRow[]>([])
  const [leads, setLeads] = React.useState<Lead[]>([])
  const [selected, setSelected] = React.useState<Record<string, boolean>>({})
  const [mode, setMode] = React.useState<'headless'|'dev'|'dev_private'>('headless')
  const [concurrency, setConcurrency] = React.useState(2)
  const [runId, setRunId] = React.useState<string>('')
  const [events, setEvents] = React.useState<ItemEvt[]>([])
  const [items, setItems] = React.useState<Record<string, { leadId:string; platform:string; status:'pending'|'running'|'success'|'error'; runDir?:string; msg?:string }>>({})

  React.useEffect(() => { (async () => {
    const plats = await window.api.catalog.list()
    setPlatforms(plats.filter(p=>p.selected))
    const res = await window.api.leads.list({}, { limit: 50 })
    if (res.success) setLeads(res.data.items)
  })() }, [])

  const selectedIds = React.useMemo(()=> Object.keys(selected).filter(k=>selected[k]), [selected])

  function toggleLead(id: string) { setSelected(prev => ({ ...prev, [id]: !prev[id] })) }

  function getLeadName(leadId: string): string {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return leadId.slice(0, 8)
    return `${lead.data?.subscriber?.firstName||''} ${lead.data?.subscriber?.lastName||''}`.trim() || leadId.slice(0,8)
  }

  async function startRun() {
    if (selectedIds.length === 0) { toast.error('Sélection requise', 'Choisissez au moins un lead'); return }
    const tid = toast.loading('Démarrage du scénario…')
    try {
      const payload = { leadIds: selectedIds, options: { mode, concurrency } }
      const { runId } = await window.api.scenarios.run(payload)
      setRunId(runId); setEvents([]); setItems({})
      toast.update(tid, { type:'success', title:'Lancement en cours', duration: 1500 })
      const off = window.api.scenarios.onProgress(runId, (e: ItemEvt) => {
        setEvents(prev => [...prev, e])
        if (e.type === 'item-start' && e.itemId && e.leadId && e.platform) {
          setItems(prev => ({ ...prev, [e.itemId]: { leadId: e.leadId, platform: e.platform, status:'running' } }))
        }
        if (e.type === 'item-success' && e.itemId) {
          setItems(prev => ({ ...prev, [e.itemId]: { ...(prev[e.itemId]!), status:'success', runDir: e.runDir } }))
        }
        if (e.type === 'item-error' && e.itemId) {
          setItems(prev => ({ ...prev, [e.itemId]: { ...(prev[e.itemId]||{ leadId:e.leadId!, platform:e.platform! }), status:'error', msg:e.message } }))
        }
        if (e.type === 'run-done') off()
      })
    } catch (e) {
      toast.update(tid, { type:'error', title:'Échec du lancement', message:String(e) })
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Automatisations</h1>
          <p className="text-sm text-neutral-500">Créez et lancez un scénario sur plusieurs plateformes, en un clic.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={mode} onChange={e=>setMode(e.target.value as any)} className="border rounded px-2 py-1 text-sm bg-white dark:bg-neutral-900">
            <option value="headless">Mode discret</option>
            <option value="dev">Visible</option>
            <option value="dev_private">Privée</option>
          </select>
          <input type="number" min={1} max={3} value={concurrency} onChange={e=>setConcurrency(Math.max(1, Math.min(3, Number(e.target.value)||1)))} className="w-16 border rounded px-2 py-1 text-sm bg-white dark:bg-neutral-900"/>
          <Button onClick={startRun} variant="primary">Lancer</Button>
        </div>
      </header>

      <section className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3">
        <div className="font-medium mb-2">Plateformes du scénario</div>
        <div className="flex flex-wrap gap-2">
          {platforms.length===0 ? <span className="text-sm text-neutral-500">Aucune plateforme sélectionnée (voir Configuration)</span> : platforms.map(p=> (
            <span key={p.slug} className={`text-xs px-2 py-1 rounded border ${p.has_creds? 'bg-emerald-50 border-emerald-200 text-emerald-800':'bg-amber-50 border-amber-200 text-amber-800'}`}>
              {p.name}{!p.has_creds && ' · identifiants manquants'}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Leads</div>
          <div className="text-xs text-neutral-500">{selectedIds.length} sélectionné(s)</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-auto">
          {leads.map(l => {
            const n = `${l.data?.subscriber?.firstName||''} ${l.data?.subscriber?.lastName||''}`.trim() || l.id.slice(0,8)
            return (
              <label key={l.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!selected[l.id]} onChange={()=>toggleLead(l.id)} />
                <span>{n}</span>
              </label>
            )
          })}
        </div>
      </section>

      {runId && (
        <section className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3">
          <div className="font-medium mb-2">Suivi du lancement</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(items).length === 0 ? (
              <div className="text-sm text-neutral-500">Préparation…</div>
            ) : (
              Object.entries(items).map(([id,it]) => (
                <div key={id} className="flex items-center justify-between border rounded px-2 py-1 text-sm">
                  <div>
                    <div className="font-medium">{it.platform}</div>
                    <div className="text-xs text-neutral-500">{getLeadName(it.leadId)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${badgeClass(it.status)}`}>{it.status}</span>
                    {it.runDir && (
                      <button onClick={()=>window.api.scenarios.openPath(it.runDir!)} className="text-xs underline">Ouvrir</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </section>
  )
}

function badgeClass(s: 'pending'|'running'|'success'|'error') {
  if (s==='running') return 'bg-blue-100 text-blue-800'
  if (s==='success') return 'bg-emerald-100 text-emerald-800'
  if (s==='error') return 'bg-red-100 text-red-800'
  return 'bg-neutral-100 text-neutral-800'
}
