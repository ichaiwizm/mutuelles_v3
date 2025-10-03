import React, { useEffect, useMemo, useRef, useState } from 'react'

type FlowFile = { platform: string; slug: string; name: string; file: string }

export default function Admin() {
  const [flows, setFlows] = useState<FlowFile[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [latest, setLatest] = useState<Record<string, { dir:string; report:string|null } | null>>({})
  const unsubRef = useRef<() => void>()

  useEffect(() => {
    window.api.admin.listFileFlows().then(async (list) => {
      setFlows(list)
      // Pré-remplir le dernier run par slug
      const entries = await Promise.all(list.map(async f => ({ slug: f.slug, info: await window.api.admin.getLatestRunDir(f.slug) })))
      const map: Record<string, any> = {}
      for (const e of entries) map[e.slug] = e.info
      setLatest(map)
    })
    return () => { if (unsubRef.current) unsubRef.current() }
  }, [])

  const filtered = useMemo(() => flows.filter(f => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return f.slug.toLowerCase().includes(q) || f.name.toLowerCase().includes(q) || f.platform.toLowerCase().includes(q)
  }), [flows, search])

  const byPlatform = useMemo(() => {
    const m = new Map<string, FlowFile[]>()
    for (const f of filtered) {
      const arr = m.get(f.platform) || []
      arr.push(f)
      m.set(f.platform, arr)
    }
    return Array.from(m.entries()).sort((a,b)=>a[0].localeCompare(b[0]))
  }, [filtered])

  function run(slug: string, mode: 'headless'|'dev'|'dev_private', keepOpen?: boolean) {
    if (busy) return
    setBusy(slug)
    window.api.admin.runFileFlow({ slug, mode, keepOpen }).then(({ runKey }) => {
      if (unsubRef.current) unsubRef.current()
      unsubRef.current = window.api.admin.onRunOutput(runKey, (evt) => {
        if (evt.type === 'exit') {
          setBusy(null)
          if (evt.latestRunDir) {
            // rafraîchir l’info de dernier run
            window.api.admin.getLatestRunDir(slug).then(info => setLatest(prev => ({ ...prev, [slug]: info })))
          }
        }
      })
    }).catch(err => {
      setBusy(null)
      console.error(err)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin — JSON Flows (sans DB)</h1>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filtrer… (slug, nom, plateforme)" className="border rounded px-2 py-1 text-sm bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700" />
      </div>
      <p className="text-sm text-neutral-500">Les flows listés proviennent uniquement des fichiers JSON dans <code>flows/</code>. Les identifiants sont chargés via <code>.env</code>. Les logs complets existent sur disque mais ne sont pas affichés ici.</p>
      {byPlatform.map(([plat, items]) => (
        <div key={plat} className="border border-neutral-200 dark:border-neutral-800 rounded">
          <div className="px-3 py-2 font-medium bg-neutral-100 dark:bg-neutral-800/60">Plateforme: {plat}</div>
          <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            {items.map(f => (
              <div key={f.slug} className="rounded border border-neutral-200 dark:border-neutral-800 p-3 bg-white dark:bg-neutral-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{f.name}</div>
                    <div className="text-xs text-neutral-500">{f.slug}</div>
                    <button className="text-xs text-blue-600 hover:underline" onClick={()=>window.api.admin.openPath(f.file)}>Ouvrir le JSON</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button disabled={!!busy} onClick={() => run(f.slug, 'headless')} className="px-2 py-1 text-xs rounded bg-neutral-700 text-white disabled:opacity-50">Headless</button>
                    <button disabled={!!busy} onClick={() => run(f.slug, 'dev')} className="px-2 py-1 text-xs rounded bg-blue-700 text-white disabled:opacity-50">Visible</button>
                    <button disabled={!!busy} onClick={() => run(f.slug, 'dev_private', true)} className="px-2 py-1 text-xs rounded bg-emerald-700 text-white disabled:opacity-50">Privée + keep</button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                  {busy===f.slug ? <span>Exécution en cours…</span> : latest[f.slug]?.dir ? (
                    <div className="flex flex-col gap-1">
                      <div>
                        Dernier run: <code className="select-all">{latest[f.slug]!.dir}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700" onClick={()=>window.api.admin.openPath(latest[f.slug]!.dir)}>Ouvrir le dossier</button>
                        {latest[f.slug]?.report && (
                          <button className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700" onClick={()=>window.api.admin.openPath(latest[f.slug]!.report!)}>Ouvrir le rapport</button>
                        )}
                        <button className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700" onClick={()=>{
                          const p = latest[f.slug]!.dir
                          navigator.clipboard?.writeText(p).catch(()=>{})
                        }}>Copier le chemin</button>
                      </div>
                    </div>
                  ) : <span>Aucun run enregistré.</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
