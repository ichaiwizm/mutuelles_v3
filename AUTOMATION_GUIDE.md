# Guide d'utilisation de l'Automation

Ce guide explique comment utiliser le système d'automation pour exécuter des flows sur plusieurs leads.

## 🎯 Architecture

### Vue d'ensemble
```
UI (React) → IPC → ScenariosRunner → TaskBuilder → TaskExecutor → Playwright Engine
   ↓              ↓          ↓              ↓              ↓              ↓
Sélection    Payload    Produit       TaskDefs    Exécution    Flows +
Leads +                 cartésien                 avec        Field Defs
Flows                   leads×flows              lead data
```

### Composants principaux

1. **Frontend (UI)**
   - `AutomationV3.tsx` : Page principale
   - `LeadSelector.tsx` : Sélection des leads
   - `FlowsBrowserPanel.tsx` : Sélection des flows
   - `useAutomation.ts` : Hook orchestrateur

2. **Backend (IPC Handlers)**
   - `scenarios.ts` : Handlers IPC
   - `ScenariosRunner` : Orchestrateur d'exécution
   - `taskBuilder.ts` : Création des tâches
   - `taskExecutor.ts` : Exécution des tâches

3. **Moteur d'exécution**
   - `core/engine/*` : Moteur Playwright full TypeScript (DSL)
   - Lit les flows TS (`platforms/*/flows/*.ts`)
   - Utilise les selectors TS (`platforms/*/selectors.ts`)
   - Exécute avec Playwright

## 📁 Structure des fichiers

### Flows (TypeScript)
Localisation : `platforms/{platform}/flows/{slug}.ts`

Exemple minimal:
```ts
import type { Flow } from '../../../core/dsl'

export const slsis: Flow = {
  slug: 'swisslifeone/slsis',
  platform: 'swisslifeone',
  name: 'SwissLifeOne - SLSIS',
  steps: [
    { type: 'goto', url: 'https://example.com', label: 'Open page' },
    { type: 'waitField', field: 'auth.username' },
    { type: 'fill', field: 'auth.username', value: '{credentials.username}' },
  ],
}
```

### Types de steps disponibles

- **Navigation**
  - `goto` : Naviguer vers une URL
  - `sleep` : Attendre X millisecondes
  - `enterFrame` : Entrer dans un iframe
  - `exitFrame` : Sortir d'un iframe

- **Formulaires**
  - `fill` : Remplir un champ input
  - `select` : Sélectionner une option
  - `type` : Taper du texte avec délai
  - `click` : Cliquer sur un élément

