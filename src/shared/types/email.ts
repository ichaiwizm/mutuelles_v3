/**
 * Types pour le système d'import de leads par email
 */

// Provider d'email supportés
export type EmailProvider = 'gmail' | 'outlook'

// Statut d'authentification
export type AuthStatus = 'not_authenticated' | 'authenticated' | 'expired' | 'error'

// Configuration OAuth pour un compte email
export interface EmailConfig {
  id?: number
  provider: EmailProvider
  email: string
  displayName?: string
  accessToken?: string // Token d'accès (chiffré en DB)
  refreshToken?: string // Token de refresh (chiffré en DB)
  expiryDate?: number // Timestamp d'expiration
  createdAt?: string
  updatedAt?: string
}

// Plage de dates pour la récupération d'emails
export interface DateRange {
  from: Date
  to: Date
}

// Filtres pour la récupération d'emails
export interface EmailFilters {
  dateRange?: DateRange
  days?: number // Alternative : nombre de jours en arrière
  query?: string // Query Gmail (ex: "from:leads@example.com")
  senders?: string[] // Liste d'expéditeurs à inclure
  keywords?: string[] // Mots-clés à rechercher
  maxResults?: number
}

// Message email récupéré
export interface EmailMessage {
  id: string // ID unique du message
  threadId?: string
  subject: string
  from: string
  to?: string
  date: string // ISO date string
  snippet?: string // Aperçu court du contenu
  content: string // Contenu complet (texte brut)
  htmlContent?: string // Contenu HTML original (optionnel)
  labels?: string[] // Labels Gmail
  hasLeadPotential: boolean // Détecté comme contenant potentiellement un lead
  detectionReasons?: string[] // Raisons de la détection (expéditeur, mots-clés, etc.)
  attachments?: EmailAttachment[]
}

// Pièce jointe
export interface EmailAttachment {
  id: string
  filename: string
  mimeType: string
  size: number
}

// Résultat d'extraction d'emails
export interface EmailImportResult {
  success: boolean
  totalFetched: number
  leadsDetected: number
  messages: EmailMessage[]
  error?: string
}

// Progression de l'extraction
export interface EmailImportProgress {
  phase: 'authenticating' | 'fetching' | 'processing' | 'completed' | 'error'
  message: string
  total?: number
  current?: number
  percentage?: number
}

// Paramètres pour démarrer une extraction
export interface StartImportParams {
  configId?: number // ID de la config à utiliser (si déjà authentifié)
  filters: EmailFilters
}

// Résultat d'authentification OAuth
export interface OAuthResult {
  success: boolean
  config?: EmailConfig
  error?: string
}

// Statistiques d'import
export interface EmailImportStats {
  totalImports: number
  lastImportDate?: string
  totalEmailsFetched: number
  totalLeadsDetected: number
}

// Paramètres pour le wizard d'import
export type ImportMethod = 'email' | 'csv' | 'manual'

export interface ImportWizardState {
  step: number
  method: ImportMethod
  emailConfig?: EmailConfig
  filters?: EmailFilters
  result?: EmailImportResult
  selectedMessageIds: string[] // IDs des messages sélectionnés pour import
}
