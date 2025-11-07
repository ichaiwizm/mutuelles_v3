/**
 * High-Level Flow Execution Engine
 * Uses Playwright to execute .hl.json flows with lead data
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve a value from lead data or credentials
 * Supports: {lead.subscriber.firstName}, {credentials.username}, etc.
 */
function resolveValue(value, leadData, credentials) {
  if (typeof value !== 'string') return value;

  return value.replace(/\{([^}]+)\}/g, (match, path) => {
    if (path.startsWith('lead.')) {
      const keys = path.substring(5).split('.');
      let result = leadData;
      for (const key of keys) {
        result = result?.[key];
      }
      return result ?? '';
    }

    if (path.startsWith('credentials.')) {
      const key = path.substring(12);
      return credentials?.[key] ?? '';
    }

    return match;
  });
}

/**
 * Get value from lead data using field path
 */
function getLeadValue(fieldPath, leadData, fieldDef) {
  const keys = fieldPath.split('.');
  let value = leadData;

  for (const key of keys) {
    value = value?.[key];
  }

  if (value === undefined || value === null) return null;

  // Apply valueMap if exists
  if (fieldDef?.valueMap) {
    value = fieldDef.valueMap[value] ?? fieldDef.valueMap['*'] ?? value;
  }

  // Apply adapter if exists (simple string adapters for now)
  if (fieldDef?.adapter === 'dateIsoToFr' && value) {
    // Convert YYYY-MM-DD to DD/MM/YYYY
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      value = `${match[3]}/${match[2]}/${match[1]}`;
    }
  }

  if (fieldDef?.adapter === 'extractDepartmentCode' && value) {
    // Extract department from postal code
    value = value.substring(0, 2);
    if (value === '20') {
      const thirdDigit = value.substring(2, 3);
      value = thirdDigit < '2' ? '2A' : '2B';
    }
  }

  return value;
}

/**
 * Main flow runner
 */
