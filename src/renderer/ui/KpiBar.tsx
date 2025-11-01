import React, { useMemo } from 'react'
import type { Task, Quote } from '../../shared/types/canonical'

export function KpiBar(p: { tasks: Task[]; leadsCount: number; quotes?: Quote[] }) {
  const stats = useMemo(() => {
    const s = { pending: 0, running: 0, success: 0, failed: 0 }
    p.tasks.forEach((t) => ((s as any)[t.status]++))
    return s
  }, [p.tasks])
  const qstats = useMemo(() => {
    const s = { total: 0, active: 0, won: 0, lost: 0 };
    (p.quotes || []).forEach((q: Quote) => {
      s.total++
      if (q.status === 'won') s.won++
      else if (q.status === 'lost') s.lost++
      else s.active++
    })
    return s
  }, [p.quotes])

  return (
    <div className="grid grid-cols-8 gap-2 px-3 py-2 border-b bg-white text-sm">
      <Kpi label="Leads" value={p.leadsCount} color="text-neutral-700" />
      <Kpi label="Devis actifs" value={qstats.active} color="text-blue-700" />
      <Kpi label="Gagnés" value={qstats.won} color="text-green-700" />
      <Kpi label="Perdus" value={qstats.lost} color="text-rose-700" />
      <Kpi label="En attente" value={stats.pending} color="text-amber-600" />
      <Kpi label="En cours" value={stats.running} color="text-blue-600" />
      <Kpi label="Succès" value={stats.success} color="text-green-600" />
      <Kpi label="Échecs" value={stats.failed} color="text-rose-600" />
    </div>
  )
}

function Kpi(p: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <div className={`text-lg font-semibold ${p.color}`}>{p.value}</div>
      <div className="opacity-70">{p.label}</div>
    </div>
  )
}
