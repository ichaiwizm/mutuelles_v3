# CLI Usage Guide

## 🚀 Quick Start

### Run a Flow with a Lead

```bash
npm run flow:run <platform/flow> -- --lead <leadId> [options]
```

### Example

```bash
npm run flow:run alptis/santeSelect -- --lead 3e0dc672-2069-45e3-93b2-0ff8a30c8ca6 --headless
```

### Options

- `--lead <id>` (required) - Lead ID from database
- `--headless` (default: true) - Run browser in headless mode
- `--trace <mode>` - Playwright trace mode: `on`, `retain-on-failure` (default), or `off`

**Note**: L'option `--output` a été remplacée par un système de logging automatique dans `runs/<runId>/`

---

## 📁 Output Structure

Chaque exécution crée automatiquement un dossier structuré dans `runs/<runId>/` :

```
runs/alptis-santeSelect-1762651617883-dc489058/
├── manifest.json          # Métadonnées complètes du run
├── run.log               # Logs détaillés (format NDJSON)
├── screenshots/          # Screenshots de chaque étape
│   ├── step-1.png
│   ├── step-2.png
│   └── ...
└── traces/               # Playwright traces (si activé)
    └── trace.zip
```

### Manifest.json

Le fichier `manifest.json` contient toutes les informations du run :

```json
{
  "runId": "alptis-santeSelect-1762651617883-dc489058",
  "flowSlug": "alptis/santeSelect",
  "flowName": "Alptis Santé Select",
  "platform": "alptis",
  "leadId": "3e0dc672-2069-45e3-93b2-0ff8a30c8ca6",
  "leadName": "Christine DAIRE",
  "startedAt": "2025-11-09T01:19:58.795Z",
  "completedAt": "2025-11-09T01:21:41.873Z",
  "duration": 102876,
  "success": false,
  "stepsExecuted": 9,
  "stepsFailed": 4,
  "error": "...",
  "options": {
    "headless": true,
    "trace": "retain-on-failure"
  }
}
```

### Run.log

Le fichier `run.log` contient des logs détaillés au format NDJSON (1 log JSON par ligne) :

```json
{"ts":"2025-11-09T01:19:58.801Z","level":"info","message":"Flow execution started","flowSlug":"alptis/santeSelect","leadId":"...","runId":"...","runDir":"..."}
{"ts":"2025-11-09T01:20:04.177Z","run":"alptis-santeSelect-...","idx":0,"type":"goto","ok":true,"ms":4989}
{"ts":"2025-11-09T01:20:04.974Z","run":"...","idx":1,"type":"waitField","field":"auth.username","ok":true,"ms":797}
{"ts":"2025-11-09T01:20:07.011Z","run":"...","idx":2,"type":"click","field":"consent.acceptAll","ok":true,"ms":2036}
```

Chaque log de step contient :
- `ts` - Timestamp ISO 8601
- `run` - Run ID
- `idx` - Index du step (0-based)
- `type` - Type de step (goto, click, fill, waitField, etc.)
- `field` - Field concerné (si applicable)
- `ok` - Succès (true) ou échec (false)
- `ms` - Durée en millisecondes
- `error` - Message d'erreur (si échec)

### Traces Playwright

Si le tracing est activé (`--trace on` ou `--trace retain-on-failure`), un fichier `traces/trace.zip` est créé.

**Visualiser une trace :**

```bash
npx playwright show-trace runs/<runId>/traces/trace.zip
```

Cela ouvre l'interface Playwright Trace Viewer avec :
- Timeline complète de l'exécution
- Screenshots de chaque action
- Network requests
- Console logs
- DOM snapshots

---

## 🔧 WSL/Windows Compatibility

Le CLI détecte automatiquement si vous êtes dans WSL et **exécute via Windows** pour éviter les problèmes de compatibilité binaire avec `better-sqlite3`.

### Comment ça fonctionne

```
Terminal WSL
    ↓
runner.mjs détecte WSL
    ↓
Convertit le path WSL → Windows (wslpath)
    ↓
Lance PowerShell Windows
    ↓
Exécute tsx via Node.js Windows
    ↓
Utilise better-sqlite3 compilé pour Windows ✓
```

**Code source** : `cli/runner.mjs` (lignes 20-70)

### Initial Setup (Une seule fois)

Si vous obtenez une erreur `NODE_MODULE_VERSION` au premier lancement depuis WSL :

**Option 1: Script automatique (Recommandé)**

Depuis WSL :
```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\\Users\\ichai\\Desktop\\mutuelles_v3\\scripts\\rebuild-native-windows.ps1"
```

