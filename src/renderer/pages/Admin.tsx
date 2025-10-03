import React, { useEffect, useMemo, useRef, useState } from 'react'

type FlowFile = { platform: string; slug: string; name: string; file: string }

export default function Admin() {
  const [flows, setFlows] = useState<FlowFile[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [log, setLog] = useState<string>('')
  const unsubRef = useRef<() => void>()

  useEffect(() => {
    window.api.admin.listFileFlows().then(setFlows)
    return () => { if (unsubRef.current) unsubRef.current() }
  }, [])

  const byPlatform = useMemo(() => {
    const m = new Map<string, FlowFile[]>()
    for (const f of flows) {
      const arr = m.get(f.platform) || []
      arr.push(f)
      m.set(f.platform, arr)
    }
    return Array.from(m.entries()).sort((a,b)=>a[0].localeCompare(b[0]))
  }, [flows])

  function run(slug: string, mode: 'headless'|'dev'|'dev_private', keepOpen?: boolean) {
    if (busy) return
    setLog('')
    setBusy(slug)
    window.api.admin.runFileFlow({ slug, mode, keepOpen }).then(({ runKey }) => {
      if (unsubRef.current) unsubRef.current()
      unsubRef.current = window.api.admin.onRunOutput(runKey, (evt) => {
        if (evt.type === 'stdout' || evt.type === 'stderr') {
          setLog(prev => prev + (evt.data || ''))
        } else if (evt.type === 'exit') {
          setBusy(null)
          if (evt.latestRunDir) {
            setLog(prev => prev + `\n[done] Run directory: ${evt.latestRunDir}\n`)
          } else {
            setLog(prev => prev + `\n[done] Exit code: ${evt.code}\n`)
          }
        }
      })
    }).catch(err => {
      setBusy(null)
      setLog(String(err?.message || err))
    })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admin — JSON Flows</h1>
      <p className="text-sm text-neutral-500">Exécute les flows depuis les fichiers JSON (sans DB). Les identifiants sont chargés via .env automatiquement par le runner.</p>
      {byPlatform.map(([plat, items]) => (
        <div key={plat} className="border border-neutral-200 dark:border-neutral-800 rounded p-3">
          <div className="font-medium mb-2">Plateforme: {plat}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {items.map(f => (
              <div key={f.slug} className="flex items-center justify-between bg-neutral-100 dark:bg-neutral-800/60 rounded px-3 py-2">
                <div>
                  <div className="font-medium">{f.name}</div>
                  <div className="text-xs text-neutral-500">{f.slug}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button disabled={!!busy} onClick={() => run(f.slug, 'headless')} className="px-2 py-1 text-xs rounded bg-neutral-700 text-white disabled:opacity-50">Headless</button>
                  <button disabled={!!busy} onClick={() => run(f.slug, 'dev')} className="px-2 py-1 text-xs rounded bg-blue-700 text-white disabled:opacity-50">Visible</button>
                  <button disabled={!!busy} onClick={() => run(f.slug, 'dev_private', true)} className="px-2 py-1 text-xs rounded bg-emerald-700 text-white disabled:opacity-50">Privée + keep</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="border border-neutral-200 dark:border-neutral-800 rounded">
        <div className="px-3 py-1 text-sm bg-neutral-100 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800">Logs</div>
        <pre className="p-3 text-xs whitespace-pre-wrap max-h-[320px] overflow-auto">{log || '—'}</pre>
      </div>
    </div>
  )
}

