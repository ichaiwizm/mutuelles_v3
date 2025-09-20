import React from 'react'
import Button from './Button'
import ConfirmModal from './ConfirmModal'
import ScreenshotGallery from './ScreenshotGallery'

type RunRow = { runId:string; flowSlug:string; startedAt:string; finishedAt?:string|null; status:string; stepsTotal?:number|null; okSteps?:number|null; error?:string|null }

export default function RunHistory({ flowSlug, reloadToken }: { flowSlug?: string; reloadToken?: number }) {
  const [rows, setRows] = React.useState<RunRow[]>([])
  const [selected, setSelected] = React.useState<RunRow | null>(null)
  const [json, setJson] = React.useState<any>(null)
  const [showJson, setShowJson] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState<RunRow | null>(null)
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const pageSize = 10

  const load = React.useCallback(async () => {
    const offset = (page - 1) * pageSize
    const res = await window.api.automation.listRuns({ flowSlug, limit: pageSize, offset })
    setRows(res.items)
    setTotal(res.total)
  }, [flowSlug, page])
  React.useEffect(() => { load() }, [load, reloadToken])

  // Auto-refresh toutes les 3s (utile pour voir un run en cours apparaître)
  React.useEffect(() => {
    const iv = setInterval(() => { load() }, 3000)
    return () => clearInterval(iv)
  }, [load])

  async function openRun(r: RunRow) {
    setSelected(r)
    setShowJson(false)
    setJson(null)
  }

  async function exportJson() {
    if (!selected) return
    await window.api.automation.exportRunJson(selected.runId)
  }

  async function toggleJson() {
    if (!selected) return
    const next = !showJson
    setShowJson(next)
    if (next && !json) {
      try { const d = await window.api.automation.getRun(selected.runId); setJson(d.json) } catch {}
    }
  }

  async function copyJson() {
    if (!selected) return
    let content = json
    if (!content) {
      try { const d = await window.api.automation.getRun(selected.runId); content = d.json } catch { return }
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(content, null, 2))
    } catch {}
  }

  async function doDelete() {
    if (!confirmDelete) return
    try {
      await window.api.automation.deleteRun(confirmDelete.runId)
      setConfirmDelete(null)
      if (selected?.runId === confirmDelete.runId) { setSelected(null); setJson(null); setShowJson(false) }
      const newTotal = Math.max(0, total - 1)
      const lastIndexOnPage = (page - 1) * pageSize
      if (page > 1 && lastIndexOnPage >= newTotal) {
        setPage(p => Math.max(1, p - 1))
        // load sera déclenché par useEffect du changement de page
      } else {
        await load()
      }
    } catch {}
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Historique</div>
        <div className="text-xs">
          <button className="underline" onClick={load}>Rafraîchir</button>
        </div>
      </div>
      <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 dark:bg-neutral-800/60">
            <tr>
              <th className="text-left px-3 py-2">Run</th>
              <th className="text-left px-3 py-2">Début</th>
              <th className="text-left px-3 py-2">Fin</th>
              <th className="text-left px-3 py-2">Statut</th>
              <th className="text-left px-3 py-2">Étapes</th>
              <th className="px-3 py-2 w-[220px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-neutral-500">Aucun run enregistré. Lancez un flux pour voir les résultats ici.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.runId} className={`border-t border-neutral-200 dark:border-neutral-800 ${i%2===0?'bg-white dark:bg-neutral-900':'bg-neutral-50/30 dark:bg-neutral-800/20'}`}>
                <td className="px-3 py-2 font-mono text-[11px]">{r.runId}</td>
                <td className="px-3 py-2 text-xs">{fmt(r.startedAt)}</td>
                <td className="px-3 py-2 text-xs">{r.finishedAt ? fmt(r.finishedAt) : '—'}</td>
                <td className="px-3 py-2 text-xs">{badge(r.status)}</td>
                <td className="px-3 py-2 text-xs">{r.okSteps ?? 0}/{r.stepsTotal ?? 0}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2 whitespace-nowrap">
                    <Button size="sm" onClick={()=>openRun(r)}>Ouvrir</Button>
                    <Button size="sm" variant="danger" onClick={()=>setConfirmDelete(r)}>Supprimer</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-neutral-600">
        <div>
          {total === 0 && <span>0</span>}
          {total > 0 && total <= pageSize && (
            <span>{total} exécution{total>1?'s':''}</span>
          )}
          {total > pageSize && (
            <span>
              {Math.min((page-1)*pageSize+1, total)}–{Math.min(page*pageSize, total)} sur {total}
            </span>
          )}
        </div>
        {total > pageSize && (
          <div className="space-x-2">
            <Button size="sm" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1, p-1))}>Précédent</Button>
            <Button size="sm" disabled={page*pageSize>=total} onClick={()=>setPage(p=>p+1)}>Suivant</Button>
          </div>
        )}
      </div>

      {selected && (
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Détail run: <span className="font-mono">{selected.runId}</span></div>
            <div className="space-x-2">
              <Button size="sm" onClick={copyJson}>Copier le journal</Button>
              <Button size="sm" onClick={()=>setConfirmDelete(selected)}>Supprimer</Button>
              <Button size="sm" onClick={()=>{ setSelected(null); setJson(null); setShowJson(false) }}>Fermer</Button>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-xs text-neutral-500">Captures d’écran</div>
              <ScreenshotGallery runId={selected.runId} />
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={()=>setConfirmDelete(null)}
        onConfirm={doDelete}
        title="Supprimer le run"
        message="Supprimer cet historique d’exécution et les fichiers associés (captures et journal) ? Cette action est irréversible."
        confirmText="Supprimer"
        loading={false}
      />
    </div>
  )
}

function badge(status: string) {
  const map: Record<string,string> = {
    running: 'bg-blue-100 text-blue-800 px-2 py-0.5 rounded',
    success: 'bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded',
    error: 'bg-red-100 text-red-800 px-2 py-0.5 rounded'
  }
  const label: Record<string,string> = {
    running: 'En cours', success: 'Succès', error: 'Échec'
  }
  return <span className={map[status] || ''}>{label[status] || status}</span>
}

function fmt(s?: string | null) {
  if (!s) return '—'
  try { return new Date(s).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' }) }
  catch { return s }
}
