/**
 * TYPES POUR LES ADAPTERS (Ouvriers)
 *
 * Les Adapters contiennent la logique Playwright pour automatiser
 * une plateforme. Ils ne connaissent PAS le LeadGenerique, seulement
 * les données spécifiques fournies par les Mappers.
 */

import { Page } from 'playwright';

// ============================================================================
// ADAPTER INTERFACE
// ============================================================================

export interface Adapter {
  /**
   * Initialise l'adapter (connexion, navigation, login)
   * @param page - Page Playwright
   * @param credentials - Identifiants de la plateforme
   */
  initialize(page: Page, credentials: PlatformCredentials): Promise<void>;

  /**
   * Exécute une action sur la plateforme
   * @param page - Page Playwright
   * @param productKey - Clé du produit (ex: "sante-pro")
   * @param data - Données spécifiques (fournies par le Mapper)
   * @param options - Options d'exécution
   */
  execute(
    page: Page,
    productKey: string,
    data: Record<string, any>,
    options?: AdapterExecutionOptions
  ): Promise<AdapterResult>;

  /**
   * Récupère le résultat de l'automatisation
   * @param page - Page Playwright
   */
  getResult(page: Page): Promise<AdapterResultData>;

  /**
   * Nettoie et ferme l'adapter
   * @param page - Page Playwright
   */
  cleanup(page: Page): Promise<void>;

  /**
   * Métadonnées de l'adapter
   */
  metadata: AdapterMetadata;
}

export interface AdapterMetadata {
  platformKey: string;          // Ex: "swisslife"
  platformName: string;         // Ex: "Swiss Life One"
  version: string;              // Version de l'adapter
  supportedProducts: string[];  // Liste des produits supportés
}

// ============================================================================
// EXECUTION OPTIONS & RESULTS
// ============================================================================

export interface AdapterExecutionOptions {
  timeout?: number;             // Timeout en ms (défaut: 120000)
  headless?: boolean;           // Mode headless (défaut: false)
  screenshotOnError?: boolean;  // Capture d'écran en cas d'erreur (défaut: true)
  saveResult?: boolean;         // Sauvegarder le résultat (PDF) (défaut: true)
  outputDir?: string;           // Répertoire de sortie
}

export interface AdapterResult {
  success: boolean;
  message?: string;
  errorMessage?: string;
  logs: string[];               // Logs d'exécution détaillés
  duration: number;             // Durée d'exécution (ms)
  data?: AdapterResultData;
}

export interface AdapterResultData {
  quotation?: {
    monthly: number;            // Cotisation mensuelle
    annual: number;             // Cotisation annuelle
    currency: string;           // Devise (ex: "EUR")
  };
  pdfPath?: string;             // Chemin vers le PDF généré
  screenshotPath?: string;      // Chemin vers screenshot (si erreur)
  reference?: string;           // Numéro de référence/devis
  [key: string]: any;           // Données additionnelles
}

// ============================================================================
// CREDENTIALS
// ============================================================================

export interface PlatformCredentials {
  username: string;
  password: string;
  additionalFields?: Record<string, string>;  // Champs additionnels (ex: code client)
}

// ============================================================================
// ADAPTER FACTORY
// ============================================================================

export type AdapterFactory = (platformKey: string) => Adapter | null;

// ============================================================================
// ADAPTER ERRORS
// ============================================================================

export class AdapterError extends Error {
  constructor(
    message: string,
    public code: AdapterErrorCode,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AdapterError';
  }
}

export enum AdapterErrorCode {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  NAVIGATION_FAILED = 'NAVIGATION_FAILED',
  FORM_FILL_FAILED = 'FORM_FILL_FAILED',
  TIMEOUT = 'TIMEOUT',
  ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PLATFORM_ERROR = 'PLATFORM_ERROR',
  UNKNOWN = 'UNKNOWN',
}
