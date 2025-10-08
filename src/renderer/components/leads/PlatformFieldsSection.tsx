import React, { useState } from 'react'
import { Building2, Info, HelpCircle } from 'lucide-react'
import type { PlatformData, SwissLifeOneData } from '@shared/types/leads'
import PlatformCompletionBadge from './PlatformCompletionBadge'

interface PlatformFieldsSectionProps {
  platformData: PlatformData
  onPlatformDataChange: (data: PlatformData) => void
  editable?: boolean
}

// Toggle Switch Component
function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
  tooltip
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label: string
  tooltip?: string
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
        {tooltip && (
          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              <Info size={14} />
            </button>
            {showTooltip && (
              <div className="absolute left-6 top-0 z-10 w-64 p-2 bg-neutral-900 dark:bg-neutral-800 text-white text-xs rounded-md shadow-lg">
                {tooltip}
                <div className="absolute left-0 top-2 -translate-x-1 w-2 h-2 bg-neutral-900 dark:bg-neutral-800 rotate-45" />
              </div>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          disabled
            ? 'cursor-not-allowed opacity-50'
            : 'cursor-pointer'
        } ${
          checked
            ? 'bg-emerald-600 dark:bg-emerald-500'
            : 'bg-neutral-300 dark:bg-neutral-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

// Calculer la complétion pour Swiss Life One
function calculateSwissLifeOneCompletion(data?: SwissLifeOneData): {
  completion: number
  filledCount: number
  totalCount: number
} {
  if (!data) return { completion: 0, filledCount: 0, totalCount: 6 }

  const { projet } = data
  if (!projet) return { completion: 0, filledCount: 0, totalCount: 6 }

  const fields = [
    projet.nom,
    projet.couverture_individuelle !== undefined,
    projet.indemnites_journalieres !== undefined,
    projet.resiliation_contrat !== undefined,
    projet.reprise_concurrence !== undefined,
    projet.loi_madelin !== undefined
  ]

  const filledCount = fields.filter(f => f).length
  const totalCount = fields.length
  const completion = Math.round((filledCount / totalCount) * 100)

  return { completion, filledCount, totalCount }
}

export default function PlatformFieldsSection({
  platformData,
  onPlatformDataChange,
  editable = true
}: PlatformFieldsSectionProps) {
  // Swiss Life One
  const swissLifeOne = platformData.swisslifeone
  const swissCompletion = calculateSwissLifeOneCompletion(swissLifeOne)

  const updateSwissLifeOne = (field: keyof SwissLifeOneData['projet'], value: any) => {
    const current = swissLifeOne?.projet || {
      nom: '',
      couverture_individuelle: false,
      indemnites_journalieres: false,
      resiliation_contrat: false,
      reprise_concurrence: false,
      loi_madelin: false
    }

    onPlatformDataChange({
      ...platformData,
      swisslifeone: {
        projet: {
          ...current,
          [field]: value
        }
      }
    })
  }

  // Si pas de données de plateforme, ne rien afficher
  if (!platformData.swisslifeone && !platformData.alptis) {
    return null
  }

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
      <div className="flex items-center gap-2 mb-3">
        <Building2 size={16} className="text-neutral-500" />
        <h4 className="font-medium">Informations plateformes</h4>
      </div>

      <div className="space-y-4">
        {/* Swiss Life One */}
        {swissLifeOne && (
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50/50 dark:bg-neutral-900/50">
            <div className="mb-4">
              <PlatformCompletionBadge
                platformName="swisslifeone"
                completion={swissCompletion.completion}
                requiredFieldsCount={swissCompletion.totalCount}
                filledFieldsCount={swissCompletion.filledCount}
              />
            </div>

            <div className="space-y-3">
              {/* Nom du projet */}
              <div>
                <label className="block text-xs text-neutral-500 mb-1.5">
                  Nom du projet
                </label>
                <input
                  type="text"
                  value={swissLifeOne.projet?.nom || ''}
                  onChange={(e) => updateSwissLifeOne('nom', e.target.value)}
                  disabled={!editable}
                  placeholder="Ex: Jean Dupont - Santé"
                  className={`w-full px-3 py-2 text-sm rounded-md border ${
                    editable
                      ? 'border-neutral-300 dark:border-neutral-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                      : 'border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 cursor-not-allowed'
                  } bg-white dark:bg-neutral-900 transition-colors outline-none`}
                />
              </div>

              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3">
                <h5 className="text-xs font-medium text-neutral-500 mb-3">Options</h5>
                <div className="space-y-1">
                  <ToggleSwitch
                    checked={swissLifeOne.projet?.couverture_individuelle || false}
                    onChange={(val) => updateSwissLifeOne('couverture_individuelle', val)}
                    disabled={!editable}
                    label="Couverture individuelle"
                    tooltip="Ajouter une couverture confort pour l'hospitalisation individuelle"
                  />
                  <ToggleSwitch
                    checked={swissLifeOne.projet?.indemnites_journalieres || false}
                    onChange={(val) => updateSwissLifeOne('indemnites_journalieres', val)}
                    disabled={true}
                    label="Indemnités journalières"
                    tooltip="Fonctionnalité désactivée - Indemnités journalières non disponibles"
                  />
                  <ToggleSwitch
                    checked={swissLifeOne.projet?.resiliation_contrat || false}
                    onChange={(val) => updateSwissLifeOne('resiliation_contrat', val)}
                    disabled={!editable}
                    label="Résiliation contrat"
                    tooltip="Le client souhaite résilier son contrat actuel"
                  />
                  <ToggleSwitch
                    checked={swissLifeOne.projet?.reprise_concurrence || false}
                    onChange={(val) => updateSwissLifeOne('reprise_concurrence', val)}
                    disabled={!editable}
                    label="Reprise concurrence"
                    tooltip="Reprendre l'ancienneté d'un contrat concurrent"
                  />
                  <ToggleSwitch
                    checked={swissLifeOne.projet?.loi_madelin || false}
                    onChange={(val) => updateSwissLifeOne('loi_madelin', val)}
                    disabled={!editable}
                    label="Loi Madelin (< 70 ans)"
                    tooltip="Contrat éligible à la déduction fiscale Madelin (pour les TNS)"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alptis (à implémenter plus tard) */}
        {platformData.alptis && (
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50/50 dark:bg-neutral-900/50">
            <div className="flex items-center gap-2 text-neutral-500">
              <HelpCircle size={16} />
              <span className="text-sm">Alptis - Configuration à venir</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
