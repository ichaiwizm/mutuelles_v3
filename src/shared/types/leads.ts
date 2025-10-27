/**
 * Subscriber (Main Insured Person)
 * Combines contact and subscriber information
 */
export interface SubscriberInfo {
  civility?: string;
  lastName?: string;
  firstName?: string;
  birthDate?: string;
  telephone?: string;
  email?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  departmentCode?: string | number;
  regime?: string;
  category?: string;
  status?: string;
  profession?: string;
  workFramework?: string;
  childrenCount?: number;
}

/**
 * Spouse Information
 */
export interface SpouseInfo {
  civility?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  regime?: string;
  category?: string;
  status?: string;
  profession?: string;
  workFramework?: string;
}

/**
 * Child Information
 */
export interface ChildInfo {
  birthDate?: string;
  gender?: string;
  regime?: string;
  ayantDroit?: string;
}

/**
 * Project/Insurance Needs
 */
export interface ProjectInfo {
  name?: string;
  dateEffet?: string;
  plan?: string;
  couverture?: boolean;
  ij?: boolean;
  simulationType?: string;
  madelin?: boolean;
  resiliation?: boolean;
  reprise?: boolean;
  currentlyInsured?: boolean;
  ranges?: string[];
  levels?: {
    medicalCare?: number;
    hospitalization?: number;
    optics?: number;
    dental?: number;
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

export interface Lead {
  id: string;
  data: LeadData;
  metadata: Record<string, any>;
  createdAt: string;
}

export type CleanLead = Lead;
export type FullLead = Lead;

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

export interface GmailConfig {
  id?: number;
  name: string;
  email?: string;
  refreshToken?: string;
  providerSettings: Record<string, any>;
  active: boolean;
  createdAt?: string;
}

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
  swisslifeone?: Record<string, any>
  alptis?: Record<string, any>
  [key: string]: Record<string, any> | undefined
}

export interface CreateLeadData extends Partial<LeadData> {
  subscriber: SubscriberInfo;
  project: ProjectInfo;
}

export interface UpdateLeadData extends Partial<LeadData> {
  subscriber?: Partial<SubscriberInfo>;
  project?: Partial<ProjectInfo>;
}

export interface LeadFilters {
  search?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LeadStats {
  total: number;
  new: number;
  processed: number;
  processing: number;
}

export interface GmailExtractionConfig {
  configId: number;
  daysBack?: number;
  query?: string;
}

export interface ExtractionResult {
  success: boolean;
  rawLeadsCreated: number;
  cleanLeadsCreated: number;
  duplicatesSkipped: number;
  errors: string[];
}

export interface ImportResult {
  success: boolean;
  leadsCreated: number;
  leadsSkipped: number;
  errors: string[];
}

export interface OperationProgress {
  current: number;
  total: number;
  message: string;
  completed: boolean;
  error?: string;
}

export interface DuplicateInfo {
  leadId: string;
  subscriber: SubscriberInfo;
  reasons: string[];
}

export interface CreateLeadResult {
  success: boolean;
  data?: CleanLead;
  error?: string;
  duplicates?: DuplicateInfo[];
  warning?: string;
}
