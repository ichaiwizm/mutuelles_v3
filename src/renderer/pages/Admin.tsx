import React, { useEffect, useRef, useState } from 'react'

type FlowItem = { platform: string; slug: string; name: string; file: string; kind: 'json'|'hl' }

export default function Admin() {
  const [items, setItems] = useState<FlowItem[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [latest, setLatest] = useState<Record<string, { dir:string; report:string|null } | null>>({})
  const [defaultLead, setDefaultLead] = useState<Record<string,string>>({})
  const unsubRef = useRef<() => void>()

  useEffect(() => {
    async function load() {
      const lows = await window.api.admin.listFileFlows()
      const list: FlowItem[] = lows.map(f => ({ ...f, kind: 'json' }))
      if ((window as any).api?.adminHL?.listHLFlows) {
        try {
          const hls = await window.api.adminHL.listHLFlows()
          list.push(...hls.map(f => ({ ...f, kind: 'hl' })))
          // prefetch leads per platform (pick first available as default)
          const plats = Array.from(new Set(hls.map(f => f.platform)))
          const leadMap: Record<string,string> = {}
          for (const p of plats) {
            const arr = await window.api.adminHL.listLeads(p)
            if (arr?.length) leadMap[p] = arr[0].file
          }
          setDefaultLead(leadMap)
        } catch {}
      }
      setItems(list)
      // last runs
      const entries = await Promise.all(list.map(async it => ({ slug: it.slug, info: await window.api.admin.getLatestRunDir(it.slug) })))
      const map: Record<string, any> = {}
      for (const e of entries) map[e.slug] = e.info
      setLatest(map)
    }
    load()
    return () => { if (unsubRef.current) unsubRef.current() }
  }, [])

  function runLow(slug: string, mode: 'headless'|'dev'|'dev_private', keepOpen?: boolean) {
    if (busy) return
    setBusy(slug)
    window.api.admin.runFileFlow({ slug, mode, keepOpen }).then(({ runKey }) => {
      if (unsubRef.current) unsubRef.current()
      unsubRef.current = window.api.admin.onRunOutput(runKey, (evt) => {
        if (evt.type === 'exit') {
          setBusy(null)
          window.api.admin.getLatestRunDir(slug).then(info => setLatest(prev => ({ ...prev, [slug]: info })))
        }
      })
    }).catch(err => { setBusy(null); console.error(err) })
  }

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
      <h1 className="text-xl font-semibold">Admin — Flows JSON (liste complète)</h1>
      <p className="text-sm text-neutral-500">Les flows ci‑dessous proviennent exclusivement du dossier <code>flows/</code>. Pour chaque flow, on affiche le JSON du flow, le fichier fields definitions associé (<code>field-definitions/&lt;platform&gt;.json</code>) et, pour les flows High‑Level, le lead par défaut (<code>leads/&lt;platform&gt;/</code>).</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map(f => (
          <div key={`${f.kind}-${f.slug}`} className="rounded border border-neutral-200 dark:border-neutral-800 p-3 bg-white dark:bg-neutral-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{f.name} <span className="text-xs text-neutral-500">[{f.kind === 'hl' ? 'HL' : 'JSON'}]</span></div>
                <div className="text-xs text-neutral-500">{f.platform} · {f.slug}</div>
                <div className="text-xs mt-1">
                  Flow JSON: <button className="text-blue-600 hover:underline" onClick={()=>window.api.admin.openPath(f.file)}>{f.file}</button>
                </div>
                <div className="text-xs">Fields JSON: <button className="text-blue-600 hover:underline" onClick={()=>window.api.admin.openPath(`field-definitions/${f.platform}.json`)}>field-definitions/{f.platform}.json</button></div>
                {f.kind === 'hl' && (
                  <div className="text-xs">Lead (par défaut): {defaultLead[f.platform] ? <button className="text-blue-600 hover:underline" onClick={()=>window.api.admin.openPath(defaultLead[f.platform])}>{defaultLead[f.platform]}</button> : <span className="text-red-600">Aucun lead trouvé</span>}</div>
                )}
              </div>
              <div className="flex flex-col items-stretch gap-1">
                {f.kind === 'hl' ? (
                  <>
                    <button disabled={!!busy} onClick={()=>runHL(f, 'headless')} className="px-2 py-1 text-xs rounded bg-neutral-700 text-white disabled:opacity-50">Headless</button>
                    <button disabled={!!busy} onClick={()=>runHL(f, 'dev')} className="px-2 py-1 text-xs rounded bg-blue-700 text-white disabled:opacity-50">Visible</button>
                    <button disabled={!!busy} onClick={()=>runHL(f, 'dev_private', true)} className="px-2 py-1 text-xs rounded bg-emerald-700 text-white disabled:opacity-50">Privée + keep</button>
                  </>
                ) : (
                  <>
                    <button disabled={!!busy} onClick={()=>runLow(f.slug, 'headless')} className="px-2 py-1 text-xs rounded bg-neutral-700 text-white disabled:opacity-50">Headless</button>
                    <button disabled={!!busy} onClick={()=>runLow(f.slug, 'dev')} className="px-2 py-1 text-xs rounded bg-blue-700 text-white disabled:opacity-50">Visible</button>
                    <button disabled={!!busy} onClick={()=>runLow(f.slug, 'dev_private', true)} className="px-2 py-1 text-xs rounded bg-emerald-700 text-white disabled:opacity-50">Privée + keep</button>
                  </>
                )}
              </div>
            </div>
            <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
              {busy===f.slug ? <span>Exécution en cours…</span> : latest[f.slug]?.dir ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span>Dernier run: <code className="select-all">{latest[f.slug]!.dir}</code></span>
                  <button className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700" onClick={()=>window.api.admin.openPath(latest[f.slug]!.dir)}>Ouvrir le dossier</button>
                  {latest[f.slug]?.report && (
                    <button className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700" onClick={()=>window.api.admin.openPath(latest[f.slug]!.report!)}>Ouvrir le rapport</button>
                  )}
                  <button className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700" onClick={()=>{ const p = latest[f.slug]!.dir; navigator.clipboard?.writeText(p).catch(()=>{}) }}>Copier le chemin</button>
                </div>
              ) : <span>Aucun run enregistré.</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
