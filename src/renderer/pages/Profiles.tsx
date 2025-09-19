import React from 'react'
import Button from '../components/Button'
import ConfirmModal from '../components/ConfirmModal'
import { useToastContext } from '../contexts/ToastContext'

type Row = { id:number; name:string; user_data_dir:string; browser_channel:string|null }

export default function Profiles() {
  const [rows, setRows] = React.useState<Row[]>([])
  const [name, setName] = React.useState('')
  const [loading, setLoading] = React.useState({ create: false, delete: new Set<number>(), open: new Set<number>() })
  const [deleteModal, setDeleteModal] = React.useState<{ id: number; name: string } | null>(null)
  const toast = useToastContext()

  const load = React.useCallback(() => window.api.profiles.list().then(setRows), [])
  React.useEffect(() => { load() }, [load])

  async function onCreate() {
    setLoading(prev => ({ ...prev, create: true }))
    try {
      if (name.trim().length < 2) throw new Error('Nom trop court')
      await window.api.profiles.create({ name: name.trim() })
      setName('')
      await load()
      toast.success('Profil créé', `Le profil "${name.trim()}" a été créé avec succès`)
    } catch (e) {
      toast.error('Erreur', e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(prev => ({ ...prev, create: false }))
    }
  }

  async function confirmDelete() {
    if (!deleteModal) return

    setLoading(prev => ({ ...prev, delete: new Set([...prev.delete, deleteModal.id]) }))
    try {
      await window.api.profiles.delete(deleteModal.id)
      await load()
      toast.success('Profil supprimé', `Le profil "${deleteModal.name}" a été supprimé`)
      setDeleteModal(null)
    } catch (e) {
      toast.error('Erreur de suppression', String(e))
    } finally {
      setLoading(prev => ({ ...prev, delete: new Set([...prev.delete].filter(x => x !== deleteModal.id)) }))
    }
  }

  async function onOpenDir(id:number) {
    setLoading(prev => ({ ...prev, open: new Set([...prev.open, id]) }))
    try {
      await window.api.profiles.openDir(id)
    } catch (e) {
      toast.error('Erreur', 'Impossible d\'ouvrir le dossier')
    } finally {
      setLoading(prev => ({ ...prev, open: new Set([...prev.open].filter(x => x !== id)) }))
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Profils Chrome</h1>
      <p className="text-sm text-neutral-500">
        Créez un profil dédié pour conserver vos sessions d’authentification.
      </p>

      <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3 max-w-xl">
        <div className="text-sm font-medium mb-2">Nouveau profil</div>
        <div className="flex gap-2">
          <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Nom du profil"
                 className="flex-1 px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent" />
          <Button onClick={onCreate} loading={loading.create} variant="primary">
            Créer
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 dark:bg-neutral-800/60">
            <tr>
              <th className="text-left px-3 py-2">Nom</th>
              <th className="text-left px-3 py-2">Dossier</th>
              <th className="px-3 py-2 w-[180px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-neutral-500">Aucun profil — créez-en un.</td>
              </tr>
            ) : rows.map((r, index) => (
              <tr key={r.id} className={`border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${index % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-neutral-50/30 dark:bg-neutral-800/20'}`}>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-neutral-500 truncate max-w-[520px]">{r.user_data_dir}</td>
                <td className="px-3 py-2 text-right space-x-2">
                  <Button onClick={()=>onOpenDir(r.id)} loading={loading.open.has(r.id)} size="sm">
                    Ouvrir
                  </Button>
                  <Button onClick={()=>setDeleteModal({ id: r.id, name: r.name })} variant="danger" size="sm">
                    Supprimer
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={confirmDelete}
        title="Supprimer le profil"
        message={`Êtes-vous sûr de vouloir supprimer le profil "${deleteModal?.name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        loading={deleteModal ? loading.delete.has(deleteModal.id) : false}
      />
    </section>
  )
}
