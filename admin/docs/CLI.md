# CLI Admin — Exécution des flows (Unifié)

Ce guide explique comment exécuter les flows admin depuis la ligne de commande avec l'architecture unifiée (1 engine + 1 runner).

**Architecture:**
- **Engine**: `admin/engine/engine.mjs` — Moteur d'exécution unifié (field-definitions + lead + flow)
- **Runner**: `admin/cli/run.mjs` — CLI unique pour tous les flows
- **Wrapper WSL**: `admin/cli/run_from_wsl.sh` — Exécution depuis WSL vers Windows

**Caractéristiques:**
- ✅ Zéro dépendance DB (pas de lecture/écriture base de données)
- ✅ Credentials depuis `.env` (recommandé) ou flags CLI
- ✅ Mode par défaut: navigation privée visible + fenêtre ouverte
- ✅ Leads aléatoires ou spécifiques
- ✅ Artefacts riches (screenshots, DOM, JS, trace, HAR)

## Prérequis

- **OS**: Windows, Node.js LTS ≥ 18 (recommandé ≥ 20), npm
- **Chrome**: Installé et détectable (Stable) ou chemin explicite
- **Electron**: Installé via `npm install`
- **WSL**: (Optionnel) Pour exécution depuis WSL sous Windows

## Configuration des identifiants

### Fichier .env (OBLIGATOIRE)

Créez un fichier `.env` à la racine du projet (déjà dans `.gitignore`):

```env
# Identifiants par plateforme (recommandé)
ALPTIS_USERNAME=votre.email@example.com
ALPTIS_PASSWORD=VotreMotDePasse

SWISSLIFE_USERNAME=VOTRELOGIN
SWISSLIFE_PASSWORD=VotreMotDePasse

# Fallback générique
FLOW_USERNAME=email@example.com
FLOW_PASSWORD=MotDePasseGenerique
```

