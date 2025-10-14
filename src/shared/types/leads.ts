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
  // Utilisé par les flows Alptis
  categorie?: string;
}

export interface ConjointInfo {
  civilite?: string;
  prenom?: string;
  nom?: string;
  dateNaissance?: string;
  profession?: string;
  regimeSocial?: string;
  // Utilisé côté Alptis
  categorie?: string;
}

export interface EnfantInfo {
  dateNaissance?: string;
  sexe?: string;
  // Certains flows lisent le régime de l'enfant
  regime?: string;
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

export type PlatformLeadStatus = 'pending' | 'processing' | 'completed' | 'error';

// Données complètes d'un lead (tout en JSON)
export interface LeadData {
  contact: ContactInfo;
  souscripteur: SouscripteurInfo;
  conjoint?: ConjointInfo;
  enfants: EnfantInfo[];
  besoins: BesoinsInfo;
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
  contact: ContactInfo;
  souscripteur: SouscripteurInfo;
}

// Données pour mettre à jour un lead
export interface UpdateLeadData extends Partial<LeadData> {
  contact?: Partial<ContactInfo>;
  souscripteur?: Partial<SouscripteurInfo>;
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
  contact: ContactInfo;
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
