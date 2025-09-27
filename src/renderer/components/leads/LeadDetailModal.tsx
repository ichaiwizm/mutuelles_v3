import React from 'react'
import { X, Calendar, Mail, Phone, MapPin, User, Briefcase, Users, Star } from 'lucide-react'
import type { FullLead } from '../../../shared/types/leads'
import LeadStatusBadge from './LeadStatusBadge'

interface LeadDetailModalProps {
  lead: FullLead | null
  isOpen: boolean
  onClose: () => void
  onEdit: (lead: FullLead) => void
  onDelete: (lead: FullLead) => void
}

export default function LeadDetailModal({ lead, isOpen, onClose, onEdit, onDelete }: LeadDetailModalProps) {
  if (!isOpen || !lead) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              {lead.contact.prenom} {lead.contact.nom}
            </h2>
            <LeadStatusBadge
              source={lead.rawLead.source}
              provider={lead.rawLead.provider}
            />
            <div className="flex items-center gap-1">
              <Star className={`w-4 h-4 ${lead.qualityScore >= 8 ? 'text-emerald-500' : lead.qualityScore >= 5 ? 'text-amber-500' : 'text-red-500'}`} />
              <span className="font-mono text-sm">{lead.qualityScore}/10</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(lead)}
              className="px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Modifier
            </button>
            <button
              onClick={() => onDelete(lead)}
              className="px-3 py-2 text-sm rounded-md border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Supprimer
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-6 p-6">
            {/* Colonne gauche */}
            <div className="space-y-6">
              {/* Contact */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                  <User size={16} />
                  Informations de contact
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">Civilité:</span>
                    <span>{lead.contact.civilite}</span>
                  </div>
                  {lead.contact.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-neutral-400" />
                      <span>{lead.contact.email}</span>
                    </div>
                  )}
                  {lead.contact.telephone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-neutral-400" />
                      <span>{lead.contact.telephone}</span>
                    </div>
                  )}
                  {(lead.contact.adresse || lead.contact.ville || lead.contact.codePostal) && (
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-neutral-400 mt-0.5" />
                      <div>
                        {lead.contact.adresse && <div>{lead.contact.adresse}</div>}
                        {(lead.contact.codePostal || lead.contact.ville) && (
                          <div>{lead.contact.codePostal} {lead.contact.ville}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Souscripteur */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                  <Briefcase size={16} />
                  Souscripteur
                </h3>
                <div className="space-y-2 text-sm">
                  {lead.souscripteur.dateNaissance && (
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-neutral-400" />
                      <span>Né(e) le {formatDate(lead.souscripteur.dateNaissance)}</span>
                    </div>
                  )}
                  {lead.souscripteur.profession && (
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500">Profession:</span>
                      <span>{lead.souscripteur.profession}</span>
                    </div>
                  )}
                  {lead.souscripteur.regimeSocial && (
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500">Régime:</span>
                      <span>{lead.souscripteur.regimeSocial}</span>
                    </div>
                  )}
                  {lead.souscripteur.nombreEnfants !== undefined && (
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-neutral-400" />
                      <span>{lead.souscripteur.nombreEnfants} enfant(s)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Conjoint */}
              {lead.conjoint && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                    <Users size={16} />
                    Conjoint
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500">Nom:</span>
                      <span>{lead.conjoint.civilite} {lead.conjoint.prenom} {lead.conjoint.nom}</span>
                    </div>
                    {lead.conjoint.dateNaissance && (
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-neutral-400" />
                        <span>Né(e) le {formatDate(lead.conjoint.dateNaissance)}</span>
                      </div>
                    )}
                    {lead.conjoint.profession && (
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500">Profession:</span>
                        <span>{lead.conjoint.profession}</span>
                      </div>
                    )}
                    {lead.conjoint.regimeSocial && (
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500">Régime:</span>
                        <span>{lead.conjoint.regimeSocial}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Colonne droite */}
            <div className="space-y-6">
              {/* Besoins */}
              {lead.besoins && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    Besoins et attentes
                  </h3>
                  <div className="space-y-2 text-sm">
                    {lead.besoins.dateEffet && (
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500">Date d'effet:</span>
                        <span>{formatDate(lead.besoins.dateEffet)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500">Actuellement assuré:</span>
                      <span className={lead.besoins.assureActuellement ? 'text-emerald-600' : 'text-red-600'}>
                        {lead.besoins.assureActuellement ? 'Oui' : 'Non'}
                      </span>
                    </div>
                    {lead.besoins.gammes && lead.besoins.gammes.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="text-neutral-500">Gammes:</span>
                        <div className="flex flex-wrap gap-1">
                          {lead.besoins.gammes.map((gamme, index) => (
                            <span key={index} className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded">
                              {gamme}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {lead.besoins.niveaux && (
                      <div className="space-y-1">
                        <span className="text-neutral-500">Niveaux souhaités:</span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(lead.besoins.niveaux).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                              <span className="font-mono">{value}/5</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {lead.besoins.madelin && (
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500">Madelin:</span>
                        <span className="text-emerald-600">Oui</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Enfants */}
              {lead.enfants && lead.enfants.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    Enfants à charge
                  </h3>
                  <div className="space-y-2 text-sm">
                    {lead.enfants.map((enfant, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-neutral-500">Enfant {index + 1}:</span>
                        {enfant.dateNaissance && (
                          <span>{formatDate(enfant.dateNaissance)}</span>
                        )}
                        {enfant.sexe && (
                          <span className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded">
                            {enfant.sexe}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Métadonnées */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Informations de traitement
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">Créé le:</span>
                    <span>{formatDateTime(lead.cleanedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">Extrait le:</span>
                    <span>{formatDateTime(lead.rawLead.extractedAt)}</span>
                  </div>
                  {lead.rawLead.provider && (
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500">Provider:</span>
                      <span className="capitalize">{lead.rawLead.provider}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">ID:</span>
                    <span className="font-mono text-xs text-neutral-400">{lead.id}</span>
                  </div>
                </div>
              </div>

              {/* Contenu brut (dans un accordion) */}
              <details className="space-y-3">
                <summary className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  Contenu source
                </summary>
                <div className="mt-2 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded text-xs">
                  <pre className="whitespace-pre-wrap text-neutral-600 dark:text-neutral-400">
                    {lead.rawLead.rawContent}
                  </pre>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}