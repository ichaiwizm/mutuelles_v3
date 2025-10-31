/**
 * ADAPTER: Swiss Life One
 *
 * Adapter Playwright pour automatiser la plateforme Swiss Life One.
 * Contient toute la logique d'automatisation pour les produits SwissLife.
 *
 * Produits supportés:
 * - sante-pro (Santé Pro)
 */

import { Page } from 'playwright';
import {
  Adapter,
  AdapterMetadata,
  AdapterResult,
  AdapterResultData,
  PlatformCredentials,
  AdapterExecutionOptions,
  AdapterError,
  AdapterErrorCode,
} from '../shared/types/adapters';
import { SwissLifeSanteProData } from '../shared/types/mappers';

const BASE_URL = 'https://www.swisslife-one.fr';
const LOGIN_URL = `${BASE_URL}/`;

export class SwissLifeAdapter implements Adapter {
  metadata: AdapterMetadata = {
    platformKey: 'swisslife',
    platformName: 'Swiss Life One',
    version: '1.0.0',
    supportedProducts: ['sante-pro'],
  };

  /**
   * Initialise l'adapter (login)
   */
  async initialize(page: Page, credentials: PlatformCredentials): Promise<void> {
    const logs: string[] = [];

    try {
      // 1. Naviguer vers la page de login
      await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
      logs.push(`Navigated to ${LOGIN_URL}`);

      // 2. Accepter les cookies
      await this.acceptCookies(page);
      logs.push('Cookies accepted');

      // 3. Cliquer sur le bouton "Se connecter"
      await page.click('.button-connection');
      logs.push('Login button clicked');

      // 4. Attendre le formulaire de login
      await page.waitForSelector('#userNameInput', { timeout: 10000 });

      // 5. Remplir les identifiants
      await page.fill('#userNameInput', credentials.username);
      await page.fill('#passwordInput', credentials.password);
      logs.push('Credentials filled');

      // 6. Soumettre le formulaire
      await page.click('#submitButton');
      logs.push('Login form submitted');

      // 7. Attendre la navigation
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
      logs.push('Login successful');
    } catch (error: any) {
      throw new AdapterError(
        `Initialization failed: ${error.message}`,
        AdapterErrorCode.AUTHENTICATION_FAILED,
        { logs }
      );
    }
  }

  /**
   * Exécute une automation sur SwissLife
   */
  async execute(
    page: Page,
    productKey: string,
    data: Record<string, any>,
    options?: AdapterExecutionOptions
  ): Promise<AdapterResult> {
    const startTime = Date.now();
    const logs: string[] = [];

    try {
      // Dispatcher vers la bonne méthode selon le produit
      switch (productKey) {
        case 'sante-pro':
          return await this.executeSantePro(page, data as SwissLifeSanteProData, logs, options);
        default:
          throw new AdapterError(
            `Unsupported product: ${productKey}`,
            AdapterErrorCode.PLATFORM_ERROR,
            { productKey }
          );
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        errorMessage: error.message,
        logs,
        duration,
      };
    }
  }