- **Utilitaires**
  - `waitField` : Attendre qu'un champ soit visible
  - `pressKey` : Appuyer sur une touche
  - `comment` : Commentaire (pas d'action)

### Selectors (TypeScript)
Localisation : `platforms/{platform}/selectors.ts`

```ts
import type { SelectorMap } from '../types'

export const selectors: SelectorMap = {
  'subscriber.firstName': { selector: "input[name='firstName']" },
  'subscriber.birthDate': { selector: '#birthDate', adapter: v => v?.split('-').reverse().join('/') },
}
```

### Adapters disponibles

- `dateIsoToFr` : Convertit YYYY-MM-DD → DD/MM/YYYY
- `extractDepartmentCode` : Extrait le département du code postal

## 🚀 Utilisation

### 1. Préparer les données

#### Créer des leads
Aller dans la page **Leads** et créer des leads avec :
- Informations souscripteur (nom, prénom, date de naissance, etc.)
- Informations conjoint (optionnel)
- Informations enfants (optionnel)
- Informations projet

#### Configurer les credentials
Dans la page **Plateformes**, configurer les identifiants pour chaque plateforme.

### 2. Créer un flow

1. Créer un fichier TS dans `platforms/{platform}/flows/`
2. Définir les steps du flow via le DSL TS
3. Définir/mettre à jour les selectors dans `platforms/{platform}/selectors.ts`

### 3. Lancer une automation

1. Aller dans la page **Automatisations**
2. Sélectionner un ou plusieurs leads (cocher les cases)
3. Sélectionner un ou plusieurs flows
   - ⚠️ **Important** : Un seul flow par plateforme
4. Cliquer sur **"Démarrer X exécution(s)"**

### 4. Suivre l'exécution

- **En temps réel** : Voir le statut de chaque exécution
  - `pending` : En attente
  - `running` : En cours
  - `success` : Terminé avec succès
  - `error` : Échoué

- **Actions disponibles** :
  - Pause/Resume d'un item
  - Retry d'un item échoué
  - Stop d'un item ou de toute l'exécution
  - Voir les screenshots

### 5. Consulter l'historique

Onglet **"Historique"** dans la page Automatisations :
- Liste de toutes les exécutions passées
- Détails des résultats
- Possibilité de relancer

## ⚙️ Configuration

### Settings (Paramètres)

Accessible via le bouton **"Paramètres"** dans la page Automatisations :

- **Mode d'exécution** :
  - `headless` : Sans interface (plus rapide)
  - `headless-minimized` : Avec fenêtre minimisée
  - `visible` : Fenêtres visibles (debug)

- **Concurrence** : Nombre d'exécutions en parallèle (1-15)
- **Retry** : Nombre de tentatives en cas d'échec
- **Keep browser open** : Garder le navigateur ouvert après exécution
- **Filtres de visibilité** : Masquer certaines plateformes/flows

## 🔧 Développement

### Ajouter une nouvelle plateforme

1. **Créer les selectors TypeScript** :
   ```typescript
   // platforms/{platform}/selectors.ts
   export const selectors: SelectorMap = {
     'subscriber.firstName': {
       selector: '#firstName',
       meta: { label: 'First name' }
     }
   }
   ```

2. **Créer des flows TS** :
   - `platforms/{platform}/flows/*.ts`

4. **Enregistrer la plateforme dans la DB** :
   ```sql
   INSERT INTO platforms_catalog (slug, name, selected)
   VALUES ('myplatform', 'My Platform', 1);
   ```

5. **Configurer les credentials** :
   Via l'UI dans la page Plateformes

### Mapping des données

Le moteur mappe automatiquement les données du lead et les credentials vers les champs, via les selectors TS.

### Variables disponibles

Dans les steps, vous pouvez utiliser :
- `{lead.subscriber.firstName}` : Données du lead
- `{credentials.username}` : Username de la plateforme
- `{credentials.password}` : Password de la plateforme

## 📊 Debugging

### Logs

- **Console backend** : Logs du ScenariosRunner
- **Run directory** : `runs/{runId}/`
  - `index.json` : Manifest avec détails de l'exécution
  - `step-XXX.png` : Screenshots de chaque step

### Problèmes courants

1. **"Selector not found"**
   → Ajouter la définition dans `platforms/{platform}/selectors.ts`

2. **"Element not found"**
   → Vérifier le sélecteur CSS dans les selectors
   → Utiliser `waitField` avant de cliquer/remplir

3. **"Multiple flows per platform"**
   → Ne sélectionner qu'un seul flow par plateforme

4. **Flow se bloque**
   → Augmenter les `sleep` entre les steps
   → Ajouter des `waitField` pour attendre le chargement

## 📦 Installation

```bash
# Installer les dépendances
npm install

# Installer les browsers Playwright
npx playwright install chromium

# Initialiser la base de données
npm run db:reset:seed

# Lancer l'application
npm run dev
```

## 🎓 Exemples

### Exemple complet : SwissLifeOne SLSIS

Voir les fichiers :
- `platforms/swisslifeone/flows/slsis.ts`
- `platforms/swisslifeone/selectors.ts`

## 🔒 Sécurité

- Les credentials sont chiffrés dans la base de données
- Les screenshots peuvent contenir des données sensibles
- Les runs sont stockés localement dans `runs/`

## 📝 Notes

- Le système crée un produit cartésien : **leads × flows**
  - 2 leads × 3 flows = 6 exécutions
- Chaque exécution est indépendante
- Les exécutions sont parallélisées selon la concurrence configurée
- Les screenshots sont pris à chaque step pour debug
