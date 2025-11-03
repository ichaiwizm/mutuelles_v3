# Architecture v2 - Developer Guide

**Version**: 2.0
**Date**: 2025-11-03

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [Directory Structure](#directory-structure)
4. [Core Modules](#core-modules)
5. [Platform Configuration](#platform-configuration)
6. [Flow Definition](#flow-definition)
7. [Ingestion Pipeline](#ingestion-pipeline)
8. [CLI Commands](#cli-commands)
9. [Development Workflow](#development-workflow)

---

## Overview

Architecture v2 is a complete rewrite of the leads/flows automation system with a focus on:
- **Type safety** (TypeScript everywhere)
- **Canonical data** (ISO dates, E.164 phones, true booleans)
- **Simplicity** (fewer files, clearer patterns)
- **Debuggability** (structured logs, explain/dry-run modes)
- **Maintainability** (pure functions, no magic)

---

## Core Principles

### 1. Canonical Data Format (ISO)

All lead data is stored in canonical ISO format:

```typescript
interface LeadData {
  subscriber: {
    birthDate: string;        // ISO: "1985-03-20" (YYYY-MM-DD)
    phoneE164: string;         // E.164: "+33612345678"
    civility: 'MONSIEUR' | 'MADAME';  // Enum, not string
    // ...
  };
  project: {
    dateEffet: string;         // ISO: "2025-12-01"
    madelin: boolean;          // True boolean, not "true" string
    // ...
  };
}
```

Platform-specific conversions happen at the edge (in selectors):

```typescript
'subscriber.birthDate': {
  selector: '#date-naissance',
  adapter: dateIsoToFr,  // "1985-03-20" -> "20/03/1985"
}
```

### 2. Single Condition Language: `when`

**Before** (3 different syntaxes):
- `skipIf: "spouse"`
- `skipIfNot: "spouse"`
- `showIf: { field: "spouse", equals: true }`

**After** (unified):
```typescript
when: { field: 'spouse', isEmpty: false }
when: { field: 'subscriber.status', equals: 'TNS' }
when: { and: [...], or: [...] }
```

### 3. TypeScript > JSON

**Before**: Verbose, untyped JSON configurations
**After**: Typed TypeScript with IDE support

```typescript
// platforms/swisslifeone/selectors.ts
export const selectors: SelectorMap = {
  'subscriber.birthDate': {
    selector: '#date-naissance',
    adapter: dateIsoToFr,
  },
};

// platforms/swisslifeone/flows/slsis.ts
export const flow: Flow = {
  steps: [
    step.fill('subscriber.birthDate', { leadKey: 'subscriber.birthDate' }),
  ],
};
```

### 4. Fingerprint-Based Deduplication

```typescript
fingerprintPrimary = sha256(
  toLowerCase(lastName) +
  toLowerCase(firstName) +
  birthDate
)
```

UNIQUE constraint on `fingerprint_primary` in database prevents duplicates deterministically.

---

## Directory Structure

```
/core                   # Core library (framework-agnostic)
  /domain              # Zod schemas + fingerprinting
  /dsl                 # Flow DSL types + step builders
  /adapters            # ISO converters (date, phone)
  /log                 # NDJSON structured logger
  /resolve             # Path/template/value/condition resolvers
  /db                  # DB schema + queries

/platforms             # Platform configurations
  /swisslifeone
    selectors.ts       # Field selectors (typed)
    flows/
      slsis.ts         # Flow definitions (TypeScript DSL)
  /alptis
    selectors.ts
    flows/

/ingest                # Ingestion pipeline
  pipeline.ts          # normalize -> enrich -> validate -> upsert
  email/
    parser.ts          # Email parsing integration

/cli                   # CLI commands
  commands/
    explain.ts         # Show resolution table
    dry-run.ts         # Validate without executing
    run.ts             # Execute flow
    test-selector.ts   # Test individual selector

/scripts               # Utility scripts
  migrate-legacy-data.ts
```

---

## Core Modules

### `/core/domain` - Canonical Schemas

**Purpose**: Single source of truth for lead data structure.

```typescript
import { validateLeadData, type LeadData } from './core/domain';

// Validate lead data
const lead: LeadData = validateLeadData(rawData); // Throws ZodError if invalid

// Compute fingerprints
import { computeFingerprints } from './core/domain';
const fp = computeFingerprints(lead);
// { primary: "abc...", email: "def...", phone: "ghi..." }
```

**Key files**:
- `lead.schema.ts` - Zod schemas (SubscriberInfo, SpouseInfo, ChildInfo, ProjectInfo, LeadData)
- `fingerprint.ts` - Fingerprint computation (SHA-256)

### `/core/dsl` - Flow Definition Language

**Purpose**: Type-safe DSL for defining flows.

**8 core step types**:
1. `goto` - Navigate to URL
2. `waitField` - Wait for field to appear
3. `fill` - Fill text input
4. `type` - Type text with delays
5. `select` - Select from dropdown
6. `toggle` - Toggle checkbox/switch
7. `click` - Click element
8. `enterFrame` / `exitFrame` - Frame navigation

**Step builders**:
```typescript
import { step } from './core/dsl';

step.goto('https://example.com', 'label');
step.fill('field', { value: 'static' });
step.fill('field', { leadKey: 'subscriber.birthDate' });
step.fill('field', { value: 'Template {lead.subscriber.lastName}' });
step.select('field', {
  leadKey: 'subscriber.regime',
  when: { field: 'subscriber.status', isEmpty: false },
});
```

### `/core/adapters` - ISO Converters

**Purpose**: Convert between ISO and platform-specific formats.

```typescript
import { dateIsoToFr, dateFrToIso, phoneToE164 } from './core/adapters';

dateIsoToFr('2025-01-15');  // "15/01/2025"
dateFrToIso('15/01/2025');  // "2025-01-15"
phoneToE164('06 12 34 56 78');  // "+33612345678"
```

### `/core/log` - Structured Logging

**Purpose**: NDJSON logs for easy parsing and analysis.

```typescript
import { createLogger } from './core/log';

const logger = createLogger('run-abc123');

logger.step({
  run: 'slsis-abc123',
  idx: 7,
  type: 'select',
  field: 'subscriber.regime',
  selector: '#regime-social',
  raw: 'TNS',
  mapped: 'TNS',
  ok: true,
  ms: 184,
});
```

Output:
```json
{"ts":"2025-11-03T19:21:10Z","run":"slsis-abc123","idx":7,"type":"select","field":"subscriber.regime","selector":"#regime-social","raw":"TNS","mapped":"TNS","ok":true,"ms":184}
```

### `/core/resolve` - Unified Resolution

**Purpose**: Resolve paths, templates, values, and conditions.

```typescript
import { resolveLeadPath, resolveTemplate, evaluateWhen } from './core/resolve';

// Path resolution
resolveLeadPath(lead, 'subscriber.birthDate');       // "1985-03-20"
resolveLeadPath(lead, 'children[0].birthDate');      // "2010-05-12"

// Template resolution
resolveTemplate('Sim {lead.subscriber.lastName}', { lead });  // "Sim Dupont"

// Condition evaluation
evaluateWhen({ field: 'spouse', isEmpty: false }, lead);  // true if spouse exists
```

### `/core/db` - Database Interface

**Purpose**: Simple SQLite queries (10 max).

```typescript
import { createLead, getLeadById, findLeadByFingerprint } from './core/db';
import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

// Create lead
createLead(db, lead);

// Get lead
const lead = getLeadById(db, 'uuid-123');

// Check duplicate
const existing = findLeadByFingerprint(db, fingerprint);
```

---

## Platform Configuration

### Selectors (`platforms/{platform}/selectors.ts`)

Map domain keys to CSS selectors:

```typescript
import { dateIsoToFr } from '../../core/adapters';
import type { SelectorMap } from '../types';

export const selectors: SelectorMap = {
  // Simple selector
  'subscriber.lastName': {
    selector: '#nom',
    meta: { label: 'Nom adhérent' },
  },

  // With adapter (ISO -> platform format)
  'subscriber.birthDate': {
    selector: '#date-naissance',
    adapter: dateIsoToFr,  // "1985-03-20" -> "20/03/1985"
  },

  // With value mapping
  'subscriber.regime': {
    selector: '#regime',
    valueMap: {
      SECURITE_SOCIALE: 'SECURITE_SOCIALE',
      TNS: 'SECURITE_SOCIALE_INDEPENDANTS',
      '*': 'SECURITE_SOCIALE',  // Fallback
    },
  },

  // Dynamic selector (for arrays)
  'children[].birthDate': {
    selector: (i: number) => `#enfants-${i}-dateNaissance`,
    adapter: dateIsoToFr,
    dynamicIndex: true,
  },
};
```

### Flows (`platforms/{platform}/flows/*.ts`)

Define automation sequences:

```typescript
import { step, type Flow } from '../../../core/dsl';

export const slsis: Flow = {
  slug: 'swisslifeone/slsis',
  platform: 'swisslifeone',
  name: 'SLSIS Simulation',
  trace: 'retain-on-failure',

  steps: [
    // Navigation
    step.goto('https://www.swisslifeone.fr/'),
    step.waitField('auth.username'),

    // Login
    step.fill('auth.username', { value: '{credentials.username}' }),
    step.fill('auth.password', { value: '{credentials.password}' }),
    step.click('auth.submit'),

    // Fill subscriber data
    step.fill('subscriber.birthDate', { leadKey: 'subscriber.birthDate' }),
    step.select('subscriber.regime', { leadKey: 'subscriber.regime' }),

    // Conditional step (only if spouse exists)
    step.fill('spouse.birthDate', {
      leadKey: 'spouse.birthDate',
      when: { field: 'spouse', isEmpty: false },
      optional: true,
    }),
  ],
};
```

---

## Ingestion Pipeline

Transform raw data → canonical ISO format → validated lead → database.

```typescript
import { ingestLead, normalizeToISO } from './ingest';
import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

const rawLead = {
  subscriber: {
    birthDate: '20/03/1985',  // French format
    telephone: '06 12 34 56 78',
  },
  project: {
    madelin: 'true',  // String
  },
};

const result = ingestLead(db, rawLead, { skipDuplicates: true });

if (result.success) {
  console.log('Lead created:', result.lead.id);
} else if (result.duplicate) {
  console.log('Duplicate found:', result.duplicateId);
} else {
  console.error('Errors:', result.errors);
}
```

**Pipeline steps**:
1. **Normalize**: Convert dates to ISO, phones to E.164, booleans to true/false
2. **Enrich**: Add defaults (project name, dateEffet, childrenCount)
3. **Validate**: Zod schema validation
4. **Fingerprint**: Compute SHA-256 fingerprints
5. **Upsert**: Insert or update (check duplicates)

---

## CLI Commands

### `flow:explain` - Show Resolution Table

```bash
npm run flow:explain swisslifeone/slsis --lead <uuid>
```

Output:
```
┌──────┬──────────┬─────────────────────┬────────────────────────┬────────────┬──────────────┬──────┐
│ Idx  │ Type     │ Field               │ Selector               │ Raw        │ Mapped       │ Skip │
├──────┼──────────┼─────────────────────┼────────────────────────┼────────────┼──────────────┼──────┤
│ 7    │ select   │ subscriber.regime   │ #regime-social         │ TNS        │ TNS          │      │
│ 15   │ fill     │ spouse.birthDate    │ #date-conjoint         │ 1990-05-10 │ 10/05/1990   │ ✓    │
└──────┴──────────┴─────────────────────┴────────────────────────┴────────────┴──────────────┴──────┘
```

### `flow:dry` - Validate Without Executing

```bash
npm run flow:dry swisslifeone/slsis --lead <uuid> [--probe]
```

Validates:
- Flow structure
- Lead data (Zod schema)
- (Optional) Selector existence with `--probe`

### `flow:run` - Execute Flow

```bash
npm run flow:run swisslifeone/slsis --lead <uuid> --headless
```

Options:
- `--headless` - Run browser in headless mode
- `--trace <mode>` - Trace mode (on|retain-on-failure|off)
- `--output <path>` - Custom log output path

### `selector:test` - Test Individual Selector

```bash
npm run selector:test swisslifeone '#nom-projet' --url https://...
```

Opens browser, locates element, highlights it, shows info.

---

## Development Workflow

### Adding a New Platform

1. **Create selectors**:
   ```bash
   touch platforms/newplatform/selectors.ts
   ```

2. **Define selectors**:
   ```typescript
   import type { SelectorMap } from '../types';

   export const selectors: SelectorMap = {
     'subscriber.lastName': {
       selector: '#nom',
     },
   };
   ```

3. **Create flow**:
   ```bash
   mkdir platforms/newplatform/flows
   touch platforms/newplatform/flows/main.ts
   ```

4. **Define flow**:
   ```typescript
   import { step, type Flow } from '../../../core/dsl';

   export const main: Flow = {
     slug: 'newplatform/main',
     platform: 'newplatform',
     name: 'Main Flow',
     steps: [
       step.goto('https://...'),
       step.fill('subscriber.lastName', { leadKey: 'subscriber.lastName' }),
     ],
   };
   ```

5. **Export platform**:
   ```typescript
   // platforms/newplatform/index.ts
   export { selectors } from './selectors';
   export { main } from './flows/main';

   // platforms/index.ts
   export * as newplatform from './newplatform';
   ```

### Testing a Flow

```bash
# 1. Explain (show resolution)
npm run flow:explain newplatform/main --lead <uuid>

# 2. Dry-run (validate)
npm run flow:dry newplatform/main --lead <uuid> --probe

# 3. Execute
npm run flow:run newplatform/main --lead <uuid>
```

### Debugging

**Structured logs** (NDJSON):
```bash
# Parse logs
cat logs/runs/abc123.ndjson | jq .

# Filter errors
cat logs/runs/abc123.ndjson | jq 'select(.ok == false)'

# Calculate duration
cat logs/runs/abc123.ndjson | jq -s 'map(.ms) | add'
```

---

## Best Practices

1. **Always store ISO format in database** - Convert at the edge (selectors)
2. **Use `when` for all conditions** - Never `skipIf` / `skipIfNot`
3. **Type everything** - No `any`, use Zod for runtime validation
4. **Pure functions** - Avoid side effects in core modules
5. **Structured logs** - Use logger.step() for all important actions
6. **Test selectors** - Use `selector:test` before adding to flows
7. **Fingerprints for deduplication** - Never manual checks
8. **Explain before run** - Always use `flow:explain` to verify resolution

---

## Migration from v1

See [MIGRATION_V2.md](./MIGRATION_V2.md) for detailed migration guide.

---

## FAQ

**Q: Why ISO dates?**
A: Universal standard, no ambiguity (01/02 = Jan 2 or Feb 1?), easy sorting.

**Q: Why TypeScript over JSON?**
A: Autocomplete, type checking, refactoring, compile-time errors.

**Q: Why NDJSON logs?**
A: Parsable line-by-line, grep/jq compatible, streaming-friendly.

**Q: Can I still use old flows?**
A: Yes, both systems coexist during migration. Old `/automation/engine` still works.

---

**Author**: Architecture v2 Team
**License**: Proprietary
**Support**: See README.md
