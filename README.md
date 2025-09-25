# Mutuelles v3 — Desktop (Electron)

Application desktop Electron destinée à un courtier professionnel. L’objectif est d’orchestrer des plateformes (Swisslife, Alptis, …), gérer un profil Chrome persistant, stocker localement les identifiants (chiffrés) et — étapes suivantes — automatiser les flux de devis avec Playwright.

Ce document décrit l’architecture actuelle, la base de données, les APIs IPC, l’UI, les conventions de code et la feuille de route. Il sert aussi de “journal de bord” de l’Agent 1 (moi) et d’instructions pour l’Agent suivant.

## Prérequis & scripts
- Node.js LTS (>= 18), npm
- Windows (build NSIS configuré)
- Chrome installé (recommandé) — utilisé pour le profil persistant

Scripts:
- `npm install`
- `npm run dev` — lance l’app en dev (electron‑vite)
- `npm run build` — packaging Windows (NSIS)
- `npm run typecheck` — TypeScript strict
 - `npm run flows:export` — exporte les flows DB → fichiers JSON
 - `npm run flows:add -- <file.json>` — ajoute un flow depuis JSON
 - `npm run flows:update -- <file.json>` — met à jour un flow existant
 - `npm run flows:delete -- --slug <slug> [--hard]` — supprime (soft par défaut)
 - `npm run flows:lint` — valide tous les fichiers `flows/**/*.json`
 - `npm run flows:sync -- [--dir flows] [--apply] [--deactivate-missing]` — synchronise fichiers → DB

Note binaires natifs: `better-sqlite3` est natif. En cas d’erreur après `npm install`: `npx electron-builder install-app-deps`.

## Architecture & conventions
- Séparation stricte:
  - `src/main` — processus principal (DB, services, IPC, fenêtre)
  - `src/preload` — pont sécurisé (`contextBridge`), expose `window.api`
  - `src/renderer` — UI React (pages, composants, contextes)
  - `src/shared` — types partagés
- Conventions (impératives):
  - Fichiers courts (≤ 200 lignes). Scinder si besoin.
  - Noms explicites, dossiers logiques.
  - Valider TOUTES les entrées IPC côté main (Zod).
  - Pas de SQL dans l’IPC — passer par `services/*`.
  - UI en français (labels, messages, erreurs).
  - Code “sale”: proposer le refactor (après accord), puis l’appliquer.

## Base de données (SQLite)
Fichier: `userData/mutuelles.sqlite3`, WAL + `foreign_keys=ON`.

En dev, seule la base de données est stockée à la racine du projet dans `./dev-data/mutuelles.sqlite3`. Les profils Chrome restent dans le dossier `%APPDATA%/mutuelles_v3` (inchangé).

Premier démarrage après ce changement: si une DB existe déjà dans `%APPDATA%/mutuelles_v3/mutuelles.sqlite3`, elle est automatiquement copiée vers `./dev-data/mutuelles.sqlite3` (les fichiers `-wal`/`-shm` sont copiés si présents). Aucune suppression de l’ancienne DB.

Variable d’env (dev):
- `MUTUELLES_DB_DIR` pour choisir un autre dossier dev (par défaut `./dev-data`).

### Nettoyage du schéma (minimal fonctionnel)
- `platform_pages`: colonne `url_template` renommée en `url`; suppression de `meta_json`.
- `platform_fields`: suppression de la colonne `help`.
- `flow_steps`: suppressions de `wait_for` et `meta_json`.
- Migrations idempotentes et non destructives pour les données utiles (copie/transfert assuré).

Conséquence: les URLs des pages (ex: login) sont maintenant stockées en colonne `url` (seed: Alptis → `https://pro.alptis.org/`). Le runner utilise `flow_steps.url` si présent, sinon il retombe sur la `platform_pages.url` de la page `login` de la plateforme.

### Commandes Dev (administration)
Permettent d’ajouter/mettre à jour une plateforme et un flux sans toucher au code.

- Important (Windows/Node natif vs Electron): les modules natifs sont reconstruits pour Electron. Les commandes CLI utilisent Electron en mode Node via `ELECTRON_RUN_AS_NODE=1` pour éviter les erreurs `NODE_MODULE_VERSION`.

- Ajouter une plateforme (avec page login + champs):
  - `npm run cmd:add-platform -- --slug alptis --name "Alptis" --login https://pro.alptis.org/ --select --field username:text:required --field password:password:required:secure`
  - Options: `--base`, `--website`, `--field key:type[:required][:secure]` (répétable). Par défaut, username/password sont ajoutés si aucun `--field` n’est fourni.

// Ancienne commande d'ajout de flow retirée au profit des scripts flows:*.


