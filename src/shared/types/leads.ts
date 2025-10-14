// Types partagés pour le système de leads
// Structure alignée sur base.domain.json - Source de vérité unique

/**
 * Subscriber (Main Insured Person)
 * Combines contact and subscriber information
 */
export interface SubscriberInfo {
  // Identity
  civility?: string;
  lastName?: string;
  firstName?: string;
  birthDate?: string;  // DD/MM/YYYY

  // Contact
  telephone?: string;
  email?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  departmentCode?: string | number;

  // Professional Status
  regime?: string;           // Social security regime
  category?: string;         // Alptis: Socio-professional category
  status?: string;           // SwissLife: Employment status
  profession?: string;       // SwissLife: Profession
  workFramework?: string;    // Employee vs Independent

  // Children
  childrenCount?: number;
}

/**
 * Spouse Information
 */
export interface SpouseInfo {
  // Identity
  civility?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;  // DD/MM/YYYY

  // Professional Status
  regime?: string;
  category?: string;         // Alptis
  status?: string;           // SwissLife
  profession?: string;       // SwissLife
  workFramework?: string;
}

/**
 * Child Information
 */
export interface ChildInfo {
  birthDate?: string;  // DD/MM/YYYY
  gender?: string;
  regime?: string;          // Alptis: Social regime
  ayantDroit?: string;      // SwissLife: Beneficiary parent (1 or 2)
}

/**
 * Project/Insurance Needs
 */
export interface ProjectInfo {
  // Project identification
  name?: string;
  dateEffet?: string;  // DD/MM/YYYY - Effective date

  // Product selection (SwissLife)
  plan?: string;               // Gamme (Basic, Confort, etc.)
  couverture?: boolean;        // Individual coverage
  ij?: boolean;                // Daily allowances (Indemnités Journalières)
  simulationType?: string;     // "individual" | "couple"

  // Legal/Fiscal
  madelin?: boolean;           // Madelin law applicable
  resiliation?: boolean;       // Contract termination
  reprise?: boolean;           // Competitor takeover

  // Current situation
  currentlyInsured?: boolean;
  ranges?: string[];           // Gammes

  // Coverage levels (1-5 scale)
  levels?: {
    medicalCare?: number;      // Soins médicaux
    hospitalization?: number;  // Hospitalisation
    optics?: number;           // Optique
    dental?: number;           // Dentaire
  };
}

export type PlatformLeadStatus = 'pending' | 'processing' | 'completed' | 'error';

/**
 * Complete Lead Data Structure
 * Aligned with base.domain.json - Single source of truth
 */
export interface LeadData {
  subscriber: SubscriberInfo;
  spouse?: SpouseInfo;
  children?: ChildInfo[];
  project: ProjectInfo;
  platformData?: PlatformData;
}

// Lead (structure simplifiée)
export interface Lead {
  id: string;
  data: LeadData;
  metadata: Record<string, any>;
  createdAt: string;
}

// Alias pour compatibilité
export type CleanLead = Lead;
export type FullLead = Lead;

// Lead adapté pour une plateforme
export interface PlatformLead {
  id: string;
  cleanLeadId: string;
  platformId: number;
  adaptedData: Record<string, any>;
  status: PlatformLeadStatus;
  adaptedAt: string;
  processedAt?: string;
  errorMessage?: string;
}

// Configuration Gmail
export interface GmailConfig {
  id?: number;
  name: string;
  email?: string;
  refreshToken?: string;
  providerSettings: Record<string, any>;
  active: boolean;
  createdAt?: string;
}

// Platform-specific data
export interface SwissLifeOneData {
  projet: {
    nom: string
    couverture_individuelle: boolean
    indemnites_journalieres: boolean
    resiliation_contrat: boolean
    reprise_concurrence: boolean
    loi_madelin: boolean
  }
}

export interface PlatformData {
  swisslifeone?: Record<string, any>  // Données platform-specific SwissLife
  alptis?: Record<string, any>         // Données platform-specific Alptis
  [key: string]: Record<string, any> | undefined  // Permet d'ajouter d'autres plateformes
}

// Données pour créer un lead (même structure que LeadData)
export interface CreateLeadData extends Partial<LeadData> {
  subscriber: SubscriberInfo;
  project: ProjectInfo;
}

// Données pour mettre à jour un lead
export interface UpdateLeadData extends Partial<LeadData> {
  subscriber?: Partial<SubscriberInfo>;
  project?: Partial<ProjectInfo>;
}

// Filtres pour la recherche de leads
export interface LeadFilters {
  search?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Résultat paginé
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Statistiques des leads
export interface LeadStats {
  total: number;
  new: number;
  processed: number;
  processing: number;
}

// Configuration d'extraction Gmail
export interface GmailExtractionConfig {
  configId: number;
  daysBack?: number;
  query?: string;
}

// Résultat d'extraction
export interface ExtractionResult {
  success: boolean;
  rawLeadsCreated: number;
  cleanLeadsCreated: number;
  duplicatesSkipped: number;
  errors: string[];
}

// Résultat d'import de fichier
export interface ImportResult {
  success: boolean;
  leadsCreated: number;
  leadsSkipped: number;
  errors: string[];
}

// Progress pour les opérations longues
export interface OperationProgress {
  current: number;
  total: number;
  message: string;
  completed: boolean;
  error?: string;
}

// Informations sur un doublon détecté
export interface DuplicateInfo {
  leadId: string;
  subscriber: SubscriberInfo;
  reasons: string[]; // Ex: ["Email identique", "Téléphone identique"]
}

// Réponse de création de lead avec informations sur les doublons
export interface CreateLeadResult {
  success: boolean;
  data?: CleanLead;
  error?: string;
  duplicates?: DuplicateInfo[]; // Liste des doublons potentiels détectés
  warning?: string; // Message d'avertissement si des doublons ont été trouvés
}