export async function runHighLevelFlow(options) {
  const {
    flowFile,
    fieldsFile,
    leadData,
    username,
    password,
    mode = 'headless',
    keepOpen = false,
    outRoot,
    onProgress,
    sessionRunId,
    onBrowserCreated,
    pauseGate
  } = options;

  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const runDir = path.join(outRoot, runId);

  // Create run directory
  fs.mkdirSync(runDir, { recursive: true });

  // Load flow
  const flow = JSON.parse(fs.readFileSync(flowFile, 'utf-8'));

  // Load field definitions
  let fieldDefs = {};
  if (fs.existsSync(fieldsFile)) {
    fieldDefs = JSON.parse(fs.readFileSync(fieldsFile, 'utf-8'));
  }

  const credentials = { username, password };
  const manifest = {
    run: {
      id: runId,
      slug: flow.slug,
      platform: flow.platform,
      startedAt: new Date().toISOString(),
      mode
    },
    steps: [],
    lead: {
      name: `${leadData.subscriber?.firstName || ''} ${leadData.subscriber?.lastName || ''}`.trim(),
      id: leadData.id
    }
  };

  let browser;
  let context;
  let page;
  let currentFrame = null;

  try {
    // Launch browser
    browser = await chromium.launch({
      headless: mode === 'headless',
      args: ['--start-maximized']
    });

    context = await browser.newContext({
      viewport: mode === 'headless' ? { width: 1920, height: 1080 } : null,
      ignoreHTTPSErrors: true
    });

    page = await context.newPage();

    // Notify browser created
    if (onBrowserCreated) {
      onBrowserCreated(browser, context);
    }

    // Execute steps
    for (let i = 0; i < flow.steps.length; i++) {
      const step = flow.steps[i];
      const stepStart = Date.now();

      // Pause gate
      if (pauseGate) {
        await pauseGate('before-step', i);
      }

      // Progress callback
      if (onProgress) {
        onProgress({
          stepIndex: i,
          totalSteps: flow.steps.length,
          stepMessage: step.label || step.type
        });
      }

      const stepResult = {
        index: i,
        type: step.type,
        label: step.label,
        ok: true,
        ms: 0
      };

      try {
        const target = currentFrame || page;

        switch (step.type) {
          case 'goto':
            await target.goto(step.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            break;

          case 'waitField': {
            const fieldDef = fieldDefs[step.field];
            if (!fieldDef) throw new Error(`Field definition not found: ${step.field}`);
            await target.waitForSelector(fieldDef.selector, { timeout: 30000 });
            break;
          }

          case 'fill': {
            const fieldDef = fieldDefs[step.field];
            if (!fieldDef) throw new Error(`Field definition not found: ${step.field}`);

            const value = step.value
              ? resolveValue(step.value, leadData, credentials)
              : getLeadValue(step.field, leadData, fieldDef);

            if (value !== null && value !== undefined && value !== '') {
              await target.fill(fieldDef.selector, String(value));
            }
            break;
          }

          case 'select': {
            const fieldDef = fieldDefs[step.field];
            if (!fieldDef) throw new Error(`Field definition not found: ${step.field}`);

            const value = step.value
              ? resolveValue(step.value, leadData, credentials)
              : getLeadValue(step.field, leadData, fieldDef);

            if (value !== null && value !== undefined && value !== '') {
              await target.selectOption(fieldDef.selector, String(value));
            }
            break;
          }

          case 'click': {
            const fieldDef = fieldDefs[step.field];
            if (!fieldDef) throw new Error(`Field definition not found: ${step.field}`);

            const element = await target.$(fieldDef.selector);
            if (element || !step.optional) {
              await target.click(fieldDef.selector, { timeout: 10000 });
            }
            break;
          }

          case 'type': {
            const fieldDef = fieldDefs[step.field];
            if (!fieldDef) throw new Error(`Field definition not found: ${step.field}`);

            await target.type(fieldDef.selector, step.text, { delay: step.delayMs || 50 });
            break;
          }

          case 'sleep':
            await new Promise(resolve => setTimeout(resolve, step.ms));
            break;

          case 'enterFrame': {
            const frameElement = await page.$(step.selector);
            if (!frameElement) throw new Error(`Frame not found: ${step.selector}`);
            currentFrame = await frameElement.contentFrame();
            break;
          }

          case 'exitFrame':
            currentFrame = null;
            break;

          case 'pressKey':
            await target.keyboard.press(step.key);
            break;

          case 'comment':
            // Just logging
            console.log(`[Step ${i}] ${step.text}`);
            break;

          default:
            console.warn(`Unknown step type: ${step.type}`);
        }

        // Take screenshot
        const screenshotPath = path.join(runDir, `step-${i.toString().padStart(3, '0')}.png`);
        await (currentFrame || page).screenshot({ path: screenshotPath, fullPage: false });
        stepResult.screenshot = screenshotPath;

      } catch (error) {
        stepResult.ok = false;
        stepResult.error = {
          message: error.message,
          stack: error.stack
        };

        // Screenshot on error
        try {
          const screenshotPath = path.join(runDir, `step-${i.toString().padStart(3, '0')}-error.png`);
          await (currentFrame || page).screenshot({ path: screenshotPath, fullPage: true });
          stepResult.screenshot = screenshotPath;
        } catch {}

        if (!step.optional) {
          throw error;
        }
      } finally {
        stepResult.ms = Date.now() - stepStart;
        manifest.steps.push(stepResult);
      }
    }

    manifest.run.finishedAt = new Date().toISOString();

  } catch (error) {
    manifest.error = {
      message: error.message,
      stack: error.stack,
      step: manifest.steps.length
    };
    throw error;
  } finally {
    // Save manifest
    fs.writeFileSync(
      path.join(runDir, 'index.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Close browser
    if (!keepOpen && browser) {
      await browser.close();
    }
  }

  return { runDir };
}

// Default export for backward compatibility
export default runHighLevelFlow;
