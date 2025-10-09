import React from 'react'
import Button from '../Button'

interface LeadFormActionsProps {
  onCancel: () => void
  onFillDefaults: () => void
  onSubmit: () => void
  isSubmitting: boolean
  isSchemaLoaded: boolean
}

export default function LeadFormActions({
  onCancel,
  onFillDefaults,
  onSubmit,
  isSubmitting,
  isSchemaLoaded
}: LeadFormActionsProps) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
      <div className="flex gap-2">
        <Button
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button
          onClick={onFillDefaults}
          disabled={isSubmitting || !isSchemaLoaded}
          variant="secondary"
        >
          Remplir par défaut
        </Button>
      </div>
      <Button
        onClick={onSubmit}
        variant="primary"
        loading={isSubmitting}
      >
        Créer le lead
      </Button>
    </div>
  )
}
