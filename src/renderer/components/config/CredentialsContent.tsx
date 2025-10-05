import React from 'react'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../Button'
import ConfirmModal from '../ConfirmModal'
import { useToastContext } from '../../contexts/ToastContext'

type Row = { platform_id:number; name:string; status:string; selected:boolean; has_creds:boolean; username:string|null }

export default function CredentialsContent() {
  const [rows, setRows] = React.useState<Row[]>([])
  const [edit, setEdit] = React.useState<Record<number, { username:string; password:string }>>({})
  const [showPassword, setShowPassword] = React.useState<Record<number, boolean>>({})
  const [loading, setLoading] = React.useState({ save: new Set<number>(), clear: new Set<number>() })
  const [clearModal, setClearModal] = React.useState<{ id: number; name: string } | null>(null)
  const toast = useToastContext()

  const load = React.useCallback(async () => {
    const list = await window.api.credentials.listSelected()
    setRows(list)
  }, [])

  React.useEffect(() => { load() }, [load])

  function setField(pid:number, key:'username'|'password', value:string) {
    setEdit(prev => ({ ...prev, [pid]: { username: prev[pid]?.username ?? '', password: prev[pid]?.password ?? '', [key]: value } }))
  }

  async function onSave(pid:number) {
    setLoading(prev => ({ ...prev, save: new Set([...prev.save, pid]) }))
    const name = rows.find(r => r.platform_id === pid)?.name || 'Plateforme'
    const tid = toast.loading(`Sauvegarde des identifiants pour ${name}…`)
    try {
      const u = edit[pid]?.username ?? rows.find(r=>r.platform_id===pid)?.username ?? ''
      const p = edit[pid]?.password ?? ''
      if (!u) throw new Error('Login requis')
      if (!p) throw new Error('Mot de passe requis')
      await window.api.credentials.set({ platform_id: pid, username: u, password: p })
      setEdit(prev => ({ ...prev, [pid]: { username: '', password: '' } }))
      await load()
      toast.update(tid, { type: 'success', title: 'Identifiants enregistrés', message: `Pour ${name}`, duration: 3000 })
    } catch (e) {
      toast.update(tid, { type: 'error', title: 'Erreur de sauvegarde', message: String(e), duration: 5000 })
    } finally {
      setLoading(prev => ({ ...prev, save: new Set([...prev.save].filter(x => x !== pid)) }))
    }
  }

  async function togglePasswordVisibility(pid: number) {
    if (showPassword[pid]) {
      setShowPassword(prev => ({ ...prev, [pid]: false }))
      return
    }

    try {
      const value = await window.api.credentials.reveal(pid)
      setEdit(prev => ({ ...prev, [pid]: { ...prev[pid], password: value } }))
      setShowPassword(prev => ({ ...prev, [pid]: true }))
    } catch (e) {
      toast.error('Erreur', 'Impossible d\'afficher le mot de passe')
    }
  }

  async function confirmClear() {
    if (!clearModal) return
    setLoading(prev => ({ ...prev, clear: new Set([...prev.clear, clearModal.id]) }))
    const tid = toast.loading(`Suppression des identifiants pour ${clearModal.name}…`)
    try {
      await window.api.credentials.delete(clearModal.id)
      await load()
      toast.update(tid, { type: 'success', title: 'Identifiants effacés', message: `Pour ${clearModal.name}`, duration: 3000 })
      setClearModal(null)
    } catch (e) {
      toast.update(tid, { type: 'error', title: 'Erreur', message: String(e), duration: 5000 })
    } finally {
      setLoading(prev => ({ ...prev, clear: new Set([...prev.clear].filter(x => x !== clearModal.id)) }))
    }
  }

  const badge = (status: string) => {
    const map: Record<string, string> = {
      ready: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      maintenance: 'bg-amber-100 text-amber-800 border-amber-200',
      building: 'bg-neutral-100 text-neutral-800 border-neutral-200',
      deprecated: 'bg-red-100 text-red-800 border-red-200'
    }
    return <span className={`text-xs px-2 py-0.5 rounded border ${map[status] || map.ready}`}>{status}</span>
  }

  return (
    <>
      <p className="text-sm text-neutral-500 mb-4">Un seul identifiant par plateforme sélectionnée (utilisé pour toutes les pages).</p>

      <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 dark:bg-neutral-800/60">
            <tr>
              <th className="text-left px-3 py-2">Plateforme</th>
              <th className="text-left px-3 py-2">Statut</th>
              <th className="text-left px-3 py-2">Login</th>
              <th className="text-left px-3 py-2">Mot de passe</th>
              <th className="px-3 py-2 w-[260px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center">
                  <div className="space-y-3">
                    <div className="text-neutral-500">Aucune plateforme sélectionnée</div>
                    <div className="text-sm text-neutral-400">Vous devez d'abord activer des plateformes pour pouvoir ajouter des identifiants.</div>
                    <Link to="/platforms">
                      <Button variant="secondary" size="sm" className="inline-flex items-center gap-2">
                        Sélectionner des plateformes
                        <ArrowRight size={14} />
                      </Button>
                    </Link>
                  </div>
                </td>
              </tr>
            ) : rows.map((r, index) => (
              <tr key={r.platform_id} className={`border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${index % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-neutral-50/30 dark:bg-neutral-800/20'}`}>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{badge(r.status)}</td>
                <td className="px-3 py-2">
                  <input value={edit[r.platform_id]?.username ?? r.username ?? ''}
                         onChange={(e)=>setField(r.platform_id, 'username', e.target.value)}
                         placeholder="Identifiant"
                         className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent" />
                </td>
                <td className="px-3 py-2">
                  <div className="relative">
                    <input
                      type={showPassword[r.platform_id] ? 'text' : 'password'}
                      value={edit[r.platform_id]?.password ?? ''}
                      onChange={(e)=>setField(r.platform_id, 'password', e.target.value)}
                      placeholder={r.has_creds ? '••••••' : 'Mot de passe'}
                      className="w-full px-3 py-2 pr-10 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent"
                    />
                    {r.has_creds && (
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(r.platform_id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                      >
                        {showPassword[r.platform_id] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-right space-x-2">
                  <Button onClick={()=>onSave(r.platform_id)} loading={loading.save.has(r.platform_id)} size="sm">
                    Enregistrer
                  </Button>
                  {r.has_creds && (
                    <Button onClick={()=>setClearModal({ id: r.platform_id, name: r.name })} variant="danger" size="sm">
                      Effacer
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      <ConfirmModal
        isOpen={!!clearModal}
        onClose={() => setClearModal(null)}
        onConfirm={confirmClear}
        title="Effacer les identifiants"
        message={`Êtes-vous sûr de vouloir effacer les identifiants pour "${clearModal?.name}" ? Cette action est irréversible.`}
        confirmText="Effacer"
        loading={clearModal ? loading.clear.has(clearModal.id) : false}
      />
    </>
  )
}
