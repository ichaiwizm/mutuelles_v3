import React, { useEffect, useState } from 'react'
import { MockBridge } from '../mocks/bridge'

export function SettingsModal(p: { open: boolean; onClose: () => void }) {
  const [platform, setPlatform] = useState('swisslife')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState<Record<string, { username: string; password: string }[]>>({})
  if (!p.open) return null

  useEffect(() => {
    const pull = async () => setRows(await MockBridge.secrets.getAll())
    pull()
    return MockBridge.subscribe(pull)
  }, [])

  const save = async () => {
    if (!platform || !username || !password) return setStatus('Champs requis')
    await MockBridge.secrets.set({ platform, username, password })
    setPassword('')
    setStatus('Enregistré')
  }

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center">
      <div className="bg-white w-[560px] rounded shadow border">
        <div className="px-4 py-2 border-b flex items-center justify-between">
          <div className="font-semibold">Paramètres</div>
          <button className="px-2 py-1" onClick={p.onClose}>Fermer</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="font-medium">Identifiants Plateformes</div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <label className="col-span-1">Plateforme</label>
            <input className="col-span-2 border px-2 py-1" value={platform} onChange={(e) => setPlatform(e.target.value)} />
            <label className="col-span-1">Utilisateur</label>
            <input className="col-span-2 border px-2 py-1" value={username} onChange={(e) => setUsername(e.target.value)} />
            <label className="col-span-1">Mot de passe</label>
            <input className="col-span-2 border px-2 py-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 border rounded" onClick={save}>Enregistrer</button>
          </div>
          {status && <div className="text-xs opacity-70">{status}</div>}
          <div className="pt-3 border-t">
            <div className="font-medium mb-1">Enregistrés</div>
            <div className="text-xs opacity-70 mb-2">Mock uniquement</div>
            <div className="space-y-1 text-sm">
              {Object.entries(rows).map(([pkey, creds]) => (
                <div key={pkey} className="border rounded">
                  <div className="px-2 py-1 font-medium bg-neutral-50">{pkey}</div>
                  {creds.map((c) => (
                    <div key={c.username} className="px-2 py-1 flex items-center justify-between">
                      <div>{c.username}</div>
                      <div className="opacity-60">••••••</div>
                    </div>
                  ))}
                </div>
              ))}
              {Object.keys(rows).length === 0 && <div className="opacity-60">Aucun identifiant</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
