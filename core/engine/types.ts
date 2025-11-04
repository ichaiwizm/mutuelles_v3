/**
 * Flow Runner Types
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import type { LeadData } from '../domain';
import type { Logger } from '../log';

export interface FlowRunnerOptions {
  headless?: boolean;
  trace?: 'on' | 'retain-on-failure' | 'off';
  slowMo?: number;
  timeout?: number;
  screenshots?: boolean;
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
  logger: Logger;
  runId: string;
}

export interface ResolveContext {
  lead: LeadData;
  credentials: any;
  env: NodeJS.ProcessEnv;
}
