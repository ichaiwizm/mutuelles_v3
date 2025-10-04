# Admin — Runner CLI des flows HL (mutuelles_v3)

> **À lire en premier**
>
> • Ce dossier contient l’outillage pour **exécuter, tester et déboguer** des *High‑Level flows* ("HL") à partir de *field‑definitions* et d’un *lead*.
>
> • **Si vous êtes un *agent IA*** (ex. Codex, Claude Code, GPT‑Code, etc.), **utilisez *WSL*** et **les commandes Bash** fournies ci‑dessous (via `admin/cli/run_from_wsl.sh`). **N’utilisez pas PowerShell.**
>
> • Les artefacts complets (captures, DOM, listeners JS, logs réseau, HAR, etc.) sont exportés dans `admin/runs-cli/` à chaque run, avec un **rapport HTML**.

---

## Sommaire

* [Objectif & périmètre](#objectif--périmètre)
* [Prérequis](#prérequis)
* [Arborescence de référence](#arborescence-de-référence)
* [Concepts](#concepts)

  * [Field‑definitions](#field-definitions)
  * [Flows HL (`*.hl.json`)](#flows-hl--hljson)
  * [Leads (`admin/leads/*.json`)](#leads--adminleadsjson)
* [CLI unifié](#cli-unifié)

  * [Usage général](#usage-général)
  * [Exemples PowerShell (humain)](#exemples-powershell-humain)
  * [Exemples WSL (humain & agents IA — recommandé)](#exemples-wsl-humain--agents-ia--recommandé)
* [Artefacts produits](#artefacts-produits)
* [Playbook **Agent IA** (création ou correction de flow)](#playbook-agent-ia-création-ou-correction-de-flow)
* [Débogage & erreurs fréquentes](#débogage--erreurs-fréquentes)
* [Annexe : UI Admin (optionnel)](#annexe--ui-admin-optionnel)

---

## Objectif & périmètre

Ce runner exécute des **flows HL** (fichiers `.hl.json`) pour piloter un navigateur via **Playwright** à partir de trois sources :

1. **Field‑definitions** (sélecteurs & métadonnées, par plateforme)
2. **Lead** (données d’entrée)
3. **Flow** (suite de *steps* déclaratifs)

Le tout **sans dépendance BDD**, en lisant exclusivement les **identifiants** depuis un **`.env`**.

---

## Prérequis

* **Node.js** (16+ recommandé) et `npm ci` exécuté à la racine du repo.

* **Google Chrome** installé **sur Windows** (détection automatique par le runner).

  * Sous WSL, on délègue l’exécution au Windows via `run_from_wsl.sh` (voir plus bas), ce qui garantit l’accès à Chrome et au `.env`.

* Fichier **`.env` à la racine** du projet (jamais commité) avec identifiants :

  ```dotenv
  # Spécifiques plateforme (prioritaires)
  ALPTIS_USERNAME=your.email@example.com
  ALPTIS_PASSWORD=YourPassword

  # OU fallback générique
  FLOW_USERNAME=email@example.com
  FLOW_PASSWORD=Password
  ```

* Accès réseau aux URLs cibles (ex : `https://pro.alptis.org`).

> 🔐 **Priorité des identifiants (depuis `.env` uniquement)**
>
> 1. `<PLATFORM>_USERNAME` / `<PLATFORM>_PASSWORD` (MAJUSCULES)
> 2. `<platform>_username` / `<platform>_password` (minuscules)
> 3. `FLOW_USERNAME` / `FLOW_PASSWORD` (fallback)

---

## Arborescence de référence

```
admin/
  cli/
    run.mjs             # CLI unifié (Node/Electron)
    run_from_wsl.sh     # Wrapper WSL -> PowerShell/Windows (recommandé pour agents IA)
  engine/
    engine.mjs          # Moteur Playwright, captures, logs, rapport HTML
  field-definitions/
    alptis.json         # Sélecteurs & métadonnées par plateforme
  flows/
    alptis/
      alptis_login.hl.json
      alptis_sante_select_pro_full.hl.json
  leads/
    sample_full.json
    baptiste_deschamps.json
    nicolas_kiss.json
    xavier_pinelli.json
  runs-cli/
    <slug>/<runId>/...  # Artefacts par exécution (auto‑générés)
```

---

## Concepts

### Field‑definitions

Fichier JSON par plateforme (ex : `admin/field-definitions/alptis.json`) définissant les **champs** et leurs **sélecteurs**.

Points clés :

* `key`, `type`, `label`, `selector`.
* **Selects** : `options.open_selector` + `options.items[].option_selector` (recherche par `value` ou `label`).
* **Radio‑group** : `options[]` avec `value` + `selector` par option.
* **Toggle** : `metadata.toggle.click_selector` + `metadata.toggle.state_on_selector`.
* **Dynamic index** : `metadata.dynamicIndex.placeholder` (ex `{i}`) et `indexBase` pour cloner un sélecteur sur des listes (enfants, etc.).

### Flows HL (`*.hl.json`)

Un flow est une suite de **steps** déclaratifs. *Types supportés* (côté `engine.mjs`) :

* `goto { url }`
* `acceptConsent { selector }` (clique si présent)
* `waitForField { field }` (attend un champ défini dans les field‑defs)
* `fillField { field, value|leadKey, optional }`
* `selectField { field, leadKey|value, optional }`
* `clickField { field, optional }` (gère aussi `radio-group` + `leadKey`)
* `toggleField { field, state:"on|off" }`
* `sleep { timeout_ms }`

**Options utiles** :

* `label` (naming des captures et du rapport)
* `optional: true` → step ignoré si non applicable
* `skipIfNot: "lead.path"` → step sauté si la valeur du lead est falsy
* **Templates de valeurs** :

  * `{credentials.username}` / `{credentials.password}`
  * `{env.VARIABLE}` (depuis `process.env`)
  * `{lead.chemin.dans.lead}` (ex : `{lead.adherent.nom}`)
* **Index dynamique auto** : si `leadKey` contient `[...]` ou `.<N>`, le placeholder `{i}` est résolu (cf. enfants).

### Leads (`admin/leads/*.json`)

Les **données d’entrée** du run (dates d’effet, personne, conjoint, enfants, etc.). Exemple : `sample_full.json`. Le runner peut en piocher **un aléatoire** si vous n’en précisez pas.

---

## CLI unifié

### Usage général

```
admin/cli/run.mjs <platform> <flowSlugOrPath> [options]
admin/cli/run.mjs <flowSlugOrPath> --fields <fieldsPath> [options]

Options:
  --lead <name|path>   Lead (nom dans admin/leads/ ou chemin complet)
  --fields <path>      Chemin explicite du field‑definitions (rend <platform> optionnel)
  --headless           Mode headless (par défaut: visible avec navigateur laissé ouvert)
  -h, --help           Aide
```

**Comportements par défaut (via `run.mjs`)** :

* `mode = dev_private` (navigateur visible) si vous **n**’utilisez **pas** `--headless`.
* Captures **à chaque step** : DOM, listeners JS, screenshots.
* **Logs réseau** + **HAR** + **console** activés.
* Identifiants lus **exclusivement** depuis `.env`.

> ℹ️ Sous le capot, l’exécution est déléguée à `engine.mjs` (Playwright). Les artefacts sont écrits dans `admin/runs-cli/<slug>/<runId>/` + `report.html`.

### Exemples PowerShell (humain)

*(Exécuter depuis la **racine** du projet sur Windows)*

```powershell
# Aide
node admin/cli/run.mjs -h

# Flow complet (lead aléatoire), visible
node admin/cli/run.mjs alptis alptis_sante_select_pro_full

# Flow complet avec lead déterministe
node admin/cli/run.mjs alptis alptis_sante_select_pro_full --lead baptiste_deschamps

# Headless
node admin/cli/run.mjs alptis alptis_sante_select_pro_full --headless

# Flow par chemin + --fields (pas besoin du param <platform>)
node admin/cli/run.mjs admin/flows/alptis/alptis_login.hl.json --fields admin/field-definitions/alptis.json --lead sample_full

# (Option) Exécution via Electron (équivalente au wrapper WSL)
npx --yes cross-env ELECTRON_RUN_AS_NODE=1 electron admin/cli/run.mjs alptis alptis_sante_select_pro_full --lead nicolas_kiss
```

### Exemples WSL (humain & **agents IA — recommandé**)

> **Agents IA :** utilisez **toujours** ces commandes. Elles garantissent l’emploi de Chrome Windows et la lecture du `.env` Windows.

```bash
# Aide (affiche l’aide du runner)
node admin/cli/run.mjs -h

# ✅ RECOMMANDÉ (wrapper) : visible
admin/cli/run_from_wsl.sh alptis alptis_sante_select_pro_full --lead baptiste_deschamps

# ✅ RECOMMANDÉ (wrapper) : headless
admin/cli/run_from_wsl.sh alptis alptis_sante_select_pro_full --headless

# ✅ RECOMMANDÉ (wrapper) : flow par chemin + --fields
admin/cli/run_from_wsl.sh alptis admin/flows/alptis/alptis_login.hl.json --fields admin/field-definitions/alptis.json --lead sample_full

# (Direct, sans wrapper — OK si Chrome Linux installé, sinon à éviter)
node admin/cli/run.mjs alptis alptis_sante_select_pro_full --lead nicolas_kiss
```

---

## Artefacts produits

Chaque run génère `admin/runs-cli/<slug>/<runId>/` avec :

* `report.html` : **tableau interactif** des steps (OK/ERREUR, durées) + miniatures et liens rapides.
* `index.json` : manifeste machine‑readable.
* `screenshots/step-XX-<label>.png` : capture après chaque step.
* `dom/step-XX.html` : **DOM complet** après chaque step (utile pour revoir les sélecteurs).
* `js/step-XX.listeners.json` : **listeners JS** de l’élément visé (type, options, source).

  * `js/scripts/script-<id>.js` : sources reciblées via CDP si disponible.
* `network/requests.jsonl`, `responses.jsonl`, `console.jsonl` : logs **réseau** et **console**.
* `network/har.har` : **HAR** complet (si activé, c’est le cas par défaut via `run.mjs`).
* `trace/trace.zip` : **trace Playwright** si `trace: "on"|"retain-on-failure"` dans le flow.
* `progress.ndjson` : chronologie des événements (debug machine‑friendly).

**Astuce WSL :** ouvrir rapidement le dernier rapport dans l’explorateur Windows :

```bash
SLUG=alptis_sante_select_pro_full
LAST_RUN=$(ls -td admin/runs-cli/$SLUG/* | head -1)
explorer.exe "$(wslpath -w "$LAST_RUN/report.html")"
```

---

## Playbook **Agent IA** (création ou correction de flow)

> Ce qui suit décrit **comment l’outil est censé être utilisé** par un agent IA guidé par l’utilisateur.

### A. Créer un **nouveau flow**

1. **Brief** de l’utilisateur : fournir à l’agent IA les **URLs** cibles et des **instructions** (chemin d’écran, choix attendus…).
2. **Génération** par l’agent : créer `admin/flows/<plateforme>/<slug>.hl.json` avec des steps HL **haut niveau** (préférer `*Field` + `field‑definitions` plutôt que des sélecteurs en dur).
3. **Test initial (WSL)** :

   ```bash
   admin/cli/run_from_wsl.sh <plateforme> <slug> --lead sample_full
   ```
4. **Inspection artefacts** : ouvrir `report.html`, vérifier `dom/`, `js/`, `network/` et screenshots.
5. **Itérations** : ajuster le flow (ou `field-definitions`) si :

   * `Champ introuvable` → clé `field-definitions` manquante/erronée
   * `Selector manquant` → compléter `selector` (ou `open_selector`/`option_selector`)
   * `Valeur manquante` → corriger `leadKey` / marquer `optional`
   * Dropdown/radios → renseigner `options.items[].option_selector` avec un mapping stable
   * Multi‑items (enfants) → vérifier `dynamicIndex.placeholder/indexBase`
6. **Validation** : relancer, consigner le **chemin d’artefacts** et un court **résumé**.

### B. **Corriger** un flow existant

1. **Brief** de l’utilisateur : décrire « ce qui ne va pas » (ex : bouton renommé, champ déplacé).
2. **Run de repro (WSL)** :

   ```bash
   admin/cli/run_from_wsl.sh <plateforme> <slug> --lead <nom_du_lead>
   ```
3. **Analyse** :

   * `dom/step-XX.html` → adapter les sélecteurs dans `field-definitions`.
   * `js/step-XX.listeners.json` → confirmer l’évènement attendu.
   * `network/*` + `har.har` → vérifier les requêtes soumises.
4. **Patch** : modifier `admin/field-definitions/<plateforme>.json` ou le flow.
5. **Re‑test** et **rapport** : relancer, fournir le lien vers `report.html` + un diff succinct.

> **Règle d’or pour agents IA** :
>
> * **Toujours exécuter depuis WSL** avec `admin/cli/run_from_wsl.sh`.
> * **Toujours préciser `--lead`** pour des runs déterministes.
> * Préférer `--headless` pour les boucles rapides ; basculer en visible seulement au besoin.

---

## Débogage & erreurs fréquentes

* **Credentials not found for platform** → compléter `.env` (voir [Prérequis](#prérequis)).
* **Flow file not found** → vérifier `<platform>` + `<slug>` ou passer le **chemin** + `--fields`.
* **Field introuvable / selector manquant** → compléter `admin/field-definitions/<platform>.json`.
* **option_selector manquant** sur un `selectField` → ajouter l’item correct (par `value` ou `label`).
* **Valeur manquante pour ...** → mauvais `leadKey`, ou champ effectivement vide ; utiliser `optional: true` si attendu.
* **Chrome non détecté** (sous WSL) → utiliser le **wrapper** `run_from_wsl.sh` (délègue à Windows + Chrome).
* **Popin cookies / consentement** → ajouter `acceptConsent` au bon moment (login &/ou page cible).
* **Dates** (date‑picker) → le moteur envoie `Escape` après `fillField` pour fermer le calendrier.

---

## Annexe : UI Admin (optionnel)

Une page Admin (Electron) liste les flows HL et permet de runner en **Headless**, **Visible** ou **Privée + keep** avec sélection d’un lead. Les logs s’affichent en direct. Cette UI appelle les mêmes APIs que le CLI, mais **le CLI reste la voie officielle** pour agents IA et automatisations.

---

## Notes d’implémentation

* `run.mjs` force par défaut : `dom:"all"`, `jsinfo:"all"`, `networkLog:true`, `har:true`, `consoleLog:true`.
* Le rapport HTML (`report.html`) récapitule les steps, miniatures et liens vers `dom/` et `js/`.
* Les logs sensibles sont légèrement **masqués** dans certains flux (`password|token|authorization|cookie`), mais **les screenshots/DOM peuvent contenir des données** : manipulez les artefacts avec précaution.

---

**Bon run !**
