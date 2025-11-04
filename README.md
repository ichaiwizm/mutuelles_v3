# Mutuelles v3 - Leads & Flows Automation

Clean, dev-oriented architecture for health insurance leads automation.

## Quick Start

```bash
# Install dependencies
npm install

# Ingest a lead from JSON
npm run ingest -- --file path/to/lead.json

# Explain what a flow would do (dry-run)
npm run explain -- alptis/sante-select <lead-id>

# Run a flow with browser automation
npm run run -- alptis/sante-select <lead-id> --headless=false

# Test a specific selector
npm run test-selector -- alptis subscriber.birthDate --headless=false
```

## Architecture Principles

### Canonical Data (ISO Format)
- Dates: `YYYY-MM-DD` (ISO 8601)
- Phones: `+33612345678` (E.164)
- Booleans: `true` / `false` (not "oui"/"non")

### Single Source of Truth
```typescript
interface LeadData {
  subscriber: SubscriberInfo;
  spouse?: SpouseInfo;
  children?: ChildInfo[];
  project: ProjectInfo;
}
// NO platformData, NO carrier-specific fields
```

### Unified Condition Language
```typescript
// Single 'when' condition replaces skipIf/skipIfNot/showIf
step.fill('spouse.birthDate', {
  leadKey: 'spouse.birthDate',
  when: { field: 'spouse', isEmpty: false },
  optional: true,
})
```

### TypeScript Everywhere
- No JSON configs
- Full autocomplete
- Type-safe flows and selectors

## Project Structure

```
/core
  /domain       # Zod schemas, fingerprinting
  /dsl          # Flow DSL (goto, fill, select, toggle, click...)
  /adapters     # ISO conversions (dateIsoToFr, phoneToE164...)
  /log          # NDJSON structured logger
  /resolve      # Value resolution & condition evaluation
  /engine       # FlowRunner with Playwright
  /db           # SQLite queries

/platforms
  /alptis
    selectors.ts        # TypeScript selectors
    /flows
      sante-select.ts   # Flow definitions
  /swisslifeone
    selectors.ts
    /flows
      slsis.ts

/ingest
  pipeline.ts   # normalize → enrich → validate → fingerprint → upsert

/cli
  /commands     # explain, dry-run, run, test-selector
  /utils        # flow-loader, db-connection, credentials

/scripts
  migrate-legacy.ts   # One-time migration from v1
```

## Core Commands

### Ingest Lead
```bash
npm run ingest -- --file data/raw-leads/example.json
# Normalizes to ISO, validates, computes fingerprints, upserts
```

### Explain Flow (Dry-Run)
```bash
npm run explain -- alptis/sante-select abc-123-def
# Shows what would happen without browser automation
# Outputs: field → selector → raw value → mapped value → action
```

### Run Flow
```bash
npm run run -- alptis/sante-select abc-123-def --headless=false
# Executes with Playwright
# Options:
#   --headless=true/false
#   --trace=on|retain-on-failure|off
#   --output-path=./logs
```

### Test Selector
```bash
npm run test-selector -- alptis subscriber.birthDate --headless=false
# Opens browser, highlights element, takes screenshot
```

## Flow DSL (8 Core Steps)

```typescript
import { step, type Flow } from '../core/dsl';

export const myFlow: Flow = {
  slug: 'platform/flow-name',
  platform: 'platform',
  name: 'Human-readable name',
  trace: 'retain-on-failure',

  steps: [
    step.goto('https://example.com'),
    step.waitField('auth.username'),

    step.fill('subscriber.birthDate', {
      leadKey: 'subscriber.birthDate'
    }),

    step.select('subscriber.regime', {
      leadKey: 'subscriber.regime',
      when: { field: 'subscriber.status', isEmpty: false }
    }),

    step.toggle('spouse.present', {
      value: true,
      when: { field: 'spouse', isEmpty: false }
    }),

    step.click('auth.submit'),

    step.sleep(1000),
    step.pressKey('Enter'),

    step.enterFrame('#myIframe'),
    step.exitFrame(),

    step.comment('=== Section 2 ==='),
  ],
};
```

## Selectors (TypeScript)

```typescript
import { dateIsoToFr } from '../../core/adapters';
import type { SelectorMap } from '../types';

export const selectors: SelectorMap = {
  'subscriber.birthDate': {
    selector: '#date-naissance input',
    adapter: dateIsoToFr,  // YYYY-MM-DD → DD/MM/YYYY
  },

  'subscriber.regime': {
    selector: '#regime-social',
    valueMap: {
      SECURITE_SOCIALE: 'ss',
      TNS: 'tns',
      '*': 'ss',  // default
    },
  },

  'spouse.present': {
    selector: '#conjoint-oui',
  },

  'children[].birthDate': {
    selector: (index: number) => `#enfant-${index + 1}-naissance input`,
    adapter: dateIsoToFr,
  },
};
```

## When Conditions

```typescript
// isEmpty
{ field: 'spouse', isEmpty: false }

