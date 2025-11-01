import React, { useEffect, useMemo, useState } from 'react'
import type { LeadGenerique, Task } from '../../shared/types/canonical'
import { LeadList, type ListItem } from '../ui/LeadList'
import { LeadActions } from '../ui/LeadActions'
import { LeadOverview } from '../ui/LeadOverview'
import { DetailsPanel } from '../ui/DetailsPanel'

export default function BrokerDashboard() {
  const [leads, setLeads] = useState<LeadGenerique[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [showActions, setShowActions] = useState(false)
  const selected = useMemo(() => leads.find((l) => l.id === selectedId) || null, [leads, selectedId])

  useEffect(() => {
    window.apiV2.leads.list(200).then(setLeads)
  }, [])

  useEffect(() => {
    if (!selectedId) return
    window.apiV2.tasks.listByLead(selectedId).then((ts) => {
      setTasks(ts)
      setSelectedTaskId(null)
    })
  }, [selectedId])

  const addLead = async () => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const lead: LeadGenerique = { id, subscriber: {}, contact: {}, needs: [], createdAt: now }
    await window.apiV2.leads.create(lead)
    setLeads([lead, ...leads])
    setSelectedId(id)
  }

  const importCsv = () => alert('Import CSV – à implémenter')

  const enqueueTasks = async (choices: { key: string; checked: boolean }[]) => {
    if (!selected) return
    const toCreate: Task[] = choices
      .filter((c) => c.checked)
      .map((c) => {
        const [platform, product] = c.key.split(':')
        return { id: crypto.randomUUID(), leadId: selected.id, platform, product, status: 'pending', createdAt: new Date().toISOString() }
      })
    if (!toCreate.length) return
    await window.apiV2.tasks.enqueue(toCreate as any)
    const updated = await window.apiV2.tasks.listByLead(selected.id)
    setTasks(updated)
    setShowActions(false)
  }

  const runPending = async () => {
    if (!selected) return
    await window.apiV2.tasks.runPending(selected.id)
    const updated = await window.apiV2.tasks.listByLead(selected.id)
    setTasks(updated)
  }

  const selTask = tasks.find((t) => t.id === selectedTaskId) || null
  return (
    <div className="grid grid-cols-[200px_1fr_340px] gap-3 h-full">
      <LeadList
        items={leads.map((l): ListItem => ({ id: l.id, title: displayName(l), subtitle: l.contact?.email }))}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onAdd={addLead}
        onImport={importCsv}
      />
      <div className="space-y-3">
        {selected && (
          <LeadOverview
            lead={selected}
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            onNewClick={() => setShowActions((v) => !v)}
          />
        )}
        {showActions && selected && <LeadActions lead={selected} onEnqueue={enqueueTasks} />}
        {!selected && <div className="border rounded p-4 opacity-70">Sélectionnez un lead</div>}
      </div>
      {selected && <DetailsPanel lead={selected} task={selTask} />}
      {!selected && <div />}
    </div>
  )
}

function displayName(l: LeadGenerique) {
  const f = l.subscriber.firstName || ''
  const n = l.subscriber.lastName || ''
  return (f + ' ' + n).trim() || l.id.slice(0, 8)
}
