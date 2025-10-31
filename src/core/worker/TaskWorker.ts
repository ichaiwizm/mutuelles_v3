/**
 * TASK WORKER - Exécuteur asynchrone de tâches
 *
 * Le Worker récupère les tâches de la file d'attente et les exécute
 * de manière asynchrone. Il coordonne les Mappers et les Adapters.
 */

import { Database } from 'better-sqlite3';
import { chromium, Browser, Page } from 'playwright';
import { TaskService } from '../services/TaskService';
import { LeadService } from '../services/LeadService';
import { Tache, TacheResult } from '../../shared/types/models';
import { Mapper } from '../../shared/types/mappers';
import { Adapter, PlatformCredentials } from '../../shared/types/adapters';

export interface TaskWorkerConfig {
  pollInterval?: number;        // Intervalle de polling (ms) - défaut: 2000
  maxConcurrent?: number;        // Nb max de tâches simultanées - défaut: 1
  headless?: boolean;            // Mode headless - défaut: false
}

export class TaskWorker {
  private running = false;
  private browser: Browser | null = null;
  private pollInterval: number;
  private maxConcurrent: number;
  private headless: boolean;
  private activeTasks = 0;

  constructor(
    private db: Database,
    private taskService: TaskService,
    private leadService: LeadService,
    private mapperFactory: (platformKey: string, productKey: string) => Mapper | null,
    private adapterFactory: (platformKey: string) => Adapter | null,
    private credentialsProvider: (platformKey: string) => PlatformCredentials | null,
    config?: TaskWorkerConfig
  ) {
    this.pollInterval = config?.pollInterval || 2000;
    this.maxConcurrent = config?.maxConcurrent || 1;
    this.headless = config?.headless !== undefined ? config.headless : false;
  }

  /**
   * Démarre le worker
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Worker is already running');
    }

    this.running = true;

    // Initialiser Playwright
    this.browser = await chromium.launch({
      headless: this.headless,
    });

    console.log('🚀 TaskWorker started');

    // Boucle de polling
    this.poll();
  }

  /**
   * Arrête le worker
   */
  async stop(): Promise<void> {
    this.running = false;

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    console.log('🛑 TaskWorker stopped');
  }

  /**
   * Boucle de polling
   */
  private async poll(): Promise<void> {
    while (this.running) {
      try {
        // Si on a atteint le max de tâches simultanées, attendre
        if (this.activeTasks >= this.maxConcurrent) {
          await this.sleep(this.pollInterval);
          continue;
        }

        // Récupérer la prochaine tâche
        const task = this.taskService.getNext();

        if (task) {
          this.activeTasks++;
          // Exécuter la tâche (sans attendre)
          this.executeTask(task).finally(() => {
            this.activeTasks--;
          });
        } else {
          // Pas de tâche, attendre
          await this.sleep(this.pollInterval);
        }
      } catch (error) {
        console.error('Error in worker poll loop:', error);
        await this.sleep(this.pollInterval);
      }
    }
  }

  /**
   * Exécute une tâche
   */
  private async executeTask(task: Tache): Promise<void> {
    console.log(`📋 Executing task ${task.id} (${task.platformKey}/${task.productKey})`);

    // Marquer comme en cours
    this.taskService.markAsRunning(task.id);

    const startTime = Date.now();
    const logs: string[] = [];

    try {
      // 1. Récupérer le Lead
      const lead = this.leadService.getById(task.leadId);

      if (!lead) {
        throw new Error(`Lead ${task.leadId} not found`);
      }

      logs.push(`Lead loaded: ${lead.subscriber.firstName} ${lead.subscriber.lastName}`);

      // 2. Récupérer le Mapper
      const mapper = this.mapperFactory(task.platformKey, task.productKey);

      if (!mapper) {
        throw new Error(
          `Mapper not found for ${task.platformKey}/${task.productKey}`
        );
      }

      logs.push(`Mapper loaded: ${mapper.metadata.platformKey}/${mapper.metadata.productKey}`);

      // 3. Valider le Lead
      const validation = mapper.validate(lead);

      if (!validation.valid) {
        throw new Error(
          `Lead validation failed: ${validation.errors?.join(', ')}`
        );
      }

      if (validation.warnings && validation.warnings.length > 0) {
        logs.push(`Warnings: ${validation.warnings.join(', ')}`);
      }

      // 4. Mapper les données
      const mappedData = mapper.map(lead);
      logs.push('Lead data mapped successfully');

      // 5. Récupérer l'Adapter
      const adapter = this.adapterFactory(task.platformKey);

      if (!adapter) {
        throw new Error(`Adapter not found for ${task.platformKey}`);
      }

      logs.push(`Adapter loaded: ${adapter.metadata.platformName}`);

      // 6. Récupérer les credentials
      const credentials = this.credentialsProvider(task.platformKey);

      if (!credentials) {
        throw new Error(`Credentials not found for ${task.platformKey}`);
      }

      logs.push('Credentials loaded');

      // 7. Créer une nouvelle page Playwright
      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      const page = await this.browser.newPage();

      try {
        // 8. Initialiser l'adapter (login, etc.)
        await adapter.initialize(page, credentials);
        logs.push('Adapter initialized');

        // 9. Exécuter l'automation
        const result = await adapter.execute(page, task.productKey, mappedData, {
          timeout: 120000,
          headless: this.headless,
          screenshotOnError: true,
          saveResult: true,
        });

        logs.push(...result.logs);

        // 10. Récupérer les résultats
        const resultData = await adapter.getResult(page);

        // 11. Nettoyer
        await adapter.cleanup(page);

        // 12. Marquer comme complété
        const duration = Date.now() - startTime;

        const taskResult: TacheResult = {
          success: true,
          message: result.message || 'Task completed successfully',
          logs,
          outputPath: resultData.pdfPath,
          duration,
          data: resultData,
        };

        this.taskService.markAsCompleted(task.id, taskResult);

        console.log(`✅ Task ${task.id} completed in ${duration}ms`);
      } finally {
        await page.close();
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;

      const taskResult: TacheResult = {
        success: false,
        errorMessage: error.message || 'Unknown error',
        logs,
        duration,
      };

      this.taskService.markAsFailed(task.id, taskResult);

      console.error(`❌ Task ${task.id} failed:`, error.message);
    }
  }

  /**
   * Utilitaire pour attendre
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
