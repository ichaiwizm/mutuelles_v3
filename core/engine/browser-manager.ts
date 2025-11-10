/**
 * Browser Manager
 * Handles browser lifecycle, tracing, and screenshots
 */

import { chromium } from 'playwright-core';
import type { FlowRunnerOptions, FlowRunnerContext } from './types';

export class BrowserManager {
  /**
   * Initialize browser, context, and page
   */
  static async initialize(
    context: FlowRunnerContext,
    options: FlowRunnerOptions
  ): Promise<void> {
    // Launch browser
    const launchOptions: any = {
      headless: options.headless ?? true,
      slowMo: options.slowMo,
    };

    // Add executablePath if provided
    if (options.executablePath) {
      launchOptions.executablePath = options.executablePath;
    }

    context.browser = await chromium.launch(launchOptions);

    // Create context
    context.context = await context.browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    if (options.onBrowserCreated) {
      try { options.onBrowserCreated(context.browser, context.context) } catch {}
    }

    // Enable tracing if requested
    if (options.trace === 'on' || options.trace === 'retain-on-failure') {
      await context.context.tracing.start({
        screenshots: true,
        snapshots: true,
      });
    }

    // Create page
    context.page = await context.context.newPage();
    context.mainPage = context.page; // Keep reference to main page for screenshots
  }

  /**
   * Stop tracing if needed
   */
  static async stopTracing(
    context: FlowRunnerContext,
    options: FlowRunnerOptions,
    stepsFailed: number
  ): Promise<void> {
    if (!context.context) return;

    // Use outputDir if provided, otherwise fall back to traces/
    const tracePath = options.outputDir
      ? `${options.outputDir}/traces/trace.zip`
      : `traces/${context.runId}.zip`;

    if (options.trace === 'on') {
      await context.context.tracing.stop({ path: tracePath });
    } else if (options.trace === 'retain-on-failure' && stepsFailed > 0) {
      await context.context.tracing.stop({ path: tracePath });
    }
  }

  /**
   * Take screenshot if enabled
   */
  static async takeScreenshot(
    context: FlowRunnerContext,
    stepIndex: number,
    options: FlowRunnerOptions
  ): Promise<string | undefined> {
    if (!options.screenshots) return;
    // Always use mainPage for screenshots, even when inside a frame
    const screenshotPage = context.mainPage || context.page;
    if (!screenshotPage) return;
    const filePath = options.outputDir
      ? `${options.outputDir}/screenshots/step-${stepIndex + 1}.png`
      : `screenshots/${context.runId}-step-${stepIndex + 1}.png`;
    await screenshotPage.screenshot({ path: filePath }).catch(()=>{})
    return filePath
  }

  /**
   * Cleanup browser resources
   */
  static async cleanup(context: FlowRunnerContext): Promise<void> {
    // Close the main page (not the frame, if we're in one)
    if (context.mainPage) {
      await context.mainPage.close().catch(() => {});
    }
    if (context.context) {
      await context.context.close().catch(() => {});
    }
    if (context.browser) {
      await context.browser.close().catch(() => {});
    }
  }
}
