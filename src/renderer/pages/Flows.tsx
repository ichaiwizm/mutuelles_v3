import React from 'react'
import Button from '../components/Button'
import { useToastContext } from '../contexts/ToastContext'

type Flow = { id:number; slug:string; name:string; platform_id:number; platform:string; active:boolean }
type Progress = { runId:string; stepIndex?:number; type:string; status:'start'|'success'|'error'|'info'; message?:string; screenshotPath?:string }

export default function Flows() {
  const [flows, setFlows] = React.useState<Flow[]>([])
  const [running, setRunning] = React.useState<Record<string, { runId:string; logs:Progress[]; dir?:string }>>({})
  const toast = useToastContext()

  const load = React.useCallback(async () => {
    try { setFlows(await window.api.automation.listFlows()) } catch (e) { console.error(e) }
  }, [])
  React.useEffect(() => { load() }, [load])

  async function start(flow: Flow) {
    const tid = toast.loading(`Démarrage du flux ${flow.name}…`)
    try {
      const { runId, screenshotsDir } = await window.api.automation.run({ flowSlug: flow.slug })
      toast.update(tid, { type:'success', title:'Flux en cours', message: flow.name, duration: 2000 })
      setRunning(prev => ({ ...prev, [flow.slug]: { runId, logs: [], dir: screenshotsDir } }))
      const off = window.api.automation.onProgress(runId, (evt: Progress) => {
        setRunning(prev => ({ ...prev, [flow.slug]: { runId, logs: [...(prev[flow.slug]?.logs||[]), evt], dir: screenshotsDir } }))
      })
      // auto detach when run ends
      const stopWhenDone = setInterval(() => {
        const logs = running[flow.slug]?.logs || []
        const done = logs.some(l => l.type==='run' && (l.status==='success' || l.status==='error'))
        if (done) { off(); clearInterval(stopWhenDone) }
      }, 1000)
    } catch (e) {
      toast.update(tid, { type:'error', title:'Échec du démarrage', message:String(e), duration: 5000 })
    }
  }

  function openDir(flow: Flow) {
    const dir = running[flow.slug]?.dir
    if (dir) window.api.automation.openRunDir(dir).catch(()=>toast.error('Erreur','Impossible d\'ouvrir le dossier'))
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Flux (Dev)</h1>
      <p className="text-sm text-neutral-500">Flux techniques à usage interne. Les flux de connexion servent au debug.</p>
      <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 dark:bg-neutral-800/60">
            <tr>
              <th className="text-left px-3 py-2">Flux</th>
              <th className="text-left px-3 py-2">Plateforme</th>
              <th className="px-3 py-2 w-[260px]"></th>
            </tr>
          </thead>
          <tbody>
            {flows.length === 0 ? (
              <tr><td colSpan={3} className="px-3 py-6 text-center text-neutral-500">Aucun flux</td></tr>
            ) : flows.map((f, index) => (
              <React.Fragment key={f.id}>
                <tr className={`border-t border-neutral-200 dark:border-neutral-800 ${index % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-neutral-50/30 dark:bg-neutral-800/20'}`}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{f.name}</div>
                    <div className="text-xs text-neutral-500">{f.slug}</div>
                  </td>
                  <td className="px-3 py-2">{f.platform}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <Button onClick={()=>start(f)} variant="primary" size="sm">Lancer</Button>
                    {running[f.slug]?.dir && (
                      <Button onClick={()=>openDir(f)} size="sm">Ouvrir les captures</Button>
                    )}
                  </td>
                </tr>
                {running[f.slug] && (
                  <tr className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
                    <td colSpan={3} className="px-3 py-2">
                      <div className="text-xs text-neutral-500 mb-2">Journal d’exécution</div>
                      <div className="space-y-1 max-h-64 overflow-auto pr-2">
                        {running[f.slug].logs.map((l, i) => (
                          <div key={i} className="text-xs flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded ${badge(l.status)}`}>{l.status}</span>
                            <span className="text-neutral-700 dark:text-neutral-300">[{l.type}{l.stepIndex!==undefined?`#${l.stepIndex+1}`:''}]</span>
                            {l.message && <span className="opacity-80">— {l.message}</span>}
                            {l.screenshotPath && <a className="underline ml-auto" onClick={()=>window.api.automation.openRunDir(running[f.slug].dir!)}>captures</a>}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function badge(status: string) {
  const map: Record<string,string> = {
    start: 'bg-blue-100 text-blue-800',
    success: 'bg-emerald-100 text-emerald-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-neutral-100 text-neutral-800'
  }
  return map[status] || map.info
}

