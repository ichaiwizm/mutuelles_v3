// Types partagés pour le système de leads

export interface ContactInfo {
  civilite?: string;
  nom?: string;
  prenom?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
}

export interface SouscripteurInfo {
  dateNaissance?: string;
  profession?: string;
  regimeSocial?: string;
  nombreEnfants?: number;
}

export interface ConjointInfo {
  civilite?: string;
  prenom?: string;
  nom?: string;
  dateNaissance?: string;
  profession?: string;
  regimeSocial?: string;
}

export interface EnfantInfo {
  dateNaissance?: string;
  sexe?: string;
}

export interface BesoinsInfo {
  dateEffet?: string;
  assureActuellement?: boolean;
  gammes?: string[];
  madelin?: boolean;
  niveaux?: {
    soinsMedicaux?: number;
    hospitalisation?: number;
    optique?: number;
    dentaire?: number;
  };
}

export type LeadSource = 'gmail' | 'file' | 'manual';
export type LeadProvider = 'assurprospect' | 'assurlead' | 'generic';
export type PlatformLeadStatus = 'pending' | 'processing' | 'completed' | 'error';

// Lead brut (données extraites)
export interface RawLead {
  id: string;
  source: LeadSource;
  provider?: LeadProvider;
  rawContent: string;
  metadata: Record<string, any>;
  extractedAt: string;
}

// Lead nettoyé (normalisé)
export interface CleanLead {
  id: string;
  rawLeadId: string;
  contact: ContactInfo;
  souscripteur: SouscripteurInfo;
  conjoint?: ConjointInfo;
  enfants: EnfantInfo[];
  besoins: BesoinsInfo;
  qualityScore: number;
  cleanedAt: string;
}

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

// Lead avec toutes les relations jointes
export interface FullLead extends CleanLead {
  rawLead: RawLead;
  platformLeads: PlatformLead[];
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

// Données pour créer un lead
export interface CreateLeadData {
  contact: ContactInfo;
  souscripteur: SouscripteurInfo;
  conjoint?: ConjointInfo;
  enfants?: EnfantInfo[];
  besoins?: BesoinsInfo;
}

// Données pour mettre à jour un lead
export interface UpdateLeadData {
  contact?: Partial<ContactInfo>;
  souscripteur?: Partial<SouscripteurInfo>;
  conjoint?: ConjointInfo | null;
  enfants?: EnfantInfo[];
  besoins?: Partial<BesoinsInfo>;
}

// Filtres pour la recherche de leads
export interface LeadFilters {
  search?: string;
  source?: LeadSource;
  provider?: LeadProvider;
  minScore?: number;
  platformId?: number;
  status?: PlatformLeadStatus;
  dateFrom?: string;
  dateTo?: string;
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
  bySource: Record<LeadSource, number>;
  byProvider: Record<LeadProvider, number>;
  averageScore: number;
}

// Configuration d'extraction Gmail
export interface GmailExtractionConfig {
  configId: number;
  daysBack?: number;
  providers?: LeadProvider[];
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