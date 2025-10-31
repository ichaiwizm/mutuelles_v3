import React, { useState } from 'react'

export default function Credentials() {
  const [platform, setPlatform] = useState('swisslife')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<string>('')

  const save = async () => {
    if (!platform || !username || !password) return setStatus('Champs requis manquants')
    await window.apiV2.secrets.set({ platform, username, password })
    setPassword('')
    setStatus('Enregistré')
  }

  const reveal = async () => {
    if (!platform || !username) return setStatus('Champs requis manquants')
    const pwd = await window.apiV2.secrets.get({ platform, username })
    setStatus(pwd ? `Mot de passe: ${pwd}` : 'Aucun mot de passe')
  }

  const remove = async () => {
    if (!platform || !username) return setStatus('Champs requis manquants')
    const ok = await window.apiV2.secrets.delete({ platform, username })
    setStatus(ok ? 'Supprimé' : 'Rien à supprimer')
  }

  return (
    <section className="space-y-3 max-w-xl">
      <h1 className="text-lg font-semibold">Identifiants Plateformes</h1>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">Plateforme</label>
        <input className="border px-2 py-1" value={platform} onChange={(e) => setPlatform(e.target.value)} />
        <label className="text-sm">Utilisateur</label>
        <input className="border px-2 py-1" value={username} onChange={(e) => setUsername(e.target.value)} />
        <label className="text-sm">Mot de passe</label>
        <input className="border px-2 py-1" value={password} type="password" onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button className="px-3 py-1 border rounded" onClick={save}>Enregistrer</button>
        <button className="px-3 py-1 border rounded" onClick={reveal}>Vérifier</button>
        <button className="px-3 py-1 border rounded" onClick={remove}>Supprimer</button>
      </div>
      {status && <div className="text-sm opacity-70">{status}</div>}
    </section>
  )
}

