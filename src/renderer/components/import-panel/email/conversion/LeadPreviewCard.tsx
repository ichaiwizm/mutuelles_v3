import { AlertCircle } from 'lucide-react'
import type { EnrichedLeadData } from '../../../../../shared/types/emailParsing'
import { LeadEditButton } from './LeadEditButton'

interface LeadPreviewCardProps {
  lead: EnrichedLeadData
  isSelected: boolean
  isComplete: boolean
  onToggle: () => void
  onEdit: () => void
}

/**
 * Carte minimaliste pour prévisualiser un lead
 * Design ultra-simple : nom + résumé en 1 ligne
 */
export function LeadPreviewCard({
  lead,
  isSelected,
  isComplete,
  onToggle,
  onEdit
}: LeadPreviewCardProps) {
  const subscriber = lead.parsedData.subscriber
  const project = lead.parsedData.project

  // Construire le nom complet
  const fullName = [
    subscriber?.firstName?.value,
    subscriber?.lastName?.value?.toUpperCase()
  ]
    .filter(Boolean)
    .join(' ')

  // Construire la ligne résumé
  const summaryParts: string[] = []

  // CP + Ville
  const location = [
    subscriber?.postalCode?.value,
    subscriber?.city?.value
  ]
    .filter(Boolean)
    .join(' ')
  if (location) summaryParts.push(location)

  // Date de naissance
  if (subscriber?.birthDate?.value) {
    summaryParts.push(`Né(e) le ${subscriber.birthDate.value}`)
  }

  // Conjoint
  if (lead.parsedData.spouse) {
    summaryParts.push('Conjoint')
  }

  // Enfants
  const childrenCount = lead.parsedData.children?.length
  if (childrenCount) {
    summaryParts.push(`${childrenCount} enfant${childrenCount > 1 ? 's' : ''}`)
  }

  const summary = summaryParts.join(' · ')

  // Traduire les champs manquants en français
  const translateField = (field: string): string => {
    const translations: Record<string, string> = {
      'Téléphone': 'Téléphone',
      'Nom': 'Nom',
      'Prénom': 'Prénom',
      'E-mail': 'Email',
      'Code postal': 'Code postal',
      'Date de naissance': 'Date de naissance',
      'Civilité': 'Civilité',
      'Régime': 'Régime'
    }
    return translations[field] || field
  }

  const missingFields = lead.missingRequiredFields.map(translateField)

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border transition-colors
        ${isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }
      `}
    >
      {/* Checkbox ou warning */}
      <div className="flex-shrink-0 pt-0.5">
        {isComplete ? (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
          />
        ) : (
          <AlertCircle className="h-4 w-4 text-amber-500" />
        )}
      </div>

      {/* Contenu principal */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          {fullName || 'Sans nom'}
          {lead.duplicate?.isDuplicate && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
              Doublon
            </span>
          )}
        </div>
        {summary && (
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {summary}
          </div>
        )}
        {/* Afficher les champs manquants */}
        {!isComplete && missingFields.length > 0 && (
          <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Manquant : {missingFields.join(', ')}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1">
        <LeadEditButton onClick={onEdit} />
      </div>
    </div>
  )
}
