import { useState } from 'react'
import { Copy } from 'lucide-react'
import { useToastContext } from '@renderer/contexts/ToastContext'
import type { EnrichedLeadData } from '@renderer/hooks/useEmailToLead'
import type { EmailMessage } from '../../../../../shared/types/email'

interface CopyDebugDataButtonProps {
  leads: EnrichedLeadData[]
  emails: EmailMessage[]
}

/**
 * Bouton de debug pour copier toutes les données parsées dans le presse-papier
 * Copie TOUT : emails originaux, leads parsés, metadata, etc.
 */
export function CopyDebugDataButton({ leads, emails }: CopyDebugDataButtonProps) {
  const toast = useToastContext()
  const [isCopying, setIsCopying] = useState(false)

  const handleCopy = async () => {
    setIsCopying(true)

    try {
      // Construire l'objet de debug complet avec TOUTES les données
      const debugData = {
        timestamp: new Date().toISOString(),
        summary: {
          totalLeads: leads.length,
          totalEmails: emails.length,
          validLeads: leads.filter(l => l.validationStatus === 'valid').length,
          partialLeads: leads.filter(l => l.validationStatus === 'partial').length,
          invalidLeads: leads.filter(l => l.validationStatus === 'invalid').length
        },

        // Emails originaux avec TOUS les détails
        emails: emails.map(email => ({
          id: email.id,
          subject: email.subject,
          from: email.from,
          to: email.to,
          date: email.date,
          snippet: email.snippet,
          content: email.content,
          htmlContent: email.htmlContent,
          hasLeadPotential: email.hasLeadPotential,
          detectionReasons: email.detectionReasons,
          labels: email.labels
        })),

        // Leads parsés avec TOUS les détails
        leads: leads.map(lead => ({
          // Données parsées complètes avec tous les ParsedField
          parsedData: {
            subscriber: lead.parsedData.subscriber,
            spouse: lead.parsedData.spouse,
            children: lead.parsedData.children,
            project: lead.parsedData.project,
            metadata: lead.parsedData.metadata
          },

          // Statut de validation
          validationStatus: lead.validationStatus,
          missingRequiredFields: lead.missingRequiredFields,
          defaultedFields: lead.defaultedFields,

          // FormData (format plat pour formulaire)
          formData: lead.formData,

          // Metadata (parsing info)
          metadata: lead.metadata
        }))
      }

      // Convertir en JSON formaté lisible
      const jsonString = JSON.stringify(debugData, null, 2)

      // Copier dans le presse-papier
      await navigator.clipboard.writeText(jsonString)

      // Toast de confirmation
      toast.success(
        'Données copiées',
        `${leads.length} leads et ${emails.length} emails copiés dans le presse-papier`,
        { duration: 3000 }
      )
    } catch (error) {
      console.error('[CopyDebugDataButton] Error copying data:', error)
      toast.error('Erreur', 'Impossible de copier les données dans le presse-papier')
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={isCopying}
      className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
      title="Copier toutes les données de debug (JSON complet avec emails originaux)"
    >
      {isCopying ? (
        <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      <span>Debug</span>
    </button>
  )
}
