/**
 * SLSIS Flow - Setup Steps
 * Login + Navigation + Enter iframe
 */

import { step, type FlowStep } from '../../../../core/dsl';

export const setupSteps: FlowStep[] = [
  // ============================================================
  // LOGIN
  // ============================================================

  step.goto('https://www.swisslifeone.fr/', 'accueil'),
  step.waitField('auth.loginButton', 'wait-login-button'),
  step.click('auth.loginButton', {}, 'click-login-button'),
  step.sleep(2000, 'wait-sso-load'),

  step.waitField('auth.username', 'wait-sso-form'),
  step.fill('auth.username', { value: '{credentials.username}' }, 'fill-user'),
  step.fill('auth.password', { value: '{credentials.password}' }, 'fill-pass'),
  step.click('auth.submit', {}, 'submit'),

  step.sleep(5000, 'wait-post-login'),
  step.click('consent.acceptAll', { optional: true }, 'accept-cookies'),
  step.sleep(1000, 'wait-after-cookies'),

  // ============================================================
  // NAVIGATE TO SLSIS
  // ============================================================

  step.goto('https://www.swisslifeone.fr/index-swisslifeOne.html#/tarification-et-simulation/slsis', 'goto-slsis-page'),
  step.sleep(1500, 'wait-slsis-load'),

  step.enterFrame('iframe[name="iFrameTarificateur"]', 'enter-slsis-iframe'),
  step.sleep(800, 'wait-iframe-ready'),
];
