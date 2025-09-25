# CLI Flows — Exécution et Observabilité (sans écrire en DB)

Ce guide explique comment exécuter les flows depuis la ligne de commande, en lisant la DB pour récupérer l’essentiel (plateforme, URL de login, identifiants, profil, chemin Chrome), mais en n’écrivant rien dans la DB. Tous les artefacts sont produits sur disque, par run, avec un rapport HTML.

Chemins importants:
- Script: `scripts/cli/run_flow.mjs`
- Helpers DB (lecture seule): `scripts/cli/lib/db_readers.mjs`
- Dossier des flows JSON: `flows/`
- Dossier des artefacts (par défaut): `runs-cli/`

## Prérequis
- Windows, Node.js LTS ≥ 18 (recommandé ≥ 20), npm.
- Chrome installé (Stable). La CLI saura le détecter; vous pouvez forcer un chemin via `--chrome`.
- La DB “dev” se situe en `dev-data/mutuelles.sqlite3` (créée au premier lancement de l’app). La CLI lit:
  - `platforms_catalog`, `platform_pages` (URL login),
  - `platform_credentials` (username + mot de passe chiffré),
  - `profiles` (profil Chrome),
  - `settings.chrome_path`.

Remarque: en mode CLI, le déchiffrement `safeStorage` peut être indisponible; dans ce cas, utilisez un `.env` à la racine ou passez `--vars username=... --vars password=...`.

### Fichier .env (recommandé)

Placez un fichier `.env` à la racine (exemple fourni: `.env.example`). Il sera chargé automatiquement par la CLI, sans écraser des variables déjà présentes dans l’environnement.

Clés prises en charge (par priorité):
- Par plateforme: `ALPTIS_USERNAME` / `ALPTIS_PASSWORD`, `SWISSLIFE_USERNAME` / `SWISSLIFE_PASSWORD`
- Alternatives minuscules: `alptis_username` / `alptis_password`, `swisslife_username` / `swisslife_password`
- Fallback générique: `FLOW_USERNAME` / `FLOW_PASSWORD`

Exemple:
```
ALPTIS_USERNAME=Fragoso.n@france-epargne.fr
ALPTIS_PASSWORD=********
SWISSLIFE_USERNAME=KGLV59L
SWISSLIFE_PASSWORD=********
```
Ces valeurs ne doivent jamais être committées; utilisez `.env` local (déjà ignoré par .gitignore).

## Commandes de base

Utiliser npm (notez le double `--` pour transmettre les options au script):

```
npm run flows:run -- -- <slug> [options]
npm run flows:run -- -- --file flows/<platform>/<slug>.json [options]
```

Alias pratiques:
- `npm run flows:run:dev` — équivaut à `--mode dev`
- `npm run flows:run:devp` — équivaut à `--mode dev_private`

Alternative robuste (bypass npm) si votre shell réécrit les options:

```
npx cross-env ELECTRON_RUN_AS_NODE=1 electron scripts/cli/run_flow.mjs <slug> [options]
```

## Résolution des données
1. Flow: par `--file`, sinon par `slug` (recherche d’un fichier JSON correspondant dans `flows/`).
2. Plateforme: lue depuis le JSON (`platform`) puis DB `platforms_catalog` (id/slug/name).
3. URL de login (fallback): `platform_pages` pour `slug='login'` si un `step.goto` n’a pas d’URL.
4. Identifiants: `platform_credentials` → `username` + déchiffrement du mot de passe via `safeStorage` si possible. Sinon, fournir `--vars username=... --vars password=...`.
5. Chrome: priorité `--chrome`, sinon `settings.chrome_path` (si valide), sinon détection locale, sinon `channel: 'chrome'` Playwright (Chrome stable installé).
6. Profil (mode `dev`): dernier `profiles.initialized_at` (persistant). Surchargable via `--profile-dir`.

## Options

Exécution
- `--mode headless|dev|dev_private` (défaut `headless`)
  - `headless`: Chromium/Chrome en headless (contexte non persistant)
  - `dev`: Chrome visible et profil persistant (DB `profiles` ou `--profile-dir`)
  - `dev_private`: Chrome visible, navigation privée (nouveau contexte)
- `--chrome <path>`: chemin complet de `chrome.exe` (surclasse la détection/DB)
- `--profile-dir <dir>`: chemin du profil (utilisé en `--mode dev`)
- `--keep-open`: ne ferme pas le navigateur en fin de run

