import React, { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogClose } from '../../components/ui/dialog'
import { Select } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import type { Task } from '../../../shared/types/canonical'
import { MockBridge } from '../../mocks/bridge'

export function LogsDialog(p: { open: boolean; onClose: () => void; leadId: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [platform, setPlatform] = useState<string>('all')
  useEffect(()=> { if (p.open) MockBridge.tasks.listByLead(p.leadId).then(setTasks) }, [p.open, p.leadId])
  const platforms = useMemo(()=> ['all', ...Array.from(new Set(tasks.map(t=> t.platform)))], [tasks])
  const filtered = useMemo(()=> tasks.filter(t=> platform==='all' || t.platform===platform), [tasks, platform])
  return (
    <Dialog open={p.open}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>Logs détaillés</DialogHeader>
        <DialogBody>
          <div className="flex items-center gap-2 mb-2">
            <Select value={platform} onChange={(e)=> setPlatform(e.target.value)}>
              {platforms.map((pl)=> <option key={pl} value={pl}>{pl}</option>)}
            </Select>
            <div className="text-xs opacity-60">{filtered.length} exécutions</div>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {filtered.map((t)=> (
              <div key={t.id} className="border rounded">
                <div className="px-2 py-1 text-sm bg-neutral-50 border-b">{t.platform} · {t.product} — {t.status}</div>
                <pre className="text-xs p-2 whitespace-pre-wrap">{t.logs || '—'}</pre>
                <div className="px-2 py-1 border-t text-right"><Button variant="outline" onClick={()=> MockBridge.tasks.rerun(t.id)}>🔄 Réessayer</Button></div>
              </div>
            ))}
            {filtered.length===0 && <div className="text-sm opacity-60">Aucun log</div>}
          </div>
          <div className="mt-3 text-right"><DialogClose asChild><Button variant="outline">Fermer</Button></DialogClose></div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

