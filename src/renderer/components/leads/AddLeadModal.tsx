/**
 * AddLeadModal - Alias for backward compatibility
 * This component is a simple wrapper around LeadModal with mode='create'
 * to maintain compatibility with existing code.
 */

import React from 'react'
import LeadModal, { LeadModalProps } from './LeadModal'

interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddLeadModal({ isOpen, onClose, onSuccess }: AddLeadModalProps) {
  return (
    <LeadModal
      mode="create"
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  )
}

// Re-export LeadModal types for compatibility
export type { LeadModalProps }
