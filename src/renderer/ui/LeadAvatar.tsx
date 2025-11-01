import React from 'react'
import type { LeadGenerique } from '../../shared/types/canonical'

export function LeadAvatar(p: { lead: LeadGenerique; size?: number }) {
  const size = p.size ?? 24
  const name = ((p.lead.subscriber.firstName || '?')[0] + (p.lead.subscriber.lastName || '?')[0]).toUpperCase()
  return (
    <div
      className="rounded-full bg-blue-100 text-blue-700 flex items-center justify-center"
      style={{ width: size, height: size, fontSize: Math.floor(size * 0.45) }}
    >
      {name}
    </div>
  )
}

