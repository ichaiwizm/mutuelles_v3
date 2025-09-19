import React from 'react'
import Button from '../components/Button'
import { useToastContext } from '../contexts/ToastContext'

type CatalogRow = { id:number; slug:string; name:string; status:string; selected:boolean; has_creds:boolean }
type PageRow = { id:number; platform_id:number; slug:string; name:string; type:string; status:string }

export default function Platforms() {
  const [rows, setRows] = React.useState<CatalogRow[]>([])
  const [pages, setPages] = React.useState<Record<number, PageRow[]>>({})
  const [loadingToggle, setLoadingToggle] = React.useState(new Set<number>())
  const toast = useToastContext()

  const load = React.useCallback(async () => {
    const list = await window.api.catalog.list()
    setRows(list)
  }, [])

  React.useEffect(() => { load() }, [load])

  async function toggleSelected(r: CatalogRow) {
    setLoadingToggle(prev => new Set([...prev, r.id]))
    try {
      await window.api.catalog.setSelected({ platform_id: r.id, selected: !r.selected })
      await load()
      toast.success(
        r.selected ? 'Plateforme désactivée' : 'Plateforme activée',
        `${r.name} ${r.selected ? 'ne sera plus utilisée' : 'est maintenant utilisée'}`
      )
    } catch (e) {
      toast.error('Erreur', String(e))
    } finally {
      setLoadingToggle(prev => new Set([...prev].filter(id => id !== r.id)))
    }
  }

  async function expand(pid: number) {
    if (pages[pid]) return
    const pg = await window.api.catalog.listPages(pid)
    setPages((m) => ({ ...m, [pid]: pg }))
  }

  const badge = (status: string) => {
    const map: Record<string, string> = {
      ready: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      maintenance: 'bg-amber-100 text-amber-800 border-amber-200',
      building: 'bg-neutral-100 text-neutral-800 border-neutral-200',
      deprecated: 'bg-red-100 text-red-800 border-red-200'
    }
    const label: Record<string, string> = {
      ready: 'Prête', maintenance: 'Maintenance', building: 'En construction', deprecated: 'Retirée'
    }
    return <span className={`text-xs px-2 py-0.5 rounded border ${map[status] || map.ready}`}>{label[status] || 'Prête'}</span>
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Plateformes</h1>

      <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 dark:bg-neutral-800/60">
            <tr>
              <th className="text-left px-3 py-2">Nom</th>
              <th className="text-left px-3 py-2">Statut</th>
              <th className="px-3 py-2 w-[180px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={3} className="px-3 py-6 text-center text-neutral-500">Aucune plateforme</td></tr>
            ) : rows.map((r, index) => (
              <React.Fragment key={r.id}>
                <tr className={`border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${index % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-neutral-50/30 dark:bg-neutral-800/20'}`}>
                  <td className="px-3 py-2">
                    <div className="font-medium flex items-center gap-2">
                      {r.name}
                      {r.selected && !r.has_creds && (
                        <span className="text-[10px] px-2 py-0.5 rounded border border-rose-200 bg-rose-100 text-rose-800">Identifiants manquants</span>
                      )}
                    </div>
                    <button onClick={()=>expand(r.id)} className="text-xs text-neutral-500 hover:underline">Voir les pages</button>
                  </td>
                  <td className="px-3 py-2">{badge(r.status)}</td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      onClick={()=>toggleSelected(r)}
                      disabled={r.status!=='ready'}
                      loading={loadingToggle.has(r.id)}
                      variant={r.selected ? 'primary' : 'secondary'}
                      size="sm"
                    >
                      {r.selected ? 'Utilisée' : 'Utiliser'}
                    </Button>
                  </td>
                </tr>
                {pages[r.id] && (
                  <tr className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
                    <td colSpan={3} className="px-3 py-2">
                      <div className="text-xs text-neutral-500 mb-2">Pages</div>
                      <div className="grid grid-cols-2 gap-2">
                        {pages[r.id].map(p => (
                          <div key={p.id} className="rounded border border-neutral-200 dark:border-neutral-800 p-2 flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{p.name}</div>
                              <div className="text-xs text-neutral-500">{p.type}</div>
                            </div>
                            {badge(p.status)}
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
