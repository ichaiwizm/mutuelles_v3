import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = { runId: string }

export default function ScreenshotGallery({ runId }: Props) {
  const [files, setFiles] = React.useState<string[]>([])
  const [active, setActive] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [index, setIndex] = React.useState<number>(-1)

  React.useEffect(() => {
    let mounted = true
    setFiles([])
    setDataUrls({})
    setActive(null)
    setIndex(-1)
    setLoading(true)
    const load = async () => {
      try {
        const list = await window.api.automation.listScreenshots(runId)
        if (!mounted) return
        setFiles(list)
        // Précharge les miniatures (images complètes ici, taille raisonnable)
        for (const f of list) {
          const url = await window.api.automation.getScreenshot(runId, f)
          if (!mounted) return
          setDataUrls(prev => (prev[f] ? prev : { ...prev, [f]: url }))
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [runId])

  const [dataUrls, setDataUrls] = React.useState<Record<string, string>>({})
  function open(file: string) {
    setActive(file)
    setIndex(files.indexOf(file))
  }

  function close() { setActive(null); setIndex(-1) }
  function prev() {
    if (files.length === 0) return
    setIndex(i => {
      if (i <= 0) return i
      const ni = i - 1
      setActive(files[ni])
      return ni
    })
  }
  function next() {
    if (files.length === 0) return
    setIndex(i => {
      if (i >= files.length - 1) return i
      const ni = i + 1
      setActive(files[ni])
      return ni
    })
  }

  React.useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft' && index > 0) prev()
      else if (e.key === 'ArrowRight' && index < files.length - 1) next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, files, index])

  if (loading && files.length === 0) return <div className="text-xs text-neutral-500">Chargement des captures…</div>
  if (!loading && files.length === 0) return <div className="text-xs text-neutral-500">Aucune capture</div>

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {files.map(f => (
          <button key={f} onClick={() => open(f)} className="border border-neutral-200 dark:border-neutral-800 rounded overflow-hidden text-left">
            {dataUrls[f]
              ? <img src={dataUrls[f]} alt={f} className="w-full h-24 object-cover" />
              : <div className="w-full h-24 bg-neutral-100 dark:bg-neutral-800 animate-pulse" />}
            <div className="p-1 text-[10px] truncate">{f}</div>
          </button>
        ))}
      </div>

      {active && dataUrls[active] && (
        <div className="fixed inset-0 bg-black/70 z-[10000] flex items-center justify-center p-4" onClick={close}>
          {/* zone gauche */}
          {index > 0 && (
            <div
              role="button"
              aria-label="Précédent"
              onClick={(e)=>{ e.stopPropagation(); prev() }}
              className="absolute inset-y-0 left-0 w-16 md:w-24 flex items-center justify-center bg-gradient-to-r from-black/40 to-transparent cursor-pointer z-[10001]"
            >
              <ChevronLeft size={36} className="text-white drop-shadow" />
            </div>
          )}
          <img src={dataUrls[active]} alt={active} className="max-h-full max-w-full rounded shadow-lg z-[10000]" onClick={(e)=>e.stopPropagation()} />
          {/* zone droite */}
          {index < files.length - 1 && (
            <div
              role="button"
              aria-label="Suivant"
              onClick={(e)=>{ e.stopPropagation(); next() }}
              className="absolute inset-y-0 right-0 w-16 md:w-24 flex items-center justify-center bg-gradient-to-l from-black/40 to-transparent cursor-pointer z-[10001]"
            >
              <ChevronRight size={36} className="text-white drop-shadow" />
            </div>
          )}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-black/50 text-white text-xs z-[10002]">
            {index+1} / {files.length}
          </div>
        </div>
      )}
    </div>
  )
}