  /**
   * Exécute l'automation pour Santé Pro
   */
  private async executeSantePro(
    page: Page,
    data: SwissLifeSanteProData,
    logs: string[],
    options?: AdapterExecutionOptions
  ): Promise<AdapterResult> {
    const startTime = Date.now();

    try {
      // 1. Naviguer vers Simulateurs
      await this.navigateToSimulateurs(page);
      logs.push('Navigated to Simulateurs');

      // 2. Remplir le formulaire Projet
      await this.fillProjet(page, data.projet);
      logs.push('Projet section filled');

      // 3. Remplir le formulaire Souscripteur
      await this.fillSouscripteur(page, data.souscripteur);
      logs.push('Souscripteur section filled');

      // 4. Remplir Conjoint (si présent)
      if (data.conjoint) {
        await this.fillConjoint(page, data.conjoint);
        logs.push('Conjoint section filled');
      }

      // 5. Remplir Enfants (si présents)
      if (data.enfants && data.enfants.length > 0) {
        await this.fillEnfants(page, data.enfants);
        logs.push(`${data.enfants.length} enfant(s) added`);
      }

      // 6. Soumettre le formulaire
      await page.click('button:has-text("Calculer")');
      logs.push('Form submitted');

      // 7. Attendre les résultats
      await page.waitForSelector('.results-container', { timeout: 60000 });
      logs.push('Results loaded');

      const duration = Date.now() - startTime;

      return {
        success: true,
        message: 'Santé Pro simulation completed',
        logs,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      throw new AdapterError(
        `Santé Pro execution failed: ${error.message}`,
        AdapterErrorCode.FORM_FILL_FAILED,
        { logs, duration }
      );
    }
  }

  /**
   * Navigue vers la page Simulateurs
   */
  private async navigateToSimulateurs(page: Page): Promise<void> {
    await page.click("a:has-text('Études et simulateurs')");
    await page.waitForTimeout(500);
    await page.click(".mat-mdc-menu-item.sous-lien:has-text('Simulateurs')");
    await page.waitForNavigation({ waitUntil: 'networkidle' });
  }

  /**
   * Remplit la section Projet
   */
  private async fillProjet(page: Page, projet: SwissLifeSanteProData['projet']): Promise<void> {
    // Nom du projet
    await page.fill('#nom-projet', projet.nom);

    // Date d'effet
    await page.fill('#contratSante-dateEffet', projet.date_effet);

    // Couverture individuelle
    const couvertureSelector = projet.couverture_individuelle
      ? "label[for='projet-sante-individuelle-oui']"
      : "label[for='projet-sante-individuelle-non']";
    await page.click(couvertureSelector);

    // Indemnités journalières
    const ijSelector = projet.indemnites_journalieres
      ? "label[for='projet-confort-hospitalisation-oui']"
      : "label[for='projet-confort-hospitalisation-non']";
    await page.click(ijSelector);

    // Loi Madelin
    const madelinSelector = projet.loi_madelin
      ? "label[for='projet-loi-madelin-oui']"
      : "label[for='projet-loi-madelin-non']";
    await page.click(madelinSelector);

    // Résiliation
    const resiliationSelector = projet.resiliation_contrat
      ? "label[for='projet-resiliation-oui']"
      : "label[for='projet-resiliation-non']";
    await page.click(resiliationSelector);

    // Reprise
    const repriseSelector = projet.reprise_concurrence
      ? "label[for='projet-reprise-oui']"
      : "label[for='projet-reprise-non']";
    await page.click(repriseSelector);
  }

  /**
   * Remplit la section Souscripteur
   */
  private async fillSouscripteur(
    page: Page,
    souscripteur: SwissLifeSanteProData['souscripteur']
  ): Promise<void> {
    // Date de naissance
    await page.fill('#date-naissance-assure-principal', souscripteur.date_naissance);

    // Régime social
    await page.selectOption('#regime-social-assure-principal', souscripteur.regime_social);

    // Statut
    await page.selectOption('#statut-assure-principal', souscripteur.statut);

    // Profession (optionnel)
    if (souscripteur.profession) {
      await page.selectOption('#profession-assure-principal', souscripteur.profession);
    }

    // Département
    await page.selectOption('#departement-assure-principal', String(souscripteur.departement));
  }

  /**
   * Remplit la section Conjoint
   */
  private async fillConjoint(
    page: Page,
    conjoint: NonNullable<SwissLifeSanteProData['conjoint']>
  ): Promise<void> {
    // Activer le conjoint
    await page.click("label[for='simulation-couple']");
    await page.waitForTimeout(500);

    // Date de naissance
    await page.fill('#date-naissance-conjoint', conjoint.date_naissance);

    // Régime social
    await page.selectOption('#regime-social-conjoint', conjoint.regime_social);

    // Statut
    await page.selectOption('#statut-conjoint', conjoint.statut);

    // Profession (optionnel)
    if (conjoint.profession) {
      await page.selectOption('#profession-conjoint', conjoint.profession);
    }
  }

  /**
   * Remplit la section Enfants
   */
  private async fillEnfants(
    page: Page,
    enfants: NonNullable<SwissLifeSanteProData['enfants']>
  ): Promise<void> {
    // Activer la famille
    await page.click("label[for='simulation-famille']");
    await page.waitForTimeout(500);

    // Nombre d'enfants
    await page.selectOption('#nombre-enfants', String(enfants.length));
    await page.waitForTimeout(500);

    // Remplir chaque enfant
    for (let i = 0; i < enfants.length; i++) {
      const enfant = enfants[i];
      const index = i + 1;

      // Date de naissance
      await page.fill(`#date-naissance-enfant-${index}`, enfant.date_naissance);

      // Ayant droit
      await page.selectOption(`#ayant-droit-enfant-${index}`, enfant.ayant_droit);
    }
  }

  /**
   * Récupère les résultats
   */
  async getResult(page: Page): Promise<AdapterResultData> {
    // TODO: Extraire les résultats de la page (cotisations, PDF, etc.)
    // Pour l'instant, retourne un objet vide
    return {
      quotation: {
        monthly: 0,
        annual: 0,
        currency: 'EUR',
      },
    };
  }

  /**
   * Nettoie et ferme l'adapter
   */
  async cleanup(page: Page): Promise<void> {
    // Rien de spécial à faire pour SwissLife
    // La page sera fermée par le Worker
  }

  /**
   * Accepte les cookies
   */
  private async acceptCookies(page: Page): Promise<void> {
    try {
      await page.click('#onetrust-accept-btn-handler', { timeout: 5000 });
      await page.waitForTimeout(500);
    } catch {
      // Cookies déjà acceptés ou pas de popup
    }
  }
}
