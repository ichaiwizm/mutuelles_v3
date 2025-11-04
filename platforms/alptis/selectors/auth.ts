/**
 * Alptis - Authentication Selectors
 */

import type { SelectorMap } from '../../types';

export const authSelectors: SelectorMap = {
'auth.username': {
  selector: '#username',
  meta: { label: 'Nom d\'utilisateur' },
},

'auth.password': {
  selector: '#password',
  meta: { label: 'Mot de passe' },
},

'auth.submit': {
  selector: 'button[type="submit"]',
  meta: { label: 'Connexion' },
},
};