Ou depuis PowerShell :
```powershell
cd C:\Users\ichai\Desktop\mutuelles_v3
.\scripts\rebuild-native-windows.ps1
```

**Option 2: Manuel**

1. Fermer toutes les apps Electron et terminaux
2. Depuis PowerShell :
   ```powershell
   cd C:\Users\ichai\Desktop\mutuelles_v3
   npm rebuild better-sqlite3
   ```

Après ce setup unique, le CLI fonctionne depuis WSL sans problème !

---

## 📝 Available Flows

Les flows utilisent la notation **camelCase** pour le nom du flow :

### Alptis
- `alptis/santeSelect` - Alptis Santé Select flow

### SwissLife One
- `swisslifeone/slsis` - Swiss Life SIS flow

**Important** : Les noms de flows sont en camelCase (ex: `santeSelect`), pas en kebab-case (~~`sante-select`~~).

Pour voir les flows disponibles pour une plateforme, si vous tapez un mauvais nom, le système affichera les flows disponibles :

```bash
npm run flow:run alptis/wrong-name -- --lead <id>
# Output: ❌ Flow 'wrong-name' not found in platform 'alptis'
#         Available flows: santeSelect
```

---

## 🗄️ Getting Lead IDs

### Lister tous les leads

```bash
npm run leads:list
```

Affiche :
- ID du lead
- Nom complet
- Email
- Date de naissance
- Date de création
- Metadata

### Voir un lead spécifique

Ouvrez le fichier `dev-data/mutuelles.sqlite3` avec un client SQLite ou utilisez :

```bash
sqlite3 dev-data/mutuelles.sqlite3 "SELECT id, data FROM clean_leads LIMIT 5;"
```

---

## 💡 Examples

### Exécution basique en headless

```bash
npm run flow:run alptis/santeSelect -- --lead 3e0dc672-2069-45e3-93b2-0ff8a30c8ca6 --headless
```

### Exécution avec browser visible (debugging)

```bash
npm run flow:run alptis/santeSelect -- --lead 3e0dc672-2069-45e3-93b2-0ff8a30c8ca6 --headless=false
```

### Exécution avec tracing complet

```bash
npm run flow:run alptis/santeSelect -- --lead 3e0dc672-2069-45e3-93b2-0ff8a30c8ca6 --trace on
```

Ensuite visualiser :
```bash
npx playwright show-trace runs/<runId>/traces/trace.zip
```

### Exécution sans tracing

```bash
npm run flow:run alptis/santeSelect -- --lead 3e0dc672-2069-45e3-93b2-0ff8a30c8ca6 --trace off
```

---

## 🐛 Troubleshooting

### Error: "Database not found"

La base de données n'existe pas. Créez-la avec :

```bash
npm run db:reset:seed
```

### Error: "NODE_MODULE_VERSION mismatch"

Version de Node.js différente entre WSL et Windows. Rebuild better-sqlite3 (voir section Setup).

### Error: "Flow not found"

Vérifiez :
1. Le nom du flow est bien en **camelCase** (`santeSelect` et non `sante-select`)
2. Le platform existe (`alptis`, `swisslifeone`)
3. Le flow est exporté dans `platforms/<platform>/index.ts`

Liste des flows disponibles : voir section "Available Flows" ci-dessus.

### Error: "Lead not found"

Le lead ID n'existe pas dans la base. Vérifiez avec `npm run leads:list`.

### CLI hangs or doesn't respond

1. Appuyez sur `Ctrl+C` pour annuler
2. Vérifiez qu'aucun autre processus n'utilise la DB
3. Fermez l'app Electron si elle tourne

### Timeout errors in flow execution

Les timeouts (ex: "page.waitForSelector: Timeout 30000ms exceeded") sont **normaux** si :
- Le site web a changé (sélecteurs invalides)
- Le site est lent ou injoignable
- Les credentials sont incorrects

**Ce n'est PAS un bug du CLI**, c'est le flow qui échoue. Vérifiez :
1. Les sélecteurs dans `platforms/<platform>/selectors.ts`
2. Les credentials dans la base de données
3. Que le site web est accessible

---

## ℹ️ Technical Details

### Architecture CLI

```
cli/
├── index.ts              # CLI entry point (Commander.js)
├── runner.mjs            # Cross-platform wrapper (détection WSL/Windows)
├── commands/
│   └── run.ts            # Flow execution + logging system
└── utils/
    ├── flow-loader.ts    # Dynamic flow loading (async import)
    ├── db-connection.ts  # Database access (shared connection)
    └── credentials.ts    # Credential management
```

### Code Flow - Exécution complète

