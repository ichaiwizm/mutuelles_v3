# Migration vers Architecture v2

**Date**: 2025-11-03
**Branche**: `claude/simplify-leads-flows-v2-011CUmXjTNnUgrHYK1Mdywci`

## Objectif

Simplification radicale de l'architecture leads/flows pour un système **orienté dev**, **typé**, **prévisible** et **débogable**.

---

## Principes Non-Négociables

### 1. Donnée Canonique Unique (ISO)

**Avant** :
- Dates en `DD/MM/YYYY` (format français)
- Téléphones non normalisés (`06 12 34 56 78`, `+33612345678`, etc.)
- Booléens sous forme de strings ou nombres

**Après** :
- **Dates** : `YYYY-MM-DD` (ISO 8601)
- **Téléphones** : `+33612345678` (E.164)
- **Booléens** : `true` / `false` (vrais booléens TypeScript)

Les adaptations plateforme (DD/MM/YYYY, labels, etc.) se font **au bord** (dans `selectors.ts`), jamais en base.

### 2. Un Seul Modèle Métier

**Avant** :
```typescript
interface LeadData {
  subscriber: SubscriberInfo;
  spouse?: SpouseInfo;
  children?: ChildInfo[];
  project: ProjectInfo;
  platformData?: PlatformData; // ❌ Pollution du domaine
}
```

**Après** :
```typescript
interface LeadData {
  subscriber: SubscriberInfo;
  spouse?: SpouseInfo;
  children?: ChildInfo[];
  project: ProjectInfo;
  // ✅ Pas de platformData
}
```

La plateforme s'adapte au domaine, pas l'inverse.

### 3. Un Seul Langage de Conditions : `when`

**Avant** :
- `skipIf` (skip si truthy)
- `skipIfNot` (skip si falsy)
- `showIf` (UI visibility)

**Après** :
```typescript
when: { field: 'spouse', isEmpty: false }
when: { field: 'subscriber.status', equals: 'TNS' }
when: { or: [...], and: [...] }
```

Une seule grammaire, lisible et explicite.

### 4. TypeScript > JSON

