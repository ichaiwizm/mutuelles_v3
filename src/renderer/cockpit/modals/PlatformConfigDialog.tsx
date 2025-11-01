import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogClose } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Checkbox } from '../../components/ui/checkbox'
import { MockBridge } from '../../mocks/bridge'

export function PlatformConfigDialog(p: { open: boolean; onClose: () => void; platform: string }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [headless, setHeadless] = useState(true)
  const [screens, setScreens] = useState(false)
  const [timeout, setTimeoutVal] = useState(60)
  const [testing, setTesting] = useState<'idle'|'running'|'ok'|'ko'>('idle')
  const test = async () => {
    setTesting('running')
    const ok = await MockBridge.platformsConfig.test(p.platform, { username, password, headless, screens, timeout })
    setTesting(ok ? 'ok' : 'ko')
  }
  return (
    <Dialog open={p.open}>
      <DialogContent className="max-w-lg">
        <DialogHeader>{p.platform} — Configuration</DialogHeader>
        <DialogBody>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <label>Login</label>
            <Input className="col-span-2" value={username} onChange={(e)=> setUsername(e.target.value)} />
            <label>Mot de passe</label>
            <Input className="col-span-2" type="password" value={password} onChange={(e)=> setPassword(e.target.value)} />
            <label>Headless</label>
            <div className="col-span-2"><Checkbox checked={headless} onChange={(e)=> setHeadless(e.target.checked)} /> <span className="text-xs opacity-60">(plus rapide)</span></div>
            <label>Captures</label>
            <div className="col-span-2"><Checkbox checked={screens} onChange={(e)=> setScreens(e.target.checked)} /> <span className="text-xs opacity-60">(debug)</span></div>
            <label>Timeout (s)</label>
            <Input className="col-span-2" value={timeout} onChange={(e)=> setTimeoutVal(Number(e.target.value||60))} />
          </div>
          <div className="mt-3 flex gap-2 items-center">
            <Button variant="outline" onClick={test} disabled={testing==='running'}>Tester la connexion</Button>
            {testing==='ok' && <span className="text-green-600 text-sm">✅ Fonctionne</span>}
            {testing==='ko' && <span className="text-rose-600 text-sm">❌ Échec</span>}
            {testing==='running' && <span className="text-sm opacity-70">Test en cours…</span>}
            <div className="ml-auto"><DialogClose asChild><Button>Enregistrer</Button></DialogClose></div>
          </div>
          <div className="text-xs opacity-60 mt-2">🔒 Stocké localement uniquement</div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

