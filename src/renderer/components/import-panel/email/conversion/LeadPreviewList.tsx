import type { EnrichedLeadData } from '../../../../../shared/types/emailParsing'
import { LeadPreviewCard } from './LeadPreviewCard'

interface LeadPreviewListProps {
  leads: EnrichedLeadData[]
  isSelected: (leadId: string) => boolean
  isComplete: (leadId: string) => boolean
  onToggle: (leadId: string) => void
  onEdit: (lead: EnrichedLeadData) => void
}

/**
 * Liste scrollable des leads avec cartes individuelles
 * Simple container avec gestion du scroll
 */
export function LeadPreviewList({
  leads,
  isSelected,
  isComplete,
  onToggle,
  onEdit
}: LeadPreviewListProps) {
  if (leads.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500 dark:text-gray-400">
        Aucun lead détecté
      </div>
    )
  }

  return (
    <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">
      {leads.map((lead) => {
        const leadId = lead.metadata.emailId

        return (
          <LeadPreviewCard
            key={leadId}
            lead={lead}
            isSelected={isSelected(leadId)}
            isComplete={isComplete(leadId)}
            onToggle={() => onToggle(leadId)}
            onEdit={() => onEdit(lead)}
          />
        )
      })}
    </div>
  )
}