Observabilité
- `--trace on|retain-on-failure`: Trace Playwright (screenshots, snapshots, sources → `trace/trace.zip`)
- `--har`: capture réseau HAR (`network/har.har`)
- `--video`: enregistre une vidéo (contexts non persistants)
- `--console`: logs console + erreurs page (`network/console.jsonl`)
- `--network`: logs réseau JSONL (requêtes/réponses). Attention aux données sensibles; voir “Sécurité”.
- `--dom errors|steps|all`: snapshots HTML de la page + focus autour des éléments touchés
- `--js errors|steps|all`: listeners JS (via CDP) + sources des scripts
- `--a11y`: snapshot accessibilité par étape
- `--redact <regex>`: regex de masquage appliquée aux logs texte (défaut: `(password|token|authorization|cookie)=([^;\s]+)`)

Sortie
- `--out-root <dir>`: dossier racine des runs (défaut `runs-cli`)
- `--report html|json|none`: génère `report.html` et/ou `index.json`
- `--open`: ouvre le dossier du run à la fin
- `--json`: émet aussi la progression sur stdout en NDJSON

Credentials
- `--vars username=... --vars password=...`: identifiants si `safeStorage` indisponible

## Artefacts de sortie

`runs-cli/<slug>/<YYYYMMDD-HHMMSS>-<id>/`
- `index.json`: manifeste (métadonnées run, options, steps, artefacts)
- `report.html`: rapport statique (timeline, captures, liens DOM/JS)
- `progress.ndjson`: événements temps réel
- `screenshots/step-XX-*.png`, `error-XX.png`
- `trace/trace.zip` (si `--trace`)
- `network/console.jsonl`, `network/requests.jsonl`, `network/responses.jsonl`, `network/har.har` (si `--har`)
- `dom/step-XX.html`, `dom/step-XX.focus.html`
- `js/step-XX.listeners.json`, `js/scripts/script-*.js`
- `video/run.webm` (si `--video` et contexte supporté)

## Exemples

1) Dev privée (fenêtre visible) + rapport, sans logs réseau:

```
npm run flows:run -- -- alptis_login \
  --mode dev_private --trace retain-on-failure --video --console \
  --dom steps --js steps --report html --open \
  --vars username="VOTRE_LOGIN" --vars password="VOTRE_MDP"
```

2) Dev (profil persistant de la DB), détection auto de Chrome, avec `.env`:

```
# .env: ALPTIS_USERNAME / ALPTIS_PASSWORD
npm run flows:run -- -- alptis_login --mode dev --report html --open
```

3) Forcer le chemin Chrome (install per-user):

```
npm run flows:run -- -- alptis_login --mode dev \
  --chrome "C:\\Users\\<vous>\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe" \
  --report html --open --vars username="..." --vars password="..."
```

4) Audit plus lourd (réseau inclus — attention données sensibles):

```
npm run flows:run -- -- alptis_login \
  --mode dev_private --trace on --har --video --console --network \
  --dom all --js steps --report html --open \
  --vars username="..." --vars password="..."
```

## Sécurité & confidentialité
- Par défaut, une regex de redaction masque `password|token|authorization|cookie` dans les textes, mais elle ne filtre pas automatiquement les bodies binaires.
- Si vous activez `--network`, évitez d’envoyer un mot de passe réel, ou ajoutez une regex personnalisée avec `--redact`.
- Les artefacts contiennent des HTML/scripts potentiellement sensibles. Traitez le dossier du run comme confidentiel.

## Dépannage
- « Chrome introuvable »: ajoutez `--chrome "C:\\Users\\<vous>\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"`.
- « safeStorage indisponible »: ajoutez `--vars username=... --vars password=...`.
- « Profil Chrome introuvable (mode dev) »: lancez l’app une fois pour créer/initialiser un profil, ou passez `--profile-dir <chemin>`.
- « Flow introuvable »: vérifiez `flows/<platform>/<slug>.json`.
- Powershell réécrit les options: utilisez le double `--` ou la forme `npx cross-env ELECTRON_RUN_AS_NODE=1 electron ...`.

## Limites actuelles
- Pas d’écriture des runs dans la DB (volontaire). Les runs n’apparaissent pas dans l’UI Historique.
- Collecte « mutations » et « perf » non documentées ici (réservées pour une itération ultérieure).

## Section IA — Exécution par un agent depuis WSL (fidèle à PowerShell)