// equals
{ field: 'subscriber.civility', equals: 'M' }

// oneOf
{
  field: 'subscriber.category',
  oneOf: ['ARTISANS', 'COMMERCANTS_ET_ASSIMILES']
}

// and
{
  and: [
    { field: 'spouse', isEmpty: false },
    { field: 'spouse.birthDate', isEmpty: false }
  ]
}

// or
{
  or: [
    { field: 'subscriber.email', isEmpty: false },
    { field: 'subscriber.phone', isEmpty: false }
  ]
}
```

## Fingerprint Deduplication

Three fingerprints per lead:
- **Primary**: `SHA-256(lastName:firstName:birthDate)`
- **Email**: `SHA-256(email)` (if present)
- **Phone**: `SHA-256(phone)` (if present)

Database has `UNIQUE` constraint on `fingerprint_primary`.

## Logging (NDJSON)

All logs are structured, one JSON object per line:

```jsonl
{"ts":"2025-11-03T10:15:00.000Z","level":"info","msg":"Flow execution started","flowSlug":"alptis/sante-select"}
{"ts":"2025-11-03T10:15:01.234Z","run":"alptis-sante-select-1234","idx":0,"type":"goto","ok":true,"ms":234}
{"ts":"2025-11-03T10:15:02.456Z","run":"alptis-sante-select-1234","idx":5,"type":"fill","field":"subscriber.birthDate","raw":"1985-06-15","mapped":"15/06/1985","ok":true,"ms":122}
```

Use with tools like `jq`, `pino-pretty`, or any JSON log processor.

## Development Workflow

### 1. Add a New Platform

```bash
mkdir -p platforms/newplatform/flows
touch platforms/newplatform/index.ts
touch platforms/newplatform/selectors.ts
touch platforms/newplatform/flows/main-flow.ts
```

**selectors.ts:**
```typescript
import type { SelectorMap } from '../types';

export const selectors: SelectorMap = {
  'subscriber.lastName': {
    selector: '#nom',
  },
  // ...
};

export const platformConfig = {
  slug: 'newplatform',
  name: 'New Platform',
  selectors,
};
```

**flows/main-flow.ts:**
```typescript
import { step, type Flow } from '../../../core/dsl';

export const mainFlow: Flow = {
  slug: 'newplatform/main-flow',
  platform: 'newplatform',
  name: 'Main Flow',
  steps: [
    step.goto('https://platform.com'),
    step.fill('subscriber.lastName', { leadKey: 'subscriber.lastName' }),
  ],
};
```

**index.ts:**
```typescript
export { platformConfig, selectors } from './selectors';
export { mainFlow } from './flows/main-flow';
```

### 2. Test Selectors

```bash
npm run test-selector -- newplatform subscriber.lastName --headless=false
```

### 3. Dry-Run Flow

```bash
npm run explain -- newplatform/main-flow <lead-id>
```

### 4. Run with Browser

```bash
npm run run -- newplatform/main-flow <lead-id> --headless=false
```

## Migration from v1

See [MIGRATION_V2.md](./MIGRATION_V2.md) for complete migration guide.

**Key Changes:**
- JSON flows → TypeScript DSL
- JSON field definitions → TypeScript selectors
- `skipIf`/`skipIfNot`/`showIf` → unified `when`
- `platformData` → removed (canonical ISO in lead)
- Inline adapters → edge adapters at selector level

**Migration Script:**
```bash
npm run migrate-legacy
```

## Database Schema

```sql
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,  -- JSON (canonical ISO format)
  fingerprint_primary TEXT NOT NULL UNIQUE,
  fingerprint_email TEXT,
  fingerprint_phone TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  flow_slug TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  status TEXT NOT NULL,  -- pending, running, completed, failed
  started_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE TABLE run_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  step_type TEXT NOT NULL,
  field TEXT,
  ok INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  error TEXT,
  FOREIGN KEY (run_id) REFERENCES runs(id)
);
```

## Further Reading

- [ARCHITECTURE_V2.md](./ARCHITECTURE_V2.md) - Comprehensive developer guide
- [MIGRATION_V2.md](./MIGRATION_V2.md) - v1 to v2 migration guide

## License

Proprietary
