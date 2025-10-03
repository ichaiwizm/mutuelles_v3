import React, { useEffect, useRef, useState } from 'react'

type FlowItem = { platform: string; slug: string; name: string; file: string }

export default function Admin() {
  const [items, setItems] = useState<FlowItem[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [defaultLead, setDefaultLead] = useState<Record<string,string>>({})
  const [leadsByPlat, setLeadsByPlat] = useState<Record<string, Array<{ platform:string; name:string; file:string }>>>({})
  const unsubRef = useRef<() => void>()

  useEffect(() => {
    async function load() {
      const list: FlowItem[] = []
      if ((window as any).api?.adminHL?.listHLFlows) {
        try {
          const hls = await window.api.adminHL.listHLFlows()
          list.push(...hls.map(f => ({ ...f })))
          const plats = Array.from(new Set(hls.map(f => f.platform)))
          const leadMap: Record<string,string> = {}
          const leadsMap: Record<string, Array<{ platform:string; name:string; file:string }>> = {}
          for (const p of plats) {
            const arr = await window.api.adminHL.listLeads(p)
            leadsMap[p] = arr
            if (arr?.length) leadMap[p] = arr[0].file
          }
          setDefaultLead(leadMap)
          setLeadsByPlat(leadsMap)
        } catch {}
      }
      setItems(list)
    }
    load()
    return () => { if (unsubRef.current) unsubRef.current() }
  }, [])

  function runHL(flow: FlowItem, mode: 'headless'|'dev'|'dev_private', keepOpen?: boolean) {
    if (busy) return
    const leadFile = defaultLead[flow.platform]
    if (!leadFile) { alert(`Aucun lead trouvé pour ${flow.platform} (leads/${flow.platform}/)`); return }
    setBusy(flow.slug)
    window.api.adminHL.run({ platform: flow.platform, flowFile: flow.file, leadFile, mode, keepOpen }).then(({ runKey }) => {
      if (unsubRef.current) unsubRef.current()
      unsubRef.current = window.api.adminHL.onRunOutput(runKey, (evt) => {
        if (evt.type === 'exit') setBusy(null)
      })
    }).catch(err => { setBusy(null); console.error(err) })
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
                  {defaultLead[f.platform] ? (
                    <select className="border rounded px-2 py-1 text-xs bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700" value={defaultLead[f.platform]} onChange={(e)=> setDefaultLead(prev=>({ ...prev, [f.platform]: e.target.value }))}>
                      {(leadsByPlat[f.platform]||[]).map(l => (<option key={l.file} value={l.file}>{l.name}</option>))}
                    </select>
                  ) : (
                    <span className="text-red-600">Aucun lead (leads/{f.platform}/)</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-stretch gap-1">
                <button disabled={!!busy} onClick={()=>runHL(f, 'headless')} className="px-2 py-1 text-xs rounded bg-neutral-700 text-white disabled:opacity-50">Headless</button>
                <button disabled={!!busy} onClick={()=>runHL(f, 'dev', true)} className="px-2 py-1 text-xs rounded bg-blue-700 text-white disabled:opacity-50">Visible</button>
                <button disabled={!!busy} onClick={()=>runHL(f, 'dev_private', true)} className="px-2 py-1 text-xs rounded bg-emerald-700 text-white disabled:opacity-50">Privée + keep</button>
              </div>
            </div>
            {busy===f.slug ? <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">Exécution en cours…</div> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
