/**
 * Alptis - Authentication Selectors
 */

import type { SelectorMap } from '../../types';

export const authSelectors: SelectorMap = {
'auth.username': {
  selector: 'input[placeholder="Email ou identifiant individuel"]',
  meta: { label: 'Nom d\'utilisateur' },
},

'auth.password': {
  selector: 'input[type="password"]',
  meta: { label: 'Mot de passe' },
},

'auth.submit': {
  selector: 'button[type="submit"]',
  meta: { label: 'Connexion' },
},
};
