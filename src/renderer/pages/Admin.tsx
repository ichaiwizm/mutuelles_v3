import React, { useEffect, useRef, useState } from 'react'

type FlowItem = { platform: string; slug: string; name: string; file: string }

export default function Admin() {
  const [items, setItems] = useState<FlowItem[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [defaultLeadByFlow, setDefaultLeadByFlow] = useState<Record<string,string>>({})
  const [leads, setLeads] = useState<Array<{ name:string; file:string }>>([])
  const [logs, setLogs] = useState<Record<string,string>>({})
  const unsubRef = useRef<() => void>()

  useEffect(() => {
    async function load() {
      const list: FlowItem[] = []
      if ((window as any).api?.adminHL?.listHLFlows) {
        try {
          const hls = await window.api.adminHL.listHLFlows()
          list.push(...hls.map(f => ({ ...f })))
          const allLeads = await window.api.adminHL.listLeads()
          setLeads(allLeads)
          const leadMap: Record<string,string> = {}
          const first = allLeads?.[0]?.file || ''
          for (const fl of hls) leadMap[fl.slug] = first
          setDefaultLeadByFlow(leadMap)
        } catch {}
      }
      setItems(list)
    }
    load()
    return () => { if (unsubRef.current) unsubRef.current() }
  }, [])

  function runHL(flow: FlowItem, mode: 'headless'|'dev'|'dev_private', keepOpen?: boolean) {
    if (busy) return
    const leadFile = defaultLeadByFlow[flow.slug]
    if (!leadFile) { alert(`Aucun lead trouvé (admin/leads/)`); return }
    setBusy(flow.slug)
    setLogs(prev => ({ ...prev, [flow.slug]: '' }))
    window.api.adminHL.run({ platform: flow.platform, flowFile: flow.file, leadFile, mode, keepOpen }).then(({ runKey }) => {
      if (unsubRef.current) unsubRef.current()
      unsubRef.current = window.api.adminHL.onRunOutput(runKey, (evt) => {
        if (evt.type === 'stdout' || evt.type === 'stderr') {
          const line = String(evt.data || '')
          setLogs(prev => {
            const cur = prev[flow.slug] || ''
            // limite mémoire: conserver ~8000 derniers caractères
            const next = (cur + line).slice(-8000)
            return { ...prev, [flow.slug]: next }
          })
        }
        if (evt.type === 'exit') {
          setLogs(prev => ({ ...prev, [flow.slug]: (prev[flow.slug]||'') + `\n[exit] code=${evt.code}\n` }))
          setBusy(null)
        }
      })
    }).catch(err => { setBusy(null); console.error(err); setLogs(prev => ({ ...prev, [flow.slug]: String(err?.message || err) })) })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admin — Flows HL (avec leads)</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map(f => (
          <div key={f.slug} className="rounded border border-neutral-200 dark:border-neutral-800 p-3 bg-white dark:bg-neutral-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{f.name}</div>
                <div className="text-xs text-neutral-500">{f.platform} · {f.slug}</div>
                <div className="text-xs flex items-center gap-2 mt-1">Lead:
                  {leads.length ? (
                    <select className="border rounded px-2 py-1 text-xs bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700" value={defaultLeadByFlow[f.slug]||''} onChange={(e)=> setDefaultLeadByFlow(prev=>({ ...prev, [f.slug]: e.target.value }))}>
                      {leads.map(l => (<option key={l.file} value={l.file}>{l.name}</option>))}
                    </select>
                  ) : (
                    <span className="text-red-600">Aucun lead (admin/leads/)</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-stretch gap-1">
                <button disabled={!!busy} onClick={()=>runHL(f, 'headless')} className="px-2 py-1 text-xs rounded bg-neutral-700 text-white disabled:opacity-50">Headless</button>
                <button disabled={!!busy} onClick={()=>runHL(f, 'dev', true)} className="px-2 py-1 text-xs rounded bg-blue-700 text-white disabled:opacity-50">Visible</button>
                <button disabled={!!busy} onClick={()=>runHL(f, 'dev_private', true)} className="px-2 py-1 text-xs rounded bg-emerald-700 text-white disabled:opacity-50">Privée + keep</button>
              </div>
            </div>
            {(busy===f.slug || (logs[f.slug] && logs[f.slug].length)) && (
              <div className="mt-2">
                <div className="text-xs text-neutral-500 mb-1">Logs</div>
                <pre className="text-[11px] leading-snug bg-neutral-100 dark:bg-neutral-800/60 rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap">{logs[f.slug] || '—'}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