**Avant** :
- `/data/field-definitions/swisslifeone.json` (13KB, non typé, pas d'autocomplete)
- `/data/flows/swisslifeone/swisslifeone_slsis.hl.json` (JSON verbeux)

**Après** :
- `/platforms/swisslifeone/selectors.ts` (TypeScript, typé, autocomplete IDE)
- `/platforms/swisslifeone/flows/slsis.ts` (DSL TypeScript avec builders)

### 5. Logs Structurés (NDJSON)

**Avant** :
```
[INFO] Filling field subscriber.birthDate
[INFO] Success
```

**Après** (NDJSON, une ligne par step) :
```json
{"ts":"2025-11-03T19:21:10Z","run":"slsis-abc123","idx":7,"type":"select","field":"subscriber.regime","selector":"#regime-social-assure-principal","raw":"TNS","mapped":"TNS","ok":true,"ms":184}
```

Parsable, analysable, debuggable.

### 6. Déduplication par Fingerprint

**Avant** :
- Logique de dédup dispersée dans 12 services

**Après** :
```typescript
fingerprintPrimary = sha256(toLowerCase(lastName) + toLowerCase(firstName) + birthDate)
fingerprintEmail = sha256(toLowerCase(email))
fingerprintPhone = sha256(phoneE164)
```

Index `UNIQUE` sur `fingerprint_primary` en DB. Simple, efficace, déterministe.

---

## Nouvelle Architecture

```
/core
  /domain           -> Zod schemas (LeadData, ISO, strict)
  /dsl              -> Types des steps + builders (step.goto, step.fill, etc.)
  /resolve          -> Path, Template, Value, Condition resolvers
  /log              -> Logger NDJSON + parsing utils
  /adapters         -> date/phone mappers (ISO <-> FR/E.164)
  /db               -> schema.sql + queries.ts

/platforms
  /swisslifeone
    selectors.ts    -> SelectorMap typé { 'subscriber.regime': { selector, valueMap, adapter } }
    flows/
      slsis.ts      -> export const flow: Flow = [ step.goto(...), step.fill(...) ]
  /alptis
    selectors.ts
    flows/

/cli                -> (À créer : flow-run, explain, dry-run, selector:test)
```

---

## Changements Détaillés

### `/core/domain` - Schémas Canoniques

**Fichiers** :
- `lead.schema.ts` : Schémas Zod pour validation stricte
- `fingerprint.ts` : Calcul des empreintes
- `index.ts` : Exports

**Types principaux** :
```typescript
export interface SubscriberInfo {
  civility?: 'MONSIEUR' | 'MADAME';
  lastName: string;
  firstName: string;
  birthDate: string; // YYYY-MM-DD
  phoneE164?: string; // +33612345678
  email?: string;
  departmentCode?: string | number;
  regime?: string;
  status?: string;
  profession?: string;
  // ...
}

export interface LeadData {
  subscriber: SubscriberInfo;
  spouse?: SpouseInfo;
  children?: ChildInfo[];
  project: ProjectInfo;
}
```

**Validation** :
```typescript
import { validateLeadData } from './core/domain';

const lead = validateLeadData(rawData); // Throws ZodError si invalide
```

### `/core/dsl` - DSL Typée

**Types de steps** (8 + utilitaires) :
- **Navigation** : `goto`, `waitField`
- **Forms** : `fill`, `type`, `select`, `toggle`, `click`
- **Frames** : `enterFrame`, `exitFrame`
- **Utilities** : `sleep`, `pressKey`, `comment`

**Builders** :
```typescript
import { step } from './core/dsl';

step.goto('https://...', 'label');
step.fill('project.name', { value: 'Sim {lead.subscriber.lastName}' }, 'fill-project-name');
step.select('subscriber.regime', { leadKey: 'subscriber.regime', when: { field: 'subscriber.status', isEmpty: false } });
step.toggle('project.madelin', { value: true, when: { field: 'subscriber.status', equals: 'TNS' } });
```

### `/core/adapters` - Conversions ISO

**Date** :
```typescript
dateIsoToFr('2025-01-15') // -> '15/01/2025'
dateFrToIso('15/01/2025') // -> '2025-01-15'
```

**Phone** :
```typescript
phoneToE164('06 12 34 56 78') // -> '+33612345678'
phoneE164ToFrNational('+33612345678') // -> '06 12 34 56 78'
```

### `/core/resolve` - Résolution Unifiée

**Paths** :
```typescript
resolveLeadPath(lead, 'subscriber.birthDate') // -> '1985-03-20'
resolveLeadPath(lead, 'children[0].birthDate') // -> '2010-05-12'
```

**Templates** :
```typescript
resolveTemplate('Simulation {lead.subscriber.lastName} {lead.subscriber.firstName}', { lead })
// -> 'Simulation Dupont Jean'
```

**Conditions (`when`)** :
```typescript
evaluateWhen({ field: 'spouse', isEmpty: false }, lead) // -> true si spouse présent
evaluateWhen({ field: 'subscriber.status', oneOf: ['TNS', 'INDEPENDANT'] }, lead) // -> true si match
```

### `/core/log` - Logs NDJSON

**Usage** :
```typescript
import { createLogger } from './core/log';

const logger = createLogger('run-abc123');

logger.step({
  run: 'slsis-abc123',
  idx: 7,
  type: 'select',
  field: 'subscriber.regime',
  selector: '#regime-social-assure-principal',
  raw: 'TNS',
  mapped: 'TNS',
  ok: true,
  ms: 184,
});
```

**Parsing** :
```typescript
const logs = parseLogFile('logs/runs/abc123.ndjson');
const stepLogs = filterStepLogs(logs);
const totalDuration = calculateTotalDuration(stepLogs);
const errors = countErrors(stepLogs);
```

### `/core/db` - Schéma Simplifié

**Tables** :
```sql
leads (
  id, data,
  fingerprint_primary UNIQUE,
  fingerprint_email, fingerprint_phone,
  metadata, created_at, updated_at
)

runs (id, status, started_at, finished_at, meta)
run_items (id, run_id, lead_id, platform, flow_slug, status, summary, started_at, finished_at)
run_steps (item_id, idx, type, field, selector, raw, mapped, ok, ms, error, screenshot)
```

**Queries** (10 max) :
- `createLead`, `getLeadById`, `findLeadByFingerprint`
- `listLeads`, `countLeads`, `searchLeads`
- `updateLead`, `deleteLead`
- `createRun`, `getRunById`, `updateRunStatus`

### `/platforms/swisslifeone/selectors.ts`

**Avant (JSON)** :
```json
{
  "key": "slsis_regime_social",
  "domainKey": "subscriber.regime",
  "type": "select",
  "selector": "#regime-social-assure-principal",
  "valueMappings": {
    "swisslifeone": {
      "SECURITE_SOCIALE": "SECURITE_SOCIALE",
      "TNS": "TNS",
      "*": "SECURITE_SOCIALE"
    }
  }
}
```

**Après (TypeScript)** :
```typescript
export const selectors: SelectorMap = {
  'subscriber.regime': {
    selector: '#regime-social-assure-principal',
    valueMap: {
      SECURITE_SOCIALE: 'SECURITE_SOCIALE',
      TNS: 'TNS',
      '*': 'SECURITE_SOCIALE',
    },
  },

  'project.dateEffet': {
    selector: '#contratSante-dateEffet',
    adapter: dateIsoToFr, // Conversion ISO -> DD/MM/YYYY
  },

  'children[].birthDate': {
    selector: (i) => `#enfants-${i}-dateNaissance`,
    adapter: dateIsoToFr,
    dynamicIndex: true,
  },
};
```

Avantages :
- ✅ Autocomplete IDE
- ✅ Type checking
- ✅ Imports d'adapters (DRY)
- ✅ Fonctions pour indexes dynamiques

### `/platforms/swisslifeone/flows/slsis.ts`

**Avant (JSON)** :
```json
{
  "type": "fillField",
  "domainField": "subscriber.birthDate",
  "value": "{lead.subscriber.birthDate}",
  "label": "fill-date-naissance"
}
```

**Après (TypeScript)** :
```typescript
step.fill('subscriber.birthDate', { leadKey: 'subscriber.birthDate' }, 'fill-date-naissance'),
```

**Conditions unifiées** :

**Avant** :
```json
{ "type": "clickField", "field": "slsis_simulation_couple", "skipIfNot": "spouse" }
```

**Après** :
```typescript
step.click('project.simulationType_couple', {
  when: { field: 'spouse', isEmpty: false }
}, 'click-simulation-couple'),
```

**Conditions complexes** :

**Avant** :
```json
{
  "skipIf": {
    "or": [
      { "field": "subscriber.profession", "isEmpty": true },
      { "field": "subscriber.status", "oneOf": ["SALARIE_AGRICOLE", "EXPLOITANT_AGRICOLE"] }
    ]
  }
}
```

**Après** :
```typescript
step.select('subscriber.profession', {
  leadKey: 'subscriber.profession',
  when: {
    or: [
      { field: 'subscriber.profession', isEmpty: true },
      { field: 'subscriber.status', oneOf: ['SALARIE_AGRICOLE', 'EXPLOITANT_AGRICOLE'] },
    ],
  },
  optional: true,
}, 'select-profession'),
```

---

## Ce Qui Est Supprimé

| Ancien | Remplacé par |
|--------|--------------|
| `/data/field-definitions/*.json` | `/platforms/*/selectors.ts` |
| `/data/flows/**/*.hl.json` | `/platforms/*/flows/*.ts` |
| `skipIf` / `skipIfNot` | `when: { ... }` |
| Dates DD/MM/YYYY en base | ISO YYYY-MM-DD + adapter |
| `platformData` dans LeadData | Selectors adaptent au domaine |
| Dédup multi-services | Fingerprints + UNIQUE DB |

---

## Commandes CLI (À Implémenter)

```bash
# Expliquer un flow (dry-run sans navigateur)
npm run flow:explain swisslifeone/slsis --lead <id>

# Dry-run avec validation sélecteurs (optionnel --probe)
npm run flow:dry swisslifeone/slsis --lead <id> --probe

# Exécuter un flow
npm run flow:run swisslifeone/slsis --lead <id> --headless

# Tester un sélecteur
npm run selector:test swisslifeone 'input#nom-projet' --url https://...

# Importer des leads depuis email
npm run leads:import:email --since '2025-11-01'

# Migrer DB
npm run db:migrate && npm run db:seed
```

---

## Plan de Migration

### ✅ Phase 1 : Core Architecture (Fait)

- [x] `/core/domain` - Schémas Zod + fingerprints
- [x] `/core/dsl` - Types + builders
- [x] `/core/adapters` - Date/phone converters
- [x] `/core/log` - Logger NDJSON
- [x] `/core/resolve` - Resolvers unifiés
- [x] `/core/db` - Schéma + queries
- [x] `/platforms/swisslifeone/selectors.ts` - Migré depuis JSON
- [x] `/platforms/swisslifeone/flows/slsis.ts` - Migré depuis JSON

### Phase 2 : Intégration Moteur (À Faire)

- [ ] Adapter `/automation/engine` pour utiliser nouveau `/core`
- [ ] Créer CLI commands (explain, dry-run, run, selector:test)
- [ ] Mettre à jour ingestion email pour normaliser en ISO
- [ ] Tests end-to-end avec leads réels

### Phase 3 : Migration Alptis (À Faire)

- [ ] `/platforms/alptis/selectors.ts`
- [ ] `/platforms/alptis/flows/*.ts`

### Phase 4 : Nettoyage (À Faire)

- [ ] Supprimer `/data/field-definitions/*.json`
- [ ] Supprimer `/data/flows/**/*.hl.json`
- [ ] Supprimer ancien code de dédup dispersé
- [ ] Mettre à jour UI pour utiliser nouveau schéma

---

## Bénéfices Immédiats

1. **DX amélioré** : Autocomplete IDE, type checking, erreurs à la compilation
2. **Débogage facile** : Logs NDJSON lisibles, explain/dry-run avant exécution
3. **Moins de fichiers** : JSON → TypeScript (1 fichier au lieu de 3-4)
4. **Dédup robuste** : Fingerprints déterministes, UNIQUE en DB
5. **Maintenance simple** : Une seule grammaire `when`, pas de magic
6. **Tests faciles** : Pure functions, pas de side-effects cachés

---

## Compatibilité

### Migration des données existantes

Les leads existants en base (dates DD/MM/YYYY) devront être migrés :

```typescript
// Script de migration (à créer)
function migrateLegacyLead(old: LegacyLead): Lead {
  return {
    ...old,
    data: {
      subscriber: {
        ...old.data.subscriber,
        birthDate: dateFrToIso(old.data.subscriber.birthDate), // DD/MM/YYYY -> YYYY-MM-DD
        phoneE164: phoneToE164(old.data.subscriber.telephone), // 06... -> +336...
      },
      // ... same for spouse, children
    },
    fingerprintPrimary: computePrimaryFingerprint(old.data),
    fingerprintEmail: computeEmailFingerprint(old.data.subscriber.email),
    fingerprintPhone: computePhoneFingerprint(phoneToE164(old.data.subscriber.telephone)),
  };
}
```

### Ancien moteur

L'ancien moteur `/automation/engine` (fichiers `.mjs`) restera fonctionnel pendant la transition. Le nouveau `/core` sera intégré progressivement.

---

## Questions & Réponses

**Q: Pourquoi TypeScript au lieu de JSON ?**
A: Autocomplete, type checking, refactoring IDE, moins de runtime errors.

**Q: Pourquoi ISO pour les dates ?**
A: Standard universel, tri simple, pas d'ambiguïté 01/02/2025 (1er fév ou 2 jan ?).

**Q: Pourquoi NDJSON ?**
A: Parsable ligne par ligne, stream-friendly, grep/jq compatible.

**Q: Compatibilité avec l'ancien système ?**
A: Migration progressive. Les deux systèmes coexistent pendant la transition.

---

## Auteur

**Claude Code** (avec humain superviseur)
**Date** : 2025-11-03
**Branche** : `claude/simplify-leads-flows-v2-011CUmXjTNnUgrHYK1Mdywci`