Tables:
- `settings(key, value)` — clés: `theme`, `chrome_path`
- `platforms_catalog(id, slug UNIQUE, name, status, base_url?, website_url?, notes?, created_at, updated_at)` — seed: `swisslife`, `alptis` (ready)
- `user_platforms(id, platform_id UNIQUE → platforms_catalog, selected, created_at)`
- `platform_pages(id, platform_id → platforms_catalog, slug, name, type, url_template?, status, order_index, meta_json?, active)`
- `platform_fields(id, page_id → platform_pages, key, label, type, required, secure, help?, order_index)`
- `platform_credentials(platform_id PRIMARY KEY → platforms_catalog, username, password_encrypted BLOB, updated_at)`
- `profiles(id, name, user_data_dir, browser_channel, created_at, initialized_at)`

Migrations & robustesse:
- Ajout conditionnel de `profiles.initialized_at` si manquante.
- En cas d’échec de migration: suppression du fichier et recréation + seeding.
- Tables obsolètes supprimées: `platforms`, `credentials`, `credential_sets`, `credential_values`.

Index (TODO): `user_platforms(platform_id)`, `platform_credentials(platform_id)`.

## APIs IPC & Preload (window.api)
- `getVersion()`, `getStats()`
- `settings.getTheme()/setTheme()`
- `catalog.list()/setSelected()/listPages()/listFields()`
- `credentials.listSelected()/get()/set()/delete()/reveal()` (un identifiant unique par plateforme)
- `profiles.list()/create()/init()/test()/openDir()/delete()`
- `browsers.getChromePath()/setChromePath()/pickChrome()`
- `automation.listFlows()` — liste les flux actifs
- `automation.run({ flowSlug })` — lance un run; événements de progression sur `automation:progress:<runId>` (exposés via `automation.onProgress(runId, cb)`)
- `automation.openRunDir(dir)` — ouvre le dossier captures du run

Validation d’entrée: côté main via Zod (ex: `catalog.setSelected`, `credentials.set`).

## UI
- Tableau de bord: compteurs (plateformes sélectionnées, profils, identifiants)
- Plateformes: sélection du catalogue, badge statut FR, badge “Identifiants manquants”, aperçu des pages
- Identifiants: login/mot de passe par plateforme; révélation ponctuelle; effacement
- Profil Chrome (unique, côté UX): création + initialisation auto; menu “…” (ouvrir dossier, choisir Chrome, supprimer); état “Initialisé/Non initialisé”
- Flux (Dev): liste des flows (actifs), exécution en direct avec timeline (logs verbeux) et accès rapide aux captures
- Thème clair/sombre; toasts pro (loading → success/erreur), pile limitée (bas‑droite)

## Sécurité & build
- Electron: `contextIsolation: true`, `nodeIntegration: false`. Sandbox désactivé pour l’instant (preload ESM).
- CSP de base pour le dev; à durcir en prod (retirer `unsafe-eval`, restreindre `connect-src`).
- Secrets: `safeStorage` (DPAPI, etc.).
- Build: `electron-builder` (NSIS), `asarUnpack: "**/*.node"`.

## État actuel (précis)
Fonctionnel: catalogue + sélection, identifiants uniques chiffrés, profil Chrome (création + init auto), toasts pro, UI FR, migrations robustes, typecheck OK.

À venir: Playwright (runner + flux devis), DSL des flux, CSP prod stricte + sandbox, index DB.

## Historique Agent 1 & directives
Réalisé:
- Architecture Electron/React/TS/Tailwind + electron‑vite
- Nouveau modèle DB (catalogue/pages/champs + identifiants uniques/plateforme)
- Suppression ancien CRUD + migrations/seed + reset fallback
- Services/IPC: `catalog`, `credentials`, `profiles` (init Chrome), `browsers`, `settings`
- UI complète FR (plateformes, identifiants, profil unique, toasts pro)

Directives Agent 2 (à respecter):
- Fichiers courts (≤ 200 lignes), validation Zod, structure logique, UI FR
- Refactoriser proprement après accord si du code “sale” est rencontré
- Migrations idempotentes, non destructives sans accord
- Utiliser les toasts progressifs pour toute action longue

## Roadmap — Flux devis & Playwright
Objectif: ajouter des “commandes” (DSL) pour décrire/exécuter des flux devis (Swisslife, Alptis), avec captures d’écran à chaque étape.

1) Playwright (Chrome stable)
- Runner côté main (process utilitaire) avec `launchPersistentContext(userDataDir, { channel: 'chrome', headless: false })`
- Chargement des identifiants depuis `platform_credentials` + profil `profiles`
- IPC `automation:run({ flowSlug })` → journal d’étapes + chemins des screenshots

2) Schéma flux (DB)
- `flows_catalog(platform_id, slug UNIQUE, name, active)`
- `flow_steps(flow_id, order_index, type, selector?, value?, url?, screenshot_label?, timeout_ms?)`
- Étapes minimales: `goto`, `fill`, `click`, `waitFor`, `assert`, `screenshot`, `sleep`
- Seed: `swisslife_login`, `alptis_login`

