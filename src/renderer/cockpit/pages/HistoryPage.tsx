import React from 'react'
import type { Quote, LeadGenerique } from '../../../shared/types/canonical'
import { QuotesTable } from '../../linear/Tables'

export function HistoryPage(p: { quotes: Quote[]; leads: LeadGenerique[]; onSelect: (id: string)=>void }) {
  return (
    <section className="h-full overflow-auto p-3">
      <QuotesTable data={p.quotes} leads={p.leads} onSelect={p.onSelect} />
    </section>
  )
}