**⚠️ IMPORTANT**:
- Le fichier `.env` est la **SEULE** source de credentials (pas de flags CLI, pas de variables d'environnement externes)
- Ne JAMAIS committer le fichier `.env` avec des credentials réels

### Résolution des credentials (depuis `.env` uniquement)

1. **Platform-specific (majuscules)**: `ALPTIS_USERNAME` / `ALPTIS_PASSWORD`
2. **Platform-specific (minuscules)**: `alptis_username` / `alptis_password`
3. **Fallback générique**: `FLOW_USERNAME` / `FLOW_PASSWORD`

## Usage de base

### Commande standard

```bash
# Via npm (recommandé)
npm run flows:run -- <platform> <flowSlugOrPath> [options]

# Via electron directement
npx cross-env ELECTRON_RUN_AS_NODE=1 electron admin/cli/run.mjs <platform> <flowSlugOrPath> [options]
```

### Arguments

| Argument | Description | Exemple |
|----------|-------------|---------|
| `<platform>` | Slug de la plateforme | `alptis`, `swisslife` |
| `<flowSlugOrPath>` | Slug du flow ou chemin complet | `alptis_sante_select_pro_full` ou `admin/flows/alptis/login.hl.json` |

### Options

| Option | Description | Défaut |
|--------|-------------|--------|
| `--lead <name\|path>` | Lead spécifique (nom ou chemin) | Aléatoire depuis `admin/leads/` |
| `--headless` | Mode headless (invisible, auto-close) | `false` (mode visible, fenêtre ouverte) |
| `--help`, `-h` | Affiche l'aide | — |

## Exemples

### Exécution basique

```bash
# Avec credentials depuis .env, lead aléatoire
npm run flows:run -- alptis alptis_sante_select_pro_full

# Avec lead spécifique
npm run flows:run -- alptis alptis_sante_select_pro_full --lead baptiste_deschamps
```

### Mode headless

```bash
# Exécution en arrière-plan (invisible, auto-close)
npm run flows:run -- alptis alptis_sante_select_pro_full --headless
```

### Chemin de flow complet

```bash
# Utiliser un chemin de flow au lieu d'un slug
npm run flows:run -- alptis admin/flows/alptis/custom_flow.hl.json
```

## Exécution depuis WSL (Windows Subsystem for Linux)

Le wrapper `admin/cli/run_from_wsl.sh` permet d'exécuter le runner depuis WSL tout en utilisant Node.js et Chrome Windows natifs.

### Usage WSL

```bash
# Depuis WSL, à la racine du projet
admin/cli/run_from_wsl.sh <platform> <flowSlugOrPath> [options]
```

### Exemples WSL

```bash
# Basique (credentials depuis .env)
admin/cli/run_from_wsl.sh alptis alptis_sante_select_pro_full

# Avec lead spécifique
admin/cli/run_from_wsl.sh alptis alptis_sante_select_pro_full --lead baptiste_deschamps

# Mode headless depuis WSL
admin/cli/run_from_wsl.sh alptis alptis_sante_select_pro_full --headless
```

**Note**: Le wrapper lit automatiquement le fichier `.env` côté Windows. Aucune propagation de variables d'environnement n'est nécessaire.

## Structure des fichiers

### Fichiers requis

```
admin/
├── engine/
│   └── engine.mjs              # Moteur d'exécution unifié
├── cli/
│   ├── run.mjs                 # Runner CLI principal
│   └── run_from_wsl.sh         # Wrapper WSL → Windows
├── field-definitions/
│   ├── alptis.json             # Définitions champs Alptis
│   └── swisslife.json          # Définitions champs SwissLife
├── flows/
│   ├── alptis/
│   │   ├── alptis_login.hl.json
│   │   └── alptis_sante_select_pro_full.hl.json
│   └── swisslife/
│       └── swisslife_login.hl.json
└── leads/
    ├── baptiste_deschamps.json
    ├── nicolas_kiss.json
    └── xavier_pinelli.json
```

### Résolution automatique

| Type | Règle de résolution |
|------|---------------------|
| **Fields** | `admin/field-definitions/<platform>.json` |
| **Flow (slug)** | `admin/flows/<platform>/<slug>.hl.json` |
| **Flow (path)** | Chemin complet fourni |
| **Lead (name)** | `admin/leads/<name>.json` |
| **Lead (path)** | Chemin complet fourni |
| **Lead (auto)** | Fichier aléatoire dans `admin/leads/` |

## Artefacts de sortie

Chaque run génère un dossier d'artefacts dans `admin/runs-cli/<slug>/<runId>/`:

```
admin/runs-cli/alptis_sante_select_pro_full/20250104-143027-a3f2b1/
├── index.json                  # Manifeste du run (métadonnées, steps, artefacts)
├── report.html                 # Rapport visuel (timeline, screenshots, liens)
├── progress.ndjson             # Événements temps réel
├── screenshots/
│   ├── step-01-goto.png
│   ├── step-02-fill-username.png
│   └── error-03.png            # Capture d'erreur si échec
├── dom/
│   ├── step-01.html            # DOM complet à chaque étape (si dom=errors|steps|all)
│   └── step-01.focus.html      # DOM focalisé sur l'élément interagi
├── js/
│   ├── step-01.listeners.json  # Event listeners JS (si jsinfo=errors|steps|all)
│   └── scripts/
│       └── script-123.js       # Sources JS extraites
└── network/
    ├── console.jsonl           # Logs console page (si --console)
    ├── requests.jsonl          # Requêtes réseau (si --network)
    └── responses.jsonl         # Réponses réseau (si --network)
```

### Fichier report.html

Ouvrez `report.html` dans un navigateur pour visualiser:
- Timeline des étapes avec statut (OK/ERREUR)
- Screenshots inline
- Liens vers DOM, JS listeners, etc.
- Métadonnées du run (plateforme, mode, durée, Chrome)

## Modes d'exécution

| Mode | Headless | Fenêtre visible | KeepOpen | Usage |
|------|----------|-----------------|----------|-------|
| `dev_private` | ❌ | ✅ | ✅ | **Défaut** — Navigation privée visible, fenêtre reste ouverte |
| `headless` | ✅ | ❌ | ❌ | Mode invisible pour CI/CD, auto-close |

**Comportement automatique:**
- Par défaut: `dev_private` (visible, fenêtre ouverte)
- Avec `--headless`: `headless` (invisible, auto-close)
- Pas d'override CLI pour `keepOpen` (comportement fixe selon mode)

## Sécurité & confidentialité

### Credentials

- ✅ **OBLIGATOIRE**: Fichier `.env` à la racine (jamais commité)
- ❌ **Pas de flags CLI** pour les credentials
- ❌ **Pas de variables d'environnement externes** (uniquement `.env`)

### Artefacts

Les artefacts peuvent contenir:
- Screenshots de pages avec données sensibles
- DOM HTML complet (potentiellement avec tokens, session IDs)
- Requêtes réseau (bodies, headers)

**⚠️ Traiter le dossier `admin/runs-cli/` comme confidentiel.**

Le dossier est déjà dans `.gitignore` et ne sera jamais commité.

### Redaction

Par défaut, une regex masque les patterns sensibles dans les logs:
```
(password|token|authorization|cookie)=([^;\s]+)
```

Exemple: `password=secret123` → `password=***`

## Dépannage

### Erreur: "Credentials not found"

**Cause**: Aucun credential trouvé pour la plateforme.

**Solution**:
1. Vérifier le fichier `.env` à la racine
2. Vérifier le nom de la plateforme (maj/min)
3. Utiliser `--username` / `--password` en override

### Erreur: "Field definitions not found"

**Cause**: Fichier `admin/field-definitions/<platform>.json` manquant.

**Solution**:
1. Vérifier le slug de la plateforme
2. Créer le fichier s'il n'existe pas

### Erreur: "Flow file not found"

**Cause**: Fichier flow introuvable.

**Solution**:
1. Si slug: vérifier `admin/flows/<platform>/<slug>.hl.json`
2. Si path: vérifier le chemin complet

### Erreur: "No lead files found"

**Cause**: Dossier `admin/leads/` vide.

**Solution**: Ajouter au moins un fichier lead JSON dans `admin/leads/`.

### Chrome introuvable

**Cause**: Chrome non détecté automatiquement.

**Solution**: Installer Chrome Stable ou spécifier le chemin via variable d'env `CHROME_EXE` (non implémenté dans cette version, détection auto seulement).

### Exécution WSL échoue

**Cause**: Binaires Linux incompatibles avec Windows.

**Solution**: Utiliser le wrapper `admin/cli/run_from_wsl.sh` qui exécute via PowerShell Windows.

## Migration depuis anciennes versions

### Anciens runners (dépréciés)

Les runners suivants ont été **supprimés** et remplacés par `admin/cli/run.mjs`:

- ❌ `run_flow.mjs` — Ancien runner avec support DB
- ❌ `run_file_flow.mjs` — Runner DB-only
- ❌ `run_hl_flow.mjs` — Runner High-Level avec DB

### Anciens wrappers WSL (dépréciés)

- ❌ `run_hl_from_wsl.sh` — Remplacé par `run_from_wsl.sh`

### Migration des commandes

| Ancien | Nouveau |
|--------|---------|
| `npm run flows:run:dev -- <slug>` | `npm run flows:run -- <platform> <slug>` |
| `npm run flows:run:devp -- <slug>` | `npm run flows:run -- <platform> <slug>` (mode par défaut) |
| `admin/cli/run_hl_from_wsl.sh --platform alptis --flow ... --lead ...` | `admin/cli/run_from_wsl.sh alptis <slug> --lead <name>` |

### Principales différences

1. **Pas de DB**: Les credentials ne sont PLUS lus depuis la base de données
2. **Paramètres positionnels**: Platform et flow sont maintenant des arguments obligatoires
3. **Mode par défaut**: `dev_private` (visible + keepOpen) au lieu de `headless`
4. **Lead aléatoire**: Si `--lead` non fourni, un lead aléatoire est sélectionné
5. **Simplification**: 1 seul runner au lieu de 3

## Exemples avancés

### Run avec lead personnalisé

```bash
# Lead par nom (recherche dans admin/leads/)
npm run flows:run -- alptis alptis_sante_select_pro_full --lead baptiste_deschamps

# Lead par chemin complet
npm run flows:run -- alptis alptis_sante_select_pro_full --lead /chemin/vers/mon_lead.json
```

### Run headless pour CI/CD

```bash
# Mode invisible, auto-close
npm run flows:run -- alptis alptis_sante_select_pro_full --headless

# Vérifier le code de sortie
if [ $? -eq 0 ]; then
  echo "✓ Flow succeeded"
else
  echo "✗ Flow failed"
  exit 1
fi
```

### Run avec toutes les options disponibles

```bash
# Toutes les options disponibles
npm run flows:run -- alptis alptis_sante_select_pro_full \
  --lead baptiste_deschamps \
  --headless
```

## Support

Pour toute question ou problème:
1. Consulter cette documentation
2. Vérifier les artefacts dans `admin/runs-cli/`
3. Examiner le fichier `report.html` pour diagnostiquer les erreurs
4. Ouvrir une issue sur le dépôt du projet

---

**Version**: Unified CLI v1.0 (Janvier 2025)
