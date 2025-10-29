/**
 * Modal for previewing and confirming lead creation from emails
 */

import { useState, useMemo } from 'react'
import type { EnrichedLeadData } from '../../../shared/types/emailParsing'
import type { EmailMessage } from '../../../shared/types/email'
import Modal from '../../Modal'

interface EmailToLeadPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  enrichedLeads: EnrichedLeadData[]
  originalEmails: EmailMessage[]
  onConfirm: (selectedLeads: EnrichedLeadData[]) => void
  isCreating: boolean
}

export function EmailToLeadPreviewModal({
  isOpen,
  onClose,
  enrichedLeads,
  originalEmails,
  onConfirm,
  isCreating
}: EmailToLeadPreviewModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(enrichedLeads.map((l) => l.metadata.emailId))
  )
  const [copySuccess, setCopySuccess] = useState(false)
  const [viewMode, setViewMode] = useState<'simple' | 'table'>(() => 'simple')

  // Group leads by validation status
  const groupedLeads = useMemo(() => {
    const valid = enrichedLeads.filter((l) => l.validationStatus === 'valid')
    const partial = enrichedLeads.filter((l) => l.validationStatus === 'partial')
    const invalid = enrichedLeads.filter((l) => l.validationStatus === 'invalid')

    return { valid, partial, invalid }
  }, [enrichedLeads])

  const selectedCount = useMemo(() => {
    return enrichedLeads.filter((l) => selectedIds.has(l.metadata.emailId)).length
  }, [enrichedLeads, selectedIds])

  const handleToggle = (emailId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId)
    } else {
      newSelected.add(emailId)
    }
    setSelectedIds(newSelected)
  }

  const handleToggleAll = () => {
    if (selectedIds.size === enrichedLeads.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(enrichedLeads.map((l) => l.metadata.emailId)))
    }
  }

  const handleDeselectInvalid = () => {
    const newSelected = new Set(
      enrichedLeads.filter((l) => l.validationStatus !== 'invalid').map((l) => l.metadata.emailId)
    )
    setSelectedIds(newSelected)
  }

  const handleConfirm = () => {
    const selected = enrichedLeads.filter((l) => selectedIds.has(l.metadata.emailId))
    onConfirm(selected)
  }

  const handleCopyData = async () => {
    try {
      // Create emailId → EmailMessage lookup map
      const emailMap = new Map(originalEmails.map(email => [email.id, email]))

      // Prepare comprehensive debug data
      const debugData = {
        summary: {
          total: enrichedLeads.length,
          valid: groupedLeads.valid.length,
          partial: groupedLeads.partial.length,
          invalid: groupedLeads.invalid.length,
          selected: selectedCount
        },
        leads: enrichedLeads.map((lead, index) => {
          // ✅ Find matching raw email
          const rawEmail = emailMap.get(lead.metadata.emailId)

          return {
            index: index + 1,
            emailId: lead.metadata.emailId,
            validationStatus: lead.validationStatus,
            confidence: `${lead.metadata.parsingConfidence}%`,
            parserUsed: lead.metadata.parserUsed,

            // Extracted data
            subscriber: {
              civility: lead.parsedData.subscriber?.civility?.value || null,
              lastName: lead.parsedData.subscriber?.lastName?.value || null,
              firstName: lead.parsedData.subscriber?.firstName?.value || null,
              email: lead.parsedData.subscriber?.email?.value || null,
              telephone: lead.parsedData.subscriber?.telephone?.value || null,
              birthDate: lead.parsedData.subscriber?.birthDate?.value || null,
              address: lead.parsedData.subscriber?.address?.value || null,
              postalCode: lead.parsedData.subscriber?.postalCode?.value || null,
              city: lead.parsedData.subscriber?.city?.value || null,
              departmentCode: lead.parsedData.subscriber?.departmentCode?.value || null,
              profession: lead.parsedData.subscriber?.profession?.value || null,
              regime: lead.parsedData.subscriber?.regime?.value || null,
              category: lead.parsedData.subscriber?.category?.value || null,
              status: lead.parsedData.subscriber?.status?.value || null
            },

            spouse: lead.parsedData.spouse ? {
              civility: lead.parsedData.spouse?.civility?.value || null,
              lastName: lead.parsedData.spouse?.lastName?.value || null,
              firstName: lead.parsedData.spouse?.firstName?.value || null,
              birthDate: lead.parsedData.spouse?.birthDate?.value || null,
              regime: lead.parsedData.spouse?.regime?.value || null,
              status: lead.parsedData.spouse?.status?.value || null,
              profession: lead.parsedData.spouse?.profession?.value || null
            } : null,

            children: lead.parsedData.children?.map((child, i) => ({
              index: i + 1,
              birthDate: child.birthDate?.value || null,
              gender: child.gender?.value || null,
              regime: child.regime?.value || null
            })) || [],

            project: {
              dateEffet: lead.parsedData.project?.dateEffet?.value || null,
              plan: lead.parsedData.project?.plan?.value || null,
              madelin: lead.parsedData.project?.madelin?.value || null,
              currentlyInsured: lead.parsedData.project?.currentlyInsured?.value || null
            },

            // Metadata
            missingRequiredFields: lead.missingRequiredFields,
            defaultedFields: lead.defaultedFields,
            warnings: lead.metadata.warnings,
            parsedFieldsCount: lead.metadata.parsedFields.length,

            // Full parsed data structure (for advanced debug)
            _fullParsedData: lead.parsedData,
            _formData: lead.formData,

            // ✅ RAW EMAIL CONTENT
            _rawEmail: rawEmail ? {
              subject: rawEmail.subject,
              from: rawEmail.from,
              date: rawEmail.date,
              snippet: rawEmail.snippet,
              content: rawEmail.content || null,
              htmlContent: rawEmail.htmlContent ? rawEmail.htmlContent.substring(0, 1000) + '...' : null, // Truncate HTML for readability
              hasAttachments: rawEmail.hasAttachments,
              labels: rawEmail.labels
            } : null
          }
        }),

        timestamp: new Date().toISOString(),
        version: '1.0'
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(JSON.stringify(debugData, null, 2))

      // Show success feedback
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)

      console.log('✅ Données copiées dans le clipboard')
    } catch (error) {
      console.error('❌ Erreur lors de la copie:', error)
      alert('Erreur lors de la copie des données')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return '✅'
      case 'partial':
        return '⚠️'
      case 'invalid':
        return '❌'
      default:
        return '❓'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'valid':
        return 'Complet'
      case 'partial':
        return 'Partiel'
      case 'invalid':
        return 'Invalide'
      default:
        return 'Inconnu'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600'
    if (confidence >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Prévisualisation des leads">
      <div className="space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <div className="text-sm font-medium">
              {enrichedLeads.length} email(s) analysé(s)
            </div>
            <div className="text-xs text-gray-600 mt-1 flex gap-3">
              <span>
                ✅ {groupedLeads.valid.length} complet(s)
              </span>
              <span>
                ⚠️ {groupedLeads.partial.length} partiel(s)
              </span>
              <span>
                ❌ {groupedLeads.invalid.length} invalide(s)
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">{selectedCount} sélectionné(s)</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 items-center">
          <button
            onClick={handleToggleAll}
            className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
            disabled={isCreating}
          >
            {selectedIds.size === enrichedLeads.length ? 'Tout décocher' : 'Tout cocher'}
          </button>
          <button
            onClick={handleDeselectInvalid}
            className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
            disabled={isCreating}
          >
            Décocher invalides
          </button>
          <div className="flex-1"></div>
          <div className="hidden sm:flex items-center gap-1 text-xs text-gray-600">
            <span>Affichage:</span>
            <button
              onClick={() => setViewMode('simple')}
              className={`px-2 py-1 border rounded ${viewMode==='simple' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              disabled={isCreating}
            >Simple</button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 border rounded ${viewMode==='table' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              disabled={isCreating}
            >Tableau</button>
          </div>
          <button
            onClick={handleCopyData}
            className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 flex items-center gap-2"
            disabled={isCreating}
            title="Copier toutes les données parsées (debug)"
          >
            {copySuccess ? (
              <>
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-600">Copié !</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copier données
              </>
            )}
          </button>
        </div>

        {viewMode === 'table' ? (
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="p-2 text-left w-10"></th>
                <th className="p-2 text-left w-16">Statut</th>
                <th className="p-2 text-left">Identité</th>
                <th className="p-2 text-left">Contact</th>
                <th className="p-2 text-left">Localisation</th>
                <th className="p-2 text-left">Projet</th>
                <th className="p-2 text-left">Confiance</th>
              </tr>
            </thead>
            <tbody>
              {enrichedLeads.map((lead) => {
                const isSelected = selectedIds.has(lead.metadata.emailId)
                const subscriber = lead.parsedData.subscriber || {}
                const lastName = subscriber.lastName?.value || '?'
                const firstName = subscriber.firstName?.value || '?'
                const email = subscriber.email?.value || ''
                const phone = subscriber.telephone?.value || ''
                const postalCode = subscriber.postalCode?.value || ''
                const city = subscriber.city?.value || ''
                const birth = subscriber.birthDate?.value || ''
                const civ = subscriber.civility?.value || ''
                const dateEffet = lead.parsedData.project?.dateEffet?.value || ''
                const insured = lead.parsedData.project?.currentlyInsured?.value
                const missingCritical = lead.missingRequiredFields?.length || 0

                return (
                  <tr
                    key={lead.metadata.emailId}
                    className={`border-t hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                  >
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggle(lead.metadata.emailId)}
                        disabled={isCreating}
                        className="rounded"
                      />
                    </td>
                    <td className="p-2">
                      <span
                        className="inline-block px-2 py-0.5 text-xs rounded"
                        title={getStatusLabel(lead.validationStatus)}
                      >
                        {getStatusIcon(lead.validationStatus)}
                      </span>
                    </td>
                    <td className="p-2 align-top">
                      <div className="font-medium">{firstName} {lastName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {birth ? `Né(e) le ${birth}` : 'Date inconnue'}{civ ? ` • ${civ}` : ''}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{lead.metadata.parserUsed}</div>
                    </td>
                    <td className="p-2 align-top text-xs text-gray-700">
                      <div>{email || '—'}</div>
                      <div className="text-gray-500">{phone || '—'}</div>
                    </td>
                    <td className="p-2 align-top text-xs text-gray-700">
                      <div>{postalCode || '—'} {city || ''}</div>
                      {subscriber.address?.value && (
                        <div className="text-gray-500 truncate max-w-[220px]" title={subscriber.address.value}>{subscriber.address.value}</div>
                      )}
                    </td>
                    <td className="p-2 align-top text-xs text-gray-700">
                      <div>{dateEffet ? `Effet: ${dateEffet}` : 'Effet: —'}</div>
                      <div className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] ${insured === true ? 'bg-green-50 text-green-700' : insured === false ? 'bg-gray-100 text-gray-700' : 'bg-yellow-50 text-yellow-700'}`}>
                        {insured === true ? 'Assuré: Oui' : insured === false ? 'Assuré: Non' : 'Assuré: Inconnu'}
                      </div>
                      {missingCritical > 0 && (
                        <div className="mt-1 text-[11px] text-red-600">Manquants: {missingCritical}</div>
                      )}
                    </td>
                    <td className="p-2 align-top">
                      <div className={`font-medium ${getConfidenceColor(lead.metadata.parsingConfidence)}`}>
                        {lead.metadata.parsingConfidence}%
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        <span title="Champs parsés">🟢 {lead.metadata.parsedFields.length}</span>
                        <span className="ml-2" title="Champs par défaut">🔵 {lead.defaultedFields.length}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            </table>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto grid gap-2">
            {enrichedLeads.map((lead) => {
              const isSelected = selectedIds.has(lead.metadata.emailId)
              const s = lead.parsedData.subscriber || {}
              const fullName = `${s.firstName?.value || '—'} ${s.lastName?.value || ''}`.trim()
              const info = {
                email: s.email?.value || '—',
                phone: s.telephone?.value || '—',
                birth: s.birthDate?.value || '—',
                cp: s.postalCode?.value || '—',
                city: s.city?.value || '—',
                address: s.address?.value || '—',
                effet: lead.parsedData.project?.dateEffet?.value || '—',
                insured: lead.parsedData.project?.currentlyInsured?.value
              }
              const missing = lead.missingRequiredFields?.length || 0

              return (
                <div key={lead.metadata.emailId} className={`border rounded-lg p-3 ${isSelected ? 'ring-1 ring-blue-400' : ''}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" className="mt-1" checked={isSelected} onChange={() => handleToggle(lead.metadata.emailId)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-medium truncate max-w-[60%]">{fullName || info.phone || info.email}</div>
                        <span title={getStatusLabel(lead.validationStatus)}>{getStatusIcon(lead.validationStatus)}</span>
                        <span className={`text-xs ${getConfidenceColor(lead.metadata.parsingConfidence)}`}>{lead.metadata.parsingConfidence}%</span>
                        {missing > 0 && (
                          <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-700 rounded">Manquants: {missing}</span>
                        )}
                      </div>
                      <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-gray-700">
                        <div><span className="text-gray-500">Email:</span> {info.email}</div>
                        <div><span className="text-gray-500">Tél:</span> {info.phone}</div>
                        <div><span className="text-gray-500">Naissance:</span> {info.birth}</div>
                        <div><span className="text-gray-500">CP/Ville:</span> {info.cp} {info.city}</div>
                        <div className="col-span-2"><span className="text-gray-500">Adresse:</span> <span className="truncate inline-block max-w-full align-bottom" title={info.address}>{info.address}</span></div>
                        <div><span className="text-gray-500">Effet:</span> {info.effet}</div>
                        <div>
                          <span className="text-gray-500">Assuré:</span>{' '}
                          <span className={`px-1 py-0.5 rounded ${info.insured === true ? 'bg-green-50 text-green-700' : info.insured === false ? 'bg-gray-100 text-gray-700' : 'bg-yellow-50 text-yellow-700'}`}>
                            {info.insured === true ? 'Oui' : info.insured === false ? 'Non' : 'Inconnu'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] text-gray-500">
                        🟢 {lead.metadata.parsedFields.length} parsés · 🔵 {lead.defaultedFields.length} par défaut · Parser: {lead.metadata.parserUsed}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Warnings */}
        {enrichedLeads.some((l) => l.metadata.warnings.length > 0) && (
          <div className="p-3 bg-yellow-50/50 border border-yellow-200 rounded-lg text-sm">
            <div className="font-medium mb-1">Avertissements (résumé)</div>
            <div className="text-xs text-gray-700 flex flex-wrap gap-2">
              {enrichedLeads.flatMap((l) => l.metadata.warnings.map((w, i) => (
                <span key={l.metadata.emailId + '-' + i} className="px-2 py-0.5 bg-white/70 border border-yellow-200 rounded">
                  {w}
                </span>
              ))).slice(0, 6)}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
            disabled={isCreating}
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isCreating || selectedCount === 0}
          >
            {isCreating ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Création en cours...
              </>
            ) : (
              `Créer ${selectedCount} lead(s) →`
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
