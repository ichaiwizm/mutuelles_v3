import React from 'react'
import { Users, Plus } from 'lucide-react'
import type { FullLead } from '@shared/types/leads'

interface LeadsTableProps {
  leads: FullLead[]
  loading: boolean
  onAddLead: () => void
  onViewLead: (lead: FullLead) => void
  onEditLead: (lead: FullLead) => void
  onDeleteLead: (lead: FullLead) => void
}

export default function LeadsTable({
  leads,
  loading,
  onAddLead,
  onViewLead,
  onEditLead,
  onDeleteLead
}: LeadsTableProps) {
  if (loading) {
    return (
      <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="p-8 text-center text-neutral-500">
          Chargement des leads...
        </div>
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="p-8 text-center">
          <div className="space-y-3">
            <Users className="mx-auto h-12 w-12 text-neutral-400" />
            <div className="text-neutral-500">Aucun lead trouvé</div>
            <div className="text-sm text-neutral-400">
              Commencez par ajouter des leads manuellement ou via Gmail
            </div>
            <div className="pt-2">
              <button
                onClick={onAddLead}
                className="flex items-center gap-2 mx-auto px-3 py-2 rounded-md bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-sm"
              >
                <Plus size={16} />
                Ajouter un lead
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-neutral-100 dark:bg-neutral-800/60">
          <tr>
            <th className="text-left px-3 py-2">Contact</th>
            <th className="text-left px-3 py-2">Souscripteur</th>
            <th className="text-left px-3 py-2">Date</th>
            <th className="px-3 py-2 w-[180px]"></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead, index) => (
            <tr key={lead.id} className={`border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${
              index % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-neutral-50/30 dark:bg-neutral-800/20'
            }`}>
              <td className="px-3 py-2">
                <div>
                  <div className="font-medium">
                    {lead.data.subscriber?.firstName} {lead.data.subscriber?.lastName}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {lead.data.subscriber?.email}
                  </div>
                  {lead.data.subscriber?.telephone && (
                    <div className="text-xs text-neutral-400">
                      {lead.data.subscriber.telephone}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-3 py-2">
                <div>
                  <div className="text-xs text-neutral-500">
                    {lead.data.subscriber?.profession || 'Non renseigné'}
                  </div>
                  <div className="text-xs text-neutral-400">
                    {lead.data.subscriber?.regime || 'Régime non défini'}
                  </div>
                  {lead.data.subscriber?.childrenCount !== undefined && (
                    <div className="text-xs text-neutral-400">
                      {lead.data.subscriber.childrenCount} enfant(s)
                    </div>
                  )}
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="text-xs text-neutral-500">
                  {new Date(lead.createdAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </div>
                <div className="text-xs text-neutral-400">
                  {new Date(lead.createdAt).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </td>
              <td className="px-3 py-2 text-right">
                <div className="space-x-2">
                  <button
                    onClick={() => onViewLead(lead)}
                    className="px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    Voir
                  </button>
                  <button
                    onClick={() => onEditLead(lead)}
                    className="px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => onDeleteLead(lead)}
                    className="px-2 py-1 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Supprimer
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