```
1. npm run flow:run alptis/santeSelect -- --lead <id>
   ↓
2. package.json script: node cli/runner.mjs flow:run alptis/santeSelect --lead <id>
   ↓
3. runner.mjs
   ├─ Détecte WSL → Lance via PowerShell + Windows tsx
   └─ Sinon → Lance tsx directement
   ↓
4. cli/index.ts (Commander.js)
   └─ Parse arguments → Appelle runFlow()
   ↓
5. cli/commands/run.ts
   ├─ getLeadById() → Charge lead depuis DB
   ├─ getFlowBySlug() → Import dynamique du flow (async)
   ├─ getPlatformSelectors() → Import des sélecteurs (async)
   ├─ getCredentialsForPlatform() → Credentials DB ou env vars
   ├─ Crée runs/<runId>/ directory structure
   ├─ Crée manifest.json initial
   ├─ createLogger() → Logger avec outputPath = runs/<runId>/run.log
   └─ FlowRunner.execute()
       ↓
6. core/engine/flow-runner.ts
   ├─ BrowserManager.initialize() → Lance Playwright browser
   ├─ Pour chaque step:
   │  ├─ evaluateWhen() → Condition check
   │  ├─ StepExecutors.executeStep() → Exécute le step
   │  ├─ BrowserManager.takeScreenshot() → Screenshot dans runs/<runId>/screenshots/
   │  └─ logger.step() → Log dans run.log
   ├─ finally:
   │  ├─ BrowserManager.stopTracing() → Trace dans runs/<runId>/traces/
   │  └─ BrowserManager.cleanup() → Ferme browser
   └─ Return result
       ↓
7. cli/commands/run.ts
   ├─ Met à jour manifest.json avec résultats
   └─ Affiche output path dans console
```

### Flow Loading (Dynamic ES Modules)

Les flows sont chargés dynamiquement via `import()` asynchrone :

**Code** : `cli/utils/flow-loader.ts` (lignes 14-37)

```typescript
export async function getFlowBySlug(slug: string): Promise<Flow | null> {
  const [platform, flowName] = slug.split('/');

  try {
    // Dynamic ES module import
    const platformModule = await import(`../../platforms/${platform}/index.js`);
    const flow = platformModule[flowName] as Flow | undefined;

    if (!flow) {
      console.error(`❌ Flow '${flowName}' not found in platform '${platform}'`);
      console.error(`   Available flows: ${Object.keys(platformModule)...}`);
      return null;
    }

    return flow;
  } catch (error: any) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      console.error(`❌ Platform '${platform}' not found`);
    }
    return null;
  }
}
```

**Pourquoi async ?** Les modules TypeScript utilisent ES modules (`export/import`), pas CommonJS (`require`). L'import dynamique doit être asynchrone.

### Database Connection

**Code** : `cli/utils/db-connection.ts`

```typescript
import { getDb, closeDb } from '../../src/shared/db/connection';

export function getDatabaseConnection() {
  return getDb(); // Singleton connection
}
```

La connection utilise le même système que l'app Electron :
- Path: `dev-data/mutuelles.sqlite3`
- Mode: WAL (Write-Ahead Logging)
- Foreign keys: ON
- Table: `clean_leads` (pas `leads`)

### Logging System

**Code** : `cli/commands/run.ts` (lignes 55-90)

```typescript
// Création de la structure runs/<runId>/
const runDir = path.join(projectRoot, 'runs', runId);
fs.mkdirSync(runDir, { recursive: true });

const screenshotsDir = path.join(runDir, 'screenshots');
const tracesDir = path.join(runDir, 'traces');
fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(tracesDir, { recursive: true });

// Manifest initial
const manifest = {
  runId,
  flowSlug,
  flowName: flow.name,
  platform: flow.platform,
  leadId,
  leadName: `${lead.data.subscriber.firstName} ${lead.data.subscriber.lastName}`,
  startedAt: new Date().toISOString(),
  options: { headless, trace }
};
fs.writeFileSync(path.join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Logger avec path custom
const logPath = path.join(runDir, 'run.log');
const logger = createLogger(runId, { outputPath: logPath });

// Exécution avec outputDir
const result = await runner.execute(flow, lead.data, selectors, credentials, {
  headless: options.headless,
  trace: options.trace,
  timeout: 30000,
  screenshots: true,
  outputDir: runDir  // ← Crucial pour screenshots et traces
});

// Mise à jour du manifest avec résultats
const finalManifest = { ...manifest, completedAt, duration, success, stepsExecuted, stepsFailed, error };
fs.writeFileSync(path.join(runDir, 'manifest.json'), JSON.stringify(finalManifest, null, 2));
```

### Screenshots et Traces

**Code** : `core/engine/browser-manager.ts`

