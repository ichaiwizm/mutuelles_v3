import React from 'react'
import { Check, X, AlertCircle, User, Briefcase, Users, Heart } from 'lucide-react'
import type { CreateLeadData, LeadProvider } from '../../../shared/types/leads'

interface ParsedLeadConfirmationProps {
  provider: LeadProvider | null
  data: CreateLeadData
  score: number
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function ParsedLeadConfirmation({
  provider,
  data,
  score,
  onConfirm,
  onCancel,
  loading
}: ParsedLeadConfirmationProps) {
  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-emerald-600 dark:text-emerald-400'
    if (score >= 4) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 7) return 'Excellent'
    if (score >= 4) return 'Moyen'
    return 'Faible'
  }

  const providerLabels: Record<string, string> = {
    assurprospect: 'AssurProspect',
    assurlead: 'Assurlead',
    generic: 'Générique'
  }

  return (
    <div className="flex flex-col h-[500px]">
      {/* Header avec provider et score */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold">Lead identifié</h3>
              <p className="text-sm text-neutral-500">
                Source: {provider ? providerLabels[provider] : 'Inconnue'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
              {score}/10
            </div>
            <div className="text-xs text-neutral-500">{getScoreLabel(score)}</div>
          </div>
        </div>
      </div>

      {/* Content avec les données parsées */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Contact */}
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
          <div className="flex items-center gap-2 mb-3">
            <User size={16} className="text-neutral-500" />
            <h4 className="font-medium">Contact</h4>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {data.contact.civilite && (
              <div>
                <span className="text-neutral-500">Civilité:</span>
                <span className="ml-2">{data.contact.civilite}</span>
              </div>
            )}
            {data.contact.nom && (
              <div>
                <span className="text-neutral-500">Nom:</span>
                <span className="ml-2 font-medium">{data.contact.nom}</span>
              </div>
            )}
            {data.contact.prenom && (
              <div>
                <span className="text-neutral-500">Prénom:</span>
                <span className="ml-2 font-medium">{data.contact.prenom}</span>
              </div>
            )}
            {data.contact.email && (
              <div className="col-span-2">
                <span className="text-neutral-500">Email:</span>
                <span className="ml-2">{data.contact.email}</span>
              </div>
            )}
            {data.contact.telephone && (
              <div>
                <span className="text-neutral-500">Téléphone:</span>
                <span className="ml-2">{data.contact.telephone}</span>
              </div>
            )}
            {data.contact.adresse && (
              <div className="col-span-2">
                <span className="text-neutral-500">Adresse:</span>
                <span className="ml-2">{data.contact.adresse}</span>
              </div>
            )}
            {(data.contact.codePostal || data.contact.ville) && (
              <div className="col-span-2">
                <span className="text-neutral-500">Localisation:</span>
                <span className="ml-2">
                  {data.contact.codePostal} {data.contact.ville}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Souscripteur */}
        {data.souscripteur && Object.keys(data.souscripteur).length > 0 && (
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase size={16} className="text-neutral-500" />
              <h4 className="font-medium">Souscripteur</h4>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {data.souscripteur.dateNaissance && (
                <div>
                  <span className="text-neutral-500">Date de naissance:</span>
                  <span className="ml-2">{data.souscripteur.dateNaissance}</span>
                </div>
              )}
              {data.souscripteur.profession && (
                <div>
                  <span className="text-neutral-500">Profession:</span>
                  <span className="ml-2">{data.souscripteur.profession}</span>
                </div>
              )}
              {data.souscripteur.regimeSocial && (
                <div className="col-span-2">
                  <span className="text-neutral-500">Régime:</span>
                  <span className="ml-2">{data.souscripteur.regimeSocial}</span>
                </div>
              )}
              {data.souscripteur.nombreEnfants !== undefined && (
                <div>
                  <span className="text-neutral-500">Enfants:</span>
                  <span className="ml-2">{data.souscripteur.nombreEnfants}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conjoint */}
        {data.conjoint && Object.keys(data.conjoint).length > 0 && (
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} className="text-neutral-500" />
              <h4 className="font-medium">Conjoint</h4>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {data.conjoint.dateNaissance && (
                <div>
                  <span className="text-neutral-500">Date de naissance:</span>
                  <span className="ml-2">{data.conjoint.dateNaissance}</span>
                </div>
              )}
              {data.conjoint.profession && (
                <div>
                  <span className="text-neutral-500">Profession:</span>
                  <span className="ml-2">{data.conjoint.profession}</span>
                </div>
              )}
              {data.conjoint.regimeSocial && (
                <div className="col-span-2">
                  <span className="text-neutral-500">Régime:</span>
                  <span className="ml-2">{data.conjoint.regimeSocial}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Besoins */}
        {data.besoins && Object.keys(data.besoins).length > 0 && (
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
            <div className="flex items-center gap-2 mb-3">
              <Heart size={16} className="text-neutral-500" />
              <h4 className="font-medium">Besoins</h4>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {data.besoins.dateEffet && (
                <div>
                  <span className="text-neutral-500">Date d'effet:</span>
                  <span className="ml-2">{data.besoins.dateEffet}</span>
                </div>
              )}
              {data.besoins.assureActuellement !== undefined && (
                <div>
                  <span className="text-neutral-500">Actuellement assuré:</span>
                  <span className="ml-2">{data.besoins.assureActuellement ? 'Oui' : 'Non'}</span>
                </div>
              )}
              {data.besoins.niveaux && (
                <div className="col-span-2">
                  <span className="text-neutral-500">Niveaux:</span>
                  <div className="ml-2 mt-1 grid grid-cols-2 gap-1">
                    {data.besoins.niveaux.soinsMedicaux !== undefined && (
                      <span className="text-xs">Soins: {data.besoins.niveaux.soinsMedicaux}</span>
                    )}
                    {data.besoins.niveaux.hospitalisation !== undefined && (
                      <span className="text-xs">Hospi: {data.besoins.niveaux.hospitalisation}</span>
                    )}
                    {data.besoins.niveaux.optique !== undefined && (
                      <span className="text-xs">Optique: {data.besoins.niveaux.optique}</span>
                    )}
                    {data.besoins.niveaux.dentaire !== undefined && (
                      <span className="text-xs">Dentaire: {data.besoins.niveaux.dentaire}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Warning si score faible */}
        {score < 4 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-300">Données incomplètes</p>
              <p className="text-amber-700 dark:text-amber-400">
                Certaines informations importantes sont manquantes. Vérifiez les données avant de créer le lead.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer avec actions */}
      <div className="flex justify-end gap-3 p-4 border-t border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Création...' : 'Créer le lead'}
        </button>
      </div>
    </div>
  )
}
