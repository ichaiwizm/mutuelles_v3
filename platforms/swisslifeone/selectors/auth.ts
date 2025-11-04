/**
 * SwissLifeOne - Authentication Selectors
 */

import type { SelectorMap } from '../../types';

export const authSelectors: SelectorMap = {
  'auth.loginButton': {
    selector: '.button-connection',
    meta: { label: 'Bouton Se connecter (page d\'accueil)' },
  },

  'auth.username': {
    selector: '#userNameInput',
    meta: { label: 'Nom d\'utilisateur' },
  },

  'auth.password': {
    selector: '#passwordInput',
    meta: { label: 'Mot de passe' },
  },

  'auth.submit': {
    selector: '#submitButton',
    meta: { label: 'Connexion' },
  },

  'consent.acceptAll': {
    selector: '#onetrust-accept-btn-handler',
    meta: { label: 'Tout autoriser (cookies)' },
  },
};
