import React, { useEffect, useState } from 'react'
import type { LeadGenerique, Task } from '../../shared/types/canonical'
import { ExecutionDetails } from './ExecutionDetails'
import { PlatformStatusList } from './PlatformStatus'
import { LeadSnapshot } from './LeadSnapshot'
import { Suggestions } from './Suggestions'
import { Timeline, type Event } from './Timeline'
import type { PlatformStatus } from '../mocks/bridge'
import { MockBridge } from '../mocks/bridge'

export function RightColumn(p: { task: Task | null; lead: LeadGenerique | null; platforms: PlatformStatus[]; onRerun: () => void }) {
  const [events, setEvents] = useState<Event[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  useEffect(() => {
    let unsub = () => {}
    const load = async () => {
      if (!p.lead) return setEvents([]), setSuggestions([])
      setEvents(await MockBridge.timeline.listByLead(p.lead.id, 10) as any)
      setSuggestions(await MockBridge.suggest.nextActions(p.lead.id))
    }
    load()
    unsub = MockBridge.subscribe(load)
    return unsub
  }, [p.lead?.id])
  return (
    <aside className="w-80 border-l bg-white h-full overflow-auto">
      <ExecutionDetails task={p.task} lead={p.lead} onRerun={p.onRerun} />
      <LeadSnapshot lead={p.lead || null} />
      <Suggestions items={suggestions} />
      <Timeline items={events} />
      <PlatformStatusList items={p.platforms} />
    </aside>
  )
}
