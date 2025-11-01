import React from 'react'
import type { LeadGenerique } from '../../shared/types/canonical'
import { LeadAvatar } from './LeadAvatar'

export function LeadSnapshot(p: { lead: LeadGenerique | null }) {
  if (!p.lead) return null
  return (
    <div className="p-3 border-t">
      <div className="flex items-center gap-2 mb-2">
        <LeadAvatar lead={p.lead} />
        <div>
          <div className="font-semibold">{displayName(p.lead)}</div>
          <div className="text-sm opacity-70">{p.lead.contact?.email || '—'}</div>
        </div>
      </div>
      <div className="text-sm space-y-1">
        <div>Téléphone: {p.lead.contact?.telephone || '—'}</div>
        <div>Dossier: {String(p.lead.metadata?.folder || 'Nouveaux')}</div>
      </div>
    </div>
  )
}

function displayName(l: LeadGenerique) {
  const f = l.subscriber.firstName || ''
  const n = l.subscriber.lastName || ''
  return (f + ' ' + n).trim() || l.id.slice(0, 8)
}

