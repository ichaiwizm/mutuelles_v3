import React from 'react'

export default function ErrorOverlay() {
  const [msg, setMsg] = React.useState<string>('')

  React.useEffect(() => {
    const onError = (e: ErrorEvent) => setMsg(e.message || 'Erreur inconnue')
    const onRej = (e: PromiseRejectionEvent) => setMsg(String(e.reason || 'Rejet non géré'))
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRej)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRej)
    }
  }, [])

  if (!msg) return null

  return (
    <div className="fixed bottom-3 right-3 max-w-md z-50">
      <div className="rounded-md shadow-lg border border-red-300 bg-red-50 text-red-800 p-3 text-sm">
        <div className="font-semibold">Erreur non interceptée</div>
        <div className="mt-1 whitespace-pre-wrap">{msg}</div>
        <div className="mt-2 flex gap-2 justify-end">
          <button className="px-2 py-1 rounded border" onClick={() => setMsg('')}>Fermer</button>
        </div>
      </div>
    </div>
  )
}

