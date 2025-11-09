/**
 * Alptis Santé Select - Setup Steps
 * Login + Navigation
 */

import { step, type FlowStep } from '../../../../core/dsl';

export const setupSteps: FlowStep[] = [
  // ============================================================
  // LOGIN
  // ============================================================

  step.goto('https://pro.alptis.org/', 'accueil'),
  step.waitField('auth.username', 'login-form'),

  // Accept consent (optional, may not appear)
  step.click('consent.acceptAll', { optional: true }, 'accept-axeptio-1'),

  step.fill('auth.username', { value: '{credentials.username}' }, 'fill-user'),
  step.fill('auth.password', { value: '{credentials.password}' }, 'fill-pass'),

  step.sleep(800, 'wait-before-submit'),
  step.click('auth.submit', {}, 'submit'),

  // ============================================================
  // NAVIGATE TO PROJECT PAGE
  // ============================================================

  // IMPORTANT: Wait for the authentication to complete before navigating
  // The server needs time to validate the session after submit
  step.sleep(5000, 'wait-for-auth-validation'),

  step.goto('https://pro.alptis.org/sante-select/informations-projet/', 'goto-infos-projet'),
  step.sleep(1500, 'post-goto-wait'),
  step.waitField('project.dateEffet', 'infos-projet-ready'),

  // ============================================================
];
