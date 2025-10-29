import { Pencil } from 'lucide-react'

interface LeadEditButtonProps {
  onClick: () => void
  disabled?: boolean
}

/**
 * Bouton d'édition pour un lead
 * Minimaliste avec icône uniquement
 */
export function LeadEditButton({ onClick, disabled }: LeadEditButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Éditer ce lead"
    >
      <Pencil className="h-4 w-4" />
    </button>
  )
}