Contexte: un agent (ex: pipeline CI, ou un modèle exécutant des commandes) peut se trouver dans WSL (Linux) alors que l’application et ses dépendances (Electron, better‑sqlite3, Chrome) sont installées côté Windows. Exécuter le runner CLI avec Node Linux provoque des erreurs (`invalid ELF header` sur `better-sqlite3`) et `safeStorage` peut être indisponible. La méthode fiable consiste à piloter PowerShell Windows depuis WSL.

### Script de confort

Un wrapper est fourni: `scripts/cli/run_from_wsl.sh`.

Usage minimal:

```
# Depuis WSL, à la racine du repo
scripts/cli/run_from_wsl.sh alptis_login --mode headless --report html
```

Avec identifiants sans les exposer en ligne de commande (recommandé):

```
export FLOW_USERNAME="VOTRE_LOGIN"
export FLOW_PASSWORD="VOTRE_MDP"
scripts/cli/run_from_wsl.sh alptis_login --mode headless --trace retain-on-failure --console --dom steps --js steps --report html
```

Le script:
- Convertit le dossier courant WSL en chemin Windows avec `wslpath -w`.
- Lance PowerShell: `powershell.exe -NoProfile -NonInteractive -Command '...'`.
- Transmet `FLOW_USERNAME`/`FLOW_PASSWORD` comme variables d’environnement PowerShell (non visibles dans la ligne de commande Electron).
- Appelle: `npx --yes cross-env ELECTRON_RUN_AS_NODE=1 electron scripts/cli/run_flow.mjs ...` côté Windows.

Avantages:
- Charge les binaires natifs Windows (`better-sqlite3`) correctement.
- Lance Chrome via `executablePath` valide ou `channel: 'chrome'` si le chemin DB est invalide.
- Permet l’exécution headless (ou visible en `--mode dev_private`/`--mode dev`).

Conseils:
- Pour un run visible (fenêtre Chrome), la commande s’effectue pareil; si WSL n’a pas d’affichage, utilisez `--mode headless`.
- Si Chrome n’est pas trouvé automatiquement, ajoutez `--chrome "C:\\Users\\<vous>\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"` dans la commande (après le `alptis_login`).
- Évitez `--network` si vous passez le mot de passe réel; sinon fournissez `--redact` plus stricte.

Exemple complet (IA → WSL → PowerShell):

```
export FLOW_USERNAME="Fragoso.n@france-epargne.fr"
export FLOW_PASSWORD="Nicolas.epargne2024"
scripts/cli/run_from_wsl.sh alptis_login \
  --mode headless --trace retain-on-failure --console \
  --dom steps --js steps --report html
```

Le script renvoie exactement les mêmes logs et artefacts que l’exécution manuelle sous PowerShell.

### Secrets & identifiants (ne pas committer)

Important: ne placez JAMAIS des identifiants (logins/mots de passe) en clair dans le dépôt (README, docs, scripts, commits). Utilisez l’une des méthodes ci‑dessous et gardez les secrets hors Git.

- Via l’app (recommandé si vous exécutez côté Windows): ouvrez l’app, enregistrez les identifiants dans « Identifiants ». Ils sont chiffrés via `safeStorage`. La CLI les lira si le déchiffrement est disponible.

- Via variables d’environnement (recommandé en CLI/WSL):

  PowerShell (session courante seulement):
  ```powershell
  $env:FLOW_USERNAME = "<votre_login>"
  $env:FLOW_PASSWORD = "<votre_mot_de_passe>"
  npm run flows:run -- -- alptis_login --mode dev_private --report html --open
  # Nettoyage
  Remove-Item env:FLOW_USERNAME, env:FLOW_PASSWORD
  ```

  WSL (utilise le wrapper IA):
  ```bash
  export FLOW_USERNAME="<votre_login>"
  export FLOW_PASSWORD="<votre_mot_de_passe>"
  scripts/cli/run_from_wsl.sh alptis_login --mode headless --report html
  # Nettoyage
  unset FLOW_USERNAME FLOW_PASSWORD
  ```

- Via arguments CLI (moins sûr — évitez en CI):
  ```bash
  npm run flows:run -- -- alptis_login --mode dev_private \
    --vars username="<votre_login>" --vars password="<votre_mot_de_passe>"
  ```
  Évitez `--network` dans ce cas (le POST de login peut contenir le mot de passe). A minima, ajoutez `--redact`.

Bonnes pratiques:
- N’ajoutez jamais des identifiants en clair dans `docs/` ni dans les commit messages.
- Si vous avez besoin de fichiers locaux, créez un dossier non versionné (ex: `.secrets/`, ignoré par Git) et chargez-les dans l’environnement au moment de l’exécution.