```typescript
// Screenshots (lignes 69-80)
static async takeScreenshot(context, stepIndex, options) {
  if (!options.screenshots || !context.page) return;

  const filePath = options.outputDir
    ? `${options.outputDir}/screenshots/step-${stepIndex + 1}.png`
    : `screenshots/${context.runId}-step-${stepIndex + 1}.png`;

  await context.page.screenshot({ path: filePath });
  return filePath;
}

// Traces (lignes 47-64)
static async stopTracing(context, options, stepsFailed) {
  if (!context.context) return;

  const tracePath = options.outputDir
    ? `${options.outputDir}/traces/trace.zip`
    : `traces/${context.runId}.zip`;

  if (options.trace === 'on') {
    await context.context.tracing.stop({ path: tracePath });
  } else if (options.trace === 'retain-on-failure' && stepsFailed > 0) {
    await context.context.tracing.stop({ path: tracePath });
  }
}
```

**Important** : `stopTracing` est appelé dans le `finally` block (pas le `try`) pour garantir que les traces sont sauvegardées même en cas d'erreur.

### Credentials Management

**Code** : `cli/utils/credentials.ts`

```typescript
export function getCredentialsForPlatform(db: Database, platform: string): any {
  // Priority 1: Environment variables
  const envCreds = fromEnv(platform);
  if (envCreds) return envCreds;

  // Priority 2: Database
  const stmt = db.prepare(`
    SELECT pc.username, pc.password_encrypted
    FROM platform_credentials pc
    JOIN platforms_catalog p ON p.id = pc.platform_id
    WHERE p.slug = ?
  `);
  const row = stmt.get(platform);

  if (!row) return { username: '', password: '' };

  // Handle CLI_ENCODED prefix (for CLI-seeded passwords)
  const password = row.password_encrypted.startsWith('CLI_ENCODED:')
    ? row.password_encrypted.slice('CLI_ENCODED:'.length)
    : row.password_encrypted;

  return { username: row.username, password };
}
```

**Variables d'environnement** : Format `<PLATFORM>_USERNAME` et `<PLATFORM>_PASSWORD` (ex: `ALPTIS_USERNAME`).

---

## 📚 Related Commands

### Database Management

- `npm run db:reset:seed` - Reset et seed la base de données
- `npm run db:status` - Affiche le statut de la DB
- `npm run db:migrate` - Exécute les migrations
- `npm run db:dump` - Dump de la DB

### Lead Management

- `npm run leads:list` - Liste tous les leads
- `npm run leads:show <id>` - Affiche un lead spécifique

### Development

- `npm run dev` - Lance l'app Electron en mode dev
- `npm run build` - Build l'app Electron

---

## 🔍 Advanced Usage

### Analyser les logs avec jq

Les logs sont en format NDJSON, parfait pour `jq` :

```bash
# Extraire tous les steps qui ont échoué
cat runs/<runId>/run.log | jq 'select(.ok == false)'

# Calculer la durée totale de tous les steps
cat runs/<runId>/run.log | jq -s 'map(select(.ms)) | map(.ms) | add'

# Lister tous les types de steps exécutés
cat runs/<runId>/run.log | jq -r 'select(.type) | .type' | sort | uniq -c
```

### Débugger un flow

1. **Lancer en mode visible** :
   ```bash
   npm run flow:run <flow> -- --lead <id> --headless=false
   ```

2. **Activer le tracing complet** :
   ```bash
   npm run flow:run <flow> -- --lead <id> --trace on
   ```

3. **Analyser la trace** :
   ```bash
   npx playwright show-trace runs/<runId>/traces/trace.zip
   ```

4. **Vérifier les screenshots** :
   ```bash
   ls -lh runs/<runId>/screenshots/
   ```

5. **Chercher l'erreur dans les logs** :
   ```bash
   cat runs/<runId>/run.log | jq 'select(.ok == false or .level == "error")'
   ```

### Nettoyer les anciens runs

```bash
# Supprimer les runs de plus de 7 jours
find runs/ -type d -mtime +7 -exec rm -rf {} +

# Supprimer tous les runs sauf les 10 derniers
ls -t runs/ | tail -n +11 | xargs -I {} rm -rf runs/{}
```

---

## 📖 Further Reading

- **Flow DSL Documentation** : Voir `core/dsl/` pour la définition des types de steps
- **Platform Selectors** : Voir `platforms/<platform>/selectors.ts` pour les sélecteurs CSS
- **Flow Definitions** : Voir `platforms/<platform>/flows/` pour les flows existants
- **Engine Documentation** : Voir `core/engine/` pour le moteur d'exécution
