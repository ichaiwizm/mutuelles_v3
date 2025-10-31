/**
 * MODÈLE CANONIQUE - LeadGenerique
 *
 * Structure UNIQUE de données pour un Lead dans l'application.
 * Tous les parsers, l'UI, et la DB utilisent cette structure.
 *
 * Basé sur base.domain.json et aligné avec les besoins métier.
 */

// ============================================================================
// LEAD GENERIQUE - Le Modèle Canonique
// ============================================================================

export interface LeadGenerique {
  id: string;
  project: ProjectInfo;
  subscriber: SubscriberInfo;
  spouse?: SpouseInfo;
  children?: ChildInfo[];
  metadata: LeadMetadata;
  createdAt: string;
  updatedAt?: string;
}

// ============================================================================
// PROJECT INFO - Informations du projet d'assurance
// ============================================================================

export interface ProjectInfo {
  name?: string;                    // Nom du projet (auto-généré si vide)
  dateEffet: string;                // Date d'effet (format DD/MM/YYYY)
  plan?: string;                    // Gamme/Produit (ex: "SwissLife Santé")
  couverture?: boolean;             // Couverture individuelle
  ij?: boolean;                     // Indemnités journalières
  madelin?: boolean;                // Loi Madelin (pour TNS)
  resiliation?: boolean;            // Résiliation de contrat existant
  reprise?: boolean;                // Reprise concurrence
  simulationType?: 'individual' | 'couple' | 'family';  // Type de simulation
  currentlyInsured?: boolean;       // Déjà assuré ?
  ranges?: string[];                // Gammes sélectionnées
  levels?: {                        // Niveaux de garanties
    medicalCare?: number;
    hospitalization?: number;
    optics?: number;
    dental?: number;
  };
}

// ============================================================================
// SUBSCRIBER INFO - Souscripteur (assuré principal)
// ============================================================================

export interface SubscriberInfo {
  civility: 'MONSIEUR' | 'MADAME';
  lastName: string;
  firstName: string;
  birthDate: string;                // Format DD/MM/YYYY

  // Contact
  telephone?: string;
  email?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  departmentCode?: string | number;

  // Profil professionnel
  category?: string;                // Catégorie socioprofessionnelle (pour Alptis)
  regime?: string;                  // Régime de sécurité sociale
  status?: string;                  // Statut (pour SwissLife)
  profession?: string;              // Profession
  workFramework?: 'SALARIE' | 'INDEPENDANT';  // Cadre d'exercice
  childrenCount?: number;           // Nombre d'enfants
}

// ============================================================================
// SPOUSE INFO - Conjoint
// ============================================================================

export interface SpouseInfo {
  civility: 'MONSIEUR' | 'MADAME';
  firstName?: string;
  lastName?: string;
  birthDate: string;                // Format DD/MM/YYYY

  // Profil professionnel
  category?: string;
  regime?: string;
  status?: string;
  profession?: string;
  workFramework?: 'SALARIE' | 'INDEPENDANT';
}

// ============================================================================
// CHILD INFO - Enfant
// ============================================================================

export interface ChildInfo {
  birthDate: string;                // Format DD/MM/YYYY
  gender?: string;
  regime?: string;
  ayantDroit?: '1' | '2';          // 1 = Souscripteur, 2 = Conjoint
}

// ============================================================================
// METADATA - Métadonnées du lead
// ============================================================================

export interface LeadMetadata {
  source?: 'manual' | 'email' | 'csv' | 'api';  // Source du lead
  provider?: string;                             // Fournisseur (ex: "assurprospect")
  confidence?: number;                           // Score de confiance du parsing
  rawData?: string;                              // Données brutes (pour debug)
  tags?: string[];                               // Tags personnalisés
  notes?: string;                                // Notes utilisateur
  [key: string]: any;                            // Métadonnées additionnelles
}

// ============================================================================
// TACHE - Représentation d'une tâche d'automatisation
// ============================================================================

export interface Tache {
  id: string;
  leadId: string;                               // Référence au LeadGenerique
  platformKey: string;                          // Ex: "swisslife", "alptis"
  productKey: string;                           // Ex: "sante-pro", "sante-plus"
  status: TacheStatus;
  priority?: number;                            // Priorité (1 = haute)

  // Résultats
  result?: TacheResult;

  // Timestamps
  createdAt: string;
  startedAt?: string;
  completedAt?: string;

  // Méta
  retryCount?: number;
  maxRetries?: number;
}

export type TacheStatus =
  | 'pending'       // En attente
  | 'running'       // En cours d'exécution
  | 'completed'     // Terminée avec succès
  | 'failed'        // Échouée
  | 'cancelled';    // Annulée

export interface TacheResult {
  success: boolean;
  message?: string;
  errorMessage?: string;
  logs?: string[];                              // Logs d'exécution
  outputPath?: string;                          // Chemin vers le PDF/résultat
  screenshotPath?: string;                      // Chemin vers screenshot (si erreur)
  duration?: number;                            // Durée d'exécution (ms)
  data?: Record<string, any>;                   // Données additionnelles
}

// ============================================================================
// TYPES UTILITAIRES
// ============================================================================

export interface PlatformProduct {
  platformKey: string;                          // Ex: "swisslife"
  platformName: string;                         // Ex: "Swiss Life One"
  productKey: string;                           // Ex: "sante-pro"
  productName: string;                          // Ex: "Santé Pro"
  available: boolean;                           // Disponible ?
  description?: string;
}

export interface TacheFilters {
  leadId?: string;
  platformKey?: string;
  productKey?: string;
  status?: TacheStatus | TacheStatus[];
}

export interface LeadFilters {
  search?: string;                              // Recherche par nom/email
  source?: LeadMetadata['source'];
  tags?: string[];
}
