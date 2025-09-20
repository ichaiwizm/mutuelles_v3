import React from 'react'
import Button from '../components/Button'
import ConfirmModal from '../components/ConfirmModal'
import { useToastContext } from '../contexts/ToastContext'
import { MoreVertical } from 'lucide-react'

type Row = { id:number; name:string; user_data_dir:string; browser_channel:string|null; initialized_at:string|null }

export default function Profiles() {
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState({ create: false, init: false, del: false, open: false, pick: false })
  const [deleteModal, setDeleteModal] = React.useState<{ id: number; name: string } | null>(null)
  const [chromePath, setChromePath] = React.useState<string | null>(null)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const toast = useToastContext()

  const load = React.useCallback(async () => {
    const list = await window.api.profiles.list()
    setRows(list)
    const hasBrowsers = (window.api as any).browsers
    if (hasBrowsers && typeof window.api.browsers.getChromePath === 'function') {
      setChromePath(await window.api.browsers.getChromePath())
    } else {
      setChromePath(null)
    }
  }, [])
  React.useEffect(() => { load() }, [load])

  const single = rows[0]

  async function onCreate() {
    setLoading(prev => ({ ...prev, create: true }))
    try {
      const r = await window.api.profiles.create({ name: 'Profil Chrome' })
      await load()
      const tid = toast.loading('Initialisation en cours…')
      setLoading(prev => ({ ...prev, init: true }))
      await window.api.profiles.init(r.id)
      await load()
      toast.update(tid, { type: 'success', title: 'Profil initialisé', message: 'Chrome a préparé le profil', duration: 3000 })
    } catch (e) {
      toast.error('Erreur', e instanceof Error ? e.message : String(e), { duration: 5000 })
    } finally {
      setLoading(prev => ({ ...prev, create: false, init: false }))
    }
  }

  async function onInit() {
    if (!single) return
    setLoading(prev => ({ ...prev, init: true }))
    try {
      const tid = toast.loading('Initialisation en cours…')
      await window.api.profiles.init(single.id)
      await load()
      toast.update(tid, { type: 'success', title: 'Profil initialisé', duration: 3000 })
    }
    catch (e) { toast.error('Erreur', String(e)) }
    finally { setLoading(prev => ({ ...prev, init: false })) }
  }

  async function onTest() {
    if (!single) return
    setLoading(prev => ({ ...prev, test: true }))
    try { await window.api.profiles.test(single.id) }
    catch (e) { toast.error('Erreur', String(e)) }
    finally { setLoading(prev => ({ ...prev, test: false })) }
  }

  async function onOpenDir() {
    if (!single) return
    setLoading(prev => ({ ...prev, open: true }))
    try { await window.api.profiles.openDir(single.id) }
    catch { toast.error('Erreur', "Impossible d'ouvrir le dossier") }
    finally { setLoading(prev => ({ ...prev, open: false })) }
  }

  async function onPickChrome() {
    if (!(window.api as any).browsers?.pickChrome) {
      toast.warning('Action requise', 'Redémarrez l’application pour activer la détection de Chrome.')
      return
    }
    setLoading(prev => ({ ...prev, pick: true }))
    try { const p = await window.api.browsers.pickChrome(); setChromePath(p) }
    catch (e) { toast.error('Erreur', String(e)) }
    finally { setLoading(prev => ({ ...prev, pick: false })) }
  }

  async function confirmDelete() {
    if (!single) return
    setLoading(prev => ({ ...prev, del: true }))
    try {
      await window.api.profiles.delete(single.id)
      setDeleteModal(null)
      await load()
      toast.success('Profil supprimé')
    }
    catch (e) { toast.error('Erreur de suppression', String(e)) }
    finally { setLoading(prev => ({ ...prev, del: false })) }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Profil Chrome</h1>
      <p className="text-sm text-neutral-500">Un seul profil dédié, utilisé pour conserver vos sessions.</p>

      {!single ? (
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3 max-w-xl">
          <div className="flex gap-2">
            <Button onClick={onCreate} loading={loading.create} variant="primary">Créer le profil</Button>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{single.name}</div>
              <div className="text-xs mt-1">État: {single.initialized_at ? <span className="text-emerald-700">Initialisé</span> : <span className="text-amber-700">Non initialisé</span>}</div>
            </div>
            <div className="flex gap-2 items-center">
              {!single.initialized_at && <Button onClick={onInit} loading={loading.init}>Initialiser</Button>}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="p-2 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  aria-label="Plus d’options"
                >
                  <MoreVertical size={16} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg z-10">
                    <button onClick={() => { setMenuOpen(false); onOpenDir() }} className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">Ouvrir le dossier</button>
                    <button onClick={() => { setMenuOpen(false); onPickChrome() }} className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">Choisir Chrome…</button>
                    <button onClick={() => { setMenuOpen(false); setDeleteModal({ id: single.id, name: single.name }) }} className="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50 dark:hover:bg-red-950">Supprimer</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={confirmDelete}
        title="Supprimer le profil"
        message={`Supprimer le profil \"${deleteModal?.name}\" ? Le dossier disque ne sera pas supprimé.`}
        confirmText="Supprimer"
        loading={loading.del}
      />
    </section>
  )
}