3) Captures d’écran
- `userData/screenshots/<flow>/<timestamp>/step-XX-<label>.png`

4) UI “Flux devis”
- Liste/édition simple des étapes; exécution avec toasts progressifs; lien vers captures

5) Durcissements
- Index DB (voir plus haut), CSP prod stricte, sandbox réactivé (preload CJS)

---

## Annexe — Prompt “Agent 2” (handover)

Contexte
- Je suis l’Agent 1. J’ai démarré et livré l’architecture, la DB (catalogue/pages/champs + identifiants uniques), le profil Chrome (création + init auto) et l’UI en français avec toasts pro. L’ancien CRUD a été retiré proprement.

Etat actuel
- Catalogue: Swisslife/Alptis (ready), pages `login`/`quote_form` seedées; sélection OK
- Identifiants: un login/mot de passe par plateforme (chiffrés), révélation/effacement OK
- Profil Chrome: un profil côté UX; création + init auto via Chrome `--user-data-dir`; menu “…” avancé
- IPC exposées: `catalog:*`, `credentials:*`, `profiles:*` (init/test/open/delete), `browsers:*` (chemin Chrome), `getStats`
- Sécurité: `contextIsolation: true`, `nodeIntegration: false`; CSP basique; sandbox OFF (à réactiver plus tard)
- TypeScript OK; DB robuste (migrations conditionnelles + reset fallback)

Lignes directrices
- Fichiers ≤ 200 lignes, noms explicites, structure logique
- Zod pour toutes entrées IPC; pas de SQL dans l’IPC
- UI en français; toasts progressifs pour opérations longues
- Refactoriser le code “sale” après accord
- Migrations idempotentes; pas de destruction de données sans accord

Objectifs immédiats
1) Ajouter Playwright (Chrome stable) et un runner:
   - `launchPersistentContext(userDataDir, { channel: 'chrome', headless: false })`
   - Charger identifiants + profil depuis la DB
   - IPC `automation:run({ flowSlug })` → journal (étapes, screenshots)
2) Étendre la DB pour flux devis:
   - `flows_catalog` & `flow_steps` (voir schéma)
   - Seeder pour `swisslife_login` et `alptis_login`
3) Implémenter les flux “connexion” (Swisslife, Alptis) avec captures d’écran à chaque étape
4) UI “Flux devis” (liste, exécution, lien vers captures)
5) Durcissements: index DB, CSP stricte, sandbox ON (preload CJS)

Livrables
- Code propre, fichiers courts, validations Zod, toasts pilotés
- Nouvelle doc (IPC + schéma) succincte
- Zéro perte de données sans accord

Fin du handover — l’utilisateur validera chaque étape avant la suite.

Astuce PowerShell si besoin (positionnel):
// Ancienne commande d'ajout (dépréciée) supprimée.

## Flows as code (JSON)

Chaque flow est décrit dans `flows/<plateforme>/<slug>.json`:

```
{
  "version": 1,
  "platform": "alptis",
  "slug": "alptis_login",
  "name": "Connexion Alptis",
  "active": true,
  "steps": [
    { "type": "goto", "url": "https://pro.alptis.org/", "screenshot_label": "accueil", "timeout_ms": 15000 },
    { "type": "waitFor", "selector": "#username", "screenshot_label": "login-form", "timeout_ms": 10000 },
    { "type": "fill", "selector": "#username", "value": "{username}", "screenshot_label": "fill-user" },
    { "type": "fill", "selector": "#password", "value": "{password}", "screenshot_label": "fill-pass" },
    { "type": "click", "selector": "button[type=\"submit\"]", "screenshot_label": "submit" },
    { "type": "screenshot", "screenshot_label": "after-submit" }
  ]
}
```

Types supportés: `goto`, `waitFor`, `fill`, `click`, `tryClick`, `assertText`, `screenshot`, `sleep` (et `debugAxeptio` interne).

Règles: `goto.url` requis; `waitFor/click/tryClick/fill.selector` requis; `fill.value` (placeholders `{username}`, `{password}`) ; `assertText.selector/assert_text` requis; `sleep.timeout_ms` requis.

Sécurité & sync:
- Les commandes effectuent des transactions et valident le schéma JSON.
- Une sauvegarde DB est créée avant `flows:delete -- --hard` et `flows:sync -- --apply`.
- `flows:sync` est en dry‑run par défaut. Utiliser `--apply` pour exécuter.

Compat WSL: si `better-sqlite3` pose problème (ELF header), lance les commandes depuis Windows (PowerShell) où Electron et Node natifs Windows sont installés, ou réinstalle les deps sous WSL (`npm ci`).
