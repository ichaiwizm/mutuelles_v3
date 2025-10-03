# IA Automation — Flow Alptis Santé Select

## Objectif confié
- Construire un flow Playwright complet pour la page `https://pro.alptis.org/sante-select/informations-projet/` après connexion Alptis.
- Remplir automatiquement toutes les sections (projet, adhérent principal, conjoint, trois enfants) sans déclencher la confirmation « Garanties ».
- Garantir le fonctionnement en mode headless **et** en mode visible (`dev_private`), avec des captures complètes pour validation.
- Fournir un JSON exploitable par le runner CLI ainsi que les commandes pour l’intégrer en base.

## Environnement & outils utilisés
- **Runner CLI** : `admin/cli/run_file_flow.mjs` piloté via `admin/cli/run_from_wsl.sh` (WSL → PowerShell → Electron).
- **Playwright core** (chromium / channel Chrome).
- **BDD SQLite** (lecture seule pour les tests).
- **Commandes principales** :
  - `admin/cli/run_from_wsl.sh <flow> [options]`
  - `npm run flows:add -- --file <path>` (insertion en base)
  - `npm run flows:update -- --file <path>` (mise à jour)
  - `npm run flows:export -- --slug <slug>` (contrôle)
- **Instrumentation** : options `--dom steps`, `--report html`, `--console`, `--trace retain-on-failure` pour collecter DOM, captures, console.

## Démarche et itérations
1. **Cartographie initiale**
   - Lecture des docs (`admin/docs/CLI.md`, README) + inspection du DOM via exécutions headless.
   - Extraction des sélecteurs (IDs `#dateEffet`, placeholders, `.totem-select-option`, etc.).

2. **Premier flow brut**
   - JSON initial : login → `goto` → `tryClick` Axeptio → `waitFor` du layout.
   - Ajout progressif des `fill`/`click` pour l’adhérent principal.
   - Runs headless OK mais blocage en visible : le toggle Conjoint ne réagissait pas.

3. **Debug axeptio / toggle**
   - Observation des captures `error-*.png` + DOM : overlay Axeptio intercepte les clics (masque le bouton login/toggle).
   - Solution : `tryClick` + `sleep` sur `#axeptio_btn_acceptAll` **sur la page de login et sur la page du flow**.
   - Toggle TOTEM : clic sur le `label[data-test="label"]` (plutôt que sur le cercle) + `waitFor` sur `.totem-toggle--on` pour assurer l’activation.
   - Vérification via flow test (`test_toggle`) pour confirmer que le label ferme bien le toggle.

4. **Remplissage complet**
   - Adhérent principal : civilité, nom, prénom, date de naissance, catégorie « Cadres », régime « Sécurité sociale », code postal.
   - Conjoint : activation du bloc, date, catégorie, régime.
   - Enfants : activation du bloc, ajout séquentiel de 3 enfants avec dates/régimes.
   - Ajout de `screenshot` intermédiaires (`section-adherent`, `section-conjoint`, `section-enfants`, `form-complet`) pour preuve visuelle.

5. **Validation**
   - Runs de référence :
     - Headless : `admin/runs-cli/alptis_sante_select_pro_full/alptis_sante_select_pro_full-20250926-095627-3x0h0v/`
     - Visible (`dev_private`) : `admin/runs-cli/alptis_sante_select_pro_full/alptis_sante_select_pro_full-20250926-131715-qvp70a/`
   - Contrôles DOM (`dom/step-40.html`, `dom/step-64.html`) : classes `totem-toggle--on`, absence de `aria-invalid`.
   - Captures finales : `form-complet.png` + sections.

## Commandes récapitulatives
### Exécution CLI (WSL)
```
admin/cli/run_from_wsl.sh alptis_sante_select_pro_full \
  --mode dev_private --dom steps --report html --trace retain-on-failure --console
```
Options usuelles : `--mode headless` pour les runs batch, `--mode dev_private` pour suivre la fenêtre Chrome Windows.

### Intégration du flow en base
```
# première insertion
npm run flows:add -- --file admin/flows/alptis/alptis_sante_select_pro_full.json

# mise à jour ultérieure
npm run flows:update -- --file admin/flows/alptis/alptis_sante_select_pro_full.json

# contrôle / export
npm run flows:export -- --slug alptis_sante_select_pro_full
```

## Fichier livré
- **Flow JSON final** : `admin/flows/alptis/alptis_sante_select_pro_full.json`
  - Inclut les séquences Axeptio, les `waitFor` d’état, le renseignement complet des sections et les captures documentaires.

## Points d’attention
- Ne pas soumettre la page (aucun clic sur « Garanties »).
- Les commandes doivent s’exécuter via WSL pour bénéficier d’Electron et des dépendances Windows.
- Les identifiants sont chargés via `.env` (`ALPTIS_USERNAME` / `ALPTIS_PASSWORD`).
- Les options `--dom steps` génèrent des `dom/step-xx*.html` utiles pour analyser les erreurs.

## Artefacts utiles
- Rapport visible : `admin/runs-cli/alptis_sante_select_pro_full/alptis_sante_select_pro_full-20250926-131715-qvp70a/report.html`
- Captures sections/forms : même dossier `/screenshots/` (`section-adherent.png`, `section-conjoint.png`, `section-enfants.png`, `form-complet.png`).
