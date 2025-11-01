import React, { useEffect, useMemo, useState } from 'react'
import { MockBridge } from '../../mocks/bridge'
import { Progress } from '../../components/ui/progress'
import { Button } from '../../components/ui/button'

export function AutomationsPage() {
  const [ids, setIds] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, { percent: number; step: string }[]>>({})
  useEffect(()=> {
    const iv = setInterval(()=> {
      const leadIds = MockBridge.automations.runningLeadIds()
      setIds(leadIds)
      const o: any = {}
      leadIds.forEach(id => o[id] = MockBridge.automations.getProgress(id))
      setRows(o)
    }, 800)
    return ()=> clearInterval(iv)
  }, [])
  return (
    <section className="p-3 space-y-3">
      {ids.map((id) => (
        <div key={id} className="border rounded p-2">
          <div className="text-sm font-medium mb-2">Lead {id.slice(0,8)}</div>
          <div className="space-y-2">
            {(rows[id]||[]).map((r,i)=> (
              <div key={i}>
                <Progress value={r.percent} />
                <div className="text-xs opacity-70 mt-1">→ {r.step}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Button variant="outline" onClick={()=> MockBridge.automations.pause(id)}>Pause</Button>
            <Button variant="outline" onClick={()=> MockBridge.automations.stop(id)}>Stop</Button>
          </div>
        </div>
      ))}
      {ids.length===0 && <div className="text-sm opacity-60">Aucune automatisation en cours</div>}
    </section>
  )
}

