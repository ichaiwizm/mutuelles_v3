/**
 * SettingsModal - Modal des paramètres d'import
 *
 * Affiche ImportSettings dans un modal centré
 */

import React from 'react'
import Modal from '../Modal'
import { ImportSettings } from './ImportSettings'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDays: number
  onDaysChange: (days: number) => void
  email: string | null
  emailConfigId?: number
  onDisconnect: () => void
  isDisconnecting?: boolean
}

export function SettingsModal({
  isOpen,
  onClose,
  selectedDays,
  onDaysChange,
  email,
  emailConfigId,
  onDisconnect,
  isDisconnecting
}: SettingsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Paramètres"
      size="large"
    >
      <ImportSettings
        selectedDays={selectedDays}
        onDaysChange={onDaysChange}
        email={email}
        emailConfigId={emailConfigId}
        onDisconnect={onDisconnect}
        isDisconnecting={isDisconnecting}
      />
    </Modal>
  )
}
