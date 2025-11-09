/**
 * Flow Runner Types
 */

import type { Browser, BrowserContext, Page } from 'playwright-core';
import type { LeadData } from '../domain';
import type { Logger } from '../log';

export interface FlowRunnerOptions {
  headless?: boolean;
  trace?: 'on' | 'retain-on-failure' | 'off';
  slowMo?: number;
  timeout?: number;
  screenshots?: boolean;
  outputDir?: string;
  // When true, leave browser/context/page open after flow completes
  keepOpen?: boolean;
  onProgress?: (payload: { stepIndex: number; totalSteps: number; step: any; ok?: boolean; ms?: number; screenshot?: string }) => void;
  onBrowserCreated?: (browser: Browser, context: BrowserContext) => void;
  pauseGate?: (where: 'begin' | 'before-step', stepIndex?: number) => Promise<void>;
}

export interface FlowRunResult {
  success: boolean;
  duration: number;
  stepsExecuted: number;
  stepsFailed: number;
  error?: string;
}

export interface FlowRunnerContext {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  mainPage?: Page; // Always points to the main page, even when inside a frame
  logger: Logger;
  runId: string;
}

export interface ResolveContext {
  lead: LeadData;
  credentials: any;
  env: NodeJS.ProcessEnv;
}
