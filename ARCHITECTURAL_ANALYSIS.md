# Broker Automation Codebase - Comprehensive Architectural Overview

**Generated:** 2025-10-31 | **Project:** mutuelles_v3 (Electron + React + Playwright)

---

## 1. CURRENT FOLDER STRUCTURE

### Root Level
```
/home/user/mutuelles_v3/
├── src/                        # TypeScript/React application code
├── automation/                 # Playwright-based automation engine (CLI + headless)
├── data/                       # Configuration data (flows, schemas, domain models)
├── scripts/                    # Database and platform management scripts
├── package.json               # npm dependencies and build scripts
├── tsconfig.json              # TypeScript configuration
├── electron-builder.yml       # Electron packaging configuration
└── electron.vite.config.ts    # Electron + Vite bundler configuration
```

### `src/` Directory (183 TypeScript files)
```
src/
├── main/                       # Electron main process
│   ├── db/
│   │   └── connection.ts       # Database singleton wrapper
│   ├── ipc/                    # IPC handlers (9 modules)
│   │   ├── scenarios.ts        # Flow execution & history
│   │   ├── leads.ts            # Lead CRUD operations
│   │   ├── email.ts            # Email import & parsing
│   │   ├── catalog.ts          # Platform catalog management
│   │   ├── platform_credentials.ts
│   │   ├── profiles.ts
│   │   ├── settings.ts
│   │   ├── browsers.ts
│   │   └── admin_cli.ts
│   ├── services/               # Core business logic
│   │   ├── leads.ts            # Lead service with CRUD
│   │   ├── emailToLead.ts      # Email → Lead conversion
│   │   ├── email.ts            # Email configuration & fetching
│   │   ├── emailClassifier.ts  # Email categorization
│   │   ├── platform_credentials.ts
│   │   ├── profiles.ts         # Chrome profile management
│   │   ├── catalog.ts          # Platform catalog queries
│   │   ├── chrome.ts           # Chrome detection
│   │   ├── settings.ts
│   │   ├── notificationService.ts
│   │   ├── leadParsing/        # Email/text → lead data extraction
│   │   │   ├── BaseLeadParser.ts        # Abstract base class
│   │   │   ├── LeadTransformer.ts      # Confidence scoring & transformation
│   │   │   ├── DataEnricher.ts         # Lead enrichment utilities
│   │   │   ├── ParsedDataValidator.ts  # Schema validation
│   │   │   ├── index.ts                # Main export
│   │   │   ├── types.ts                # Parser type definitions
│   │   │   ├── core/
│   │   │   │   ├── ParserOrchestrator.ts   # Orchestrates multi-parser pipeline
│   │   │   │   ├── ProviderDetector.ts     # Detects email/lead format
│   │   │   │   ├── ContentCleaner.ts       # HTML/text cleaning
│   │   │   │   └── ParsingDebugger.ts      # Debug reporting
│   │   │   ├── parsers/                    # 3 provider-specific parsers
│   │   │   │   ├── AssurProspectParser.ts  # AssurProspect format
│   │   │   │   ├── AssurleadParser.ts      # AssurLead format
│   │   │   │   └── GenericStructuredParser.ts  # Fallback generic parser
│   │   │   └── utils/
│   │   │       ├── FieldExtractor.ts       # Regex-based field extraction
│   │   │       └── TextCleaner.ts          # Text normalization
│   │   └── scenarios/
│   │       ├── hl_catalog.ts  # High-Level flow catalog loader
│   │       └── runner/        # Flow execution engine (1009 lines total)
│   │           ├── index.ts   # ScenariosRunner class (278 lines)
│   │           ├── TaskBuilder.ts          # Builds execution tasks from payloads
│   │           ├── TaskExecutor.ts (167)   # Executes individual tasks
│   │           ├── TaskQueue.ts (66)       # Queue management with concurrency
│   │           ├── DbPersistence.ts (82)   # Database CRUD for runs/items
│   │           ├── BrowserTracker.ts (50)  # Tracks active browser instances
│   │           ├── WindowTracker.ts (114)  # Tracks window state
│   │           ├── Finalizer.ts (35)       # Run completion logic
│   │           ├── ExecHL.ts (37)          # High-level flow execution
│   │           ├── Events.ts (18)          # Progress event emitter
│   │           └── types.ts (84)           # Runner type definitions
├── preload/
│   └── index.ts                # Secure context bridge (exposes window.api)
├── renderer/                   # React UI (frontend)
│   ├── pages/                  # 5 main pages
│   │   ├── Dashboard.tsx
│   │   ├── AutomationV3.tsx    # Flow execution orchestration UI
│   │   ├── Leads.tsx           # Lead management
│   │   ├── Config.tsx          # Settings & credentials
│   │   └── Admin.tsx           # Development utilities
│   ├── components/             # 75+ React components
│   │   ├── automation/v3/      # Automation UI (36 components)
│   │   ├── forms/              # Dynamic form components (18)
│   │   ├── import-panel/       # Email import UI (7)
│   │   ├── leads/              # Lead management components (4)
│   │   ├── config/             # Configuration components (3)
│   │   └── common/
│   ├── hooks/                  # Custom React hooks (20+)
│   ├── contexts/               # React contexts (1: ToastContext)
│   ├── services/               # Frontend services
│   ├── utils/                  # Utility functions
│   ├── main.tsx
│   └── App.tsx
└── shared/                     # Shared code (frontend + backend)
    ├── types/                  # 5 type definition files
    │   ├── leads.ts            # Lead & lead-related types
    │   ├── automation.ts       # Automation & execution types
    │   ├── email.ts
    │   ├── emailParsing.ts
    │   └── ...
    ├── db/
    │   ├── connection.ts       # Database wrapper (better-sqlite3)
    │   ├── queries/            # Query helpers
    │   │   ├── executions.ts   # Execution queries
    │   │   └── leads.ts        # Lead queries
    ├── businessRules/
    ├── defaults/
    │   ├── schemaLoader.ts     # Domain schema loader
    │   └── ...
    ├── utils/
    └── settings.ts
```

### `automation/` Directory - Playwright Automation Engine
```
automation/
├── cli/
│   ├── run.mjs                 # CLI entry point for flow execution
│   └── run_from_wsl.sh         # WSL compatibility script
└── engine/                     # Extensible command-based execution
    ├── core/
    │   ├── FlowRunner.mjs       # Main flow execution orchestrator
    │   ├── BrowserManager.mjs   # Playwright browser lifecycle
    │   ├── ArtifactsPipeline.mjs # Screenshot/DOM/video collection
    │   ├── ProgressEmitter.mjs  # Event emission
    │   └── ContextStack.mjs     # Frame/context tracking
    ├── commands/               # 14 step command implementations
    │   ├── BaseCommand.mjs      # Abstract base
    │   ├── navigation/
    │   │   ├── GotoCommand.mjs
    │   │   ├── WaitForFieldCommand.mjs
    │   │   └── WaitNetworkIdleCommand.mjs
    │   ├── forms/
    │   │   ├── FillFieldCommand.mjs
    │   │   ├── ClickFieldCommand.mjs
    │   │   ├── SelectFieldCommand.mjs
    │   │   ├── ToggleFieldCommand.mjs
    │   │   └── TypeFieldCommand.mjs
    │   ├── frames/
    │   │   ├── EnterFrameCommand.mjs
    │   │   └── ExitFrameCommand.mjs
    │   ├── interaction/
    │   │   ├── AcceptConsentCommand.mjs
    │   │   ├── ScrollIntoViewCommand.mjs
    │   │   └── PressKeyCommand.mjs
    │   └── utility/
    │       ├── SleepCommand.mjs
    │       └── CommentCommand.mjs
    ├── resolvers/              # Dynamic field resolution
    │   ├── FieldResolver.mjs    # Maps field names → selectors
    │   ├── ValueResolver.mjs    # Resolves lead data → form values
    │   ├── TemplateResolver.mjs # Parses {credentials.username} templates
    │   └── ConditionEvaluator.mjs
    ├── registry/
    │   └── index.mjs            # Command registry builder
    ├── artifacts/
    │   ├── ScreenshotManager.mjs # Screenshot capture
    │   └── DomCollector.mjs      # DOM snapshot collection
    ├── browser/
    │   └── ChromeDetector.mjs    # Chrome installation detection
    ├── errors/
    │   └── RunError.mjs          # Error handling
    └── utils/
        ├── fileSystem.mjs
        ├── selectorBuilder.mjs
        ├── stepDescriber.mjs
        ├── text.mjs
        └── timestamp.mjs
```

### `data/` Directory - Configuration Data
```
data/
├── flows/                      # JSON flow definitions (5 flows)
│   ├── swisslifeone/
│   │   ├── swisslifeone_login.hl.json
│   │   ├── swisslifeone_slsis.hl.json
│   │   └── swisslifeone_slsis_inspect.hl.json
│   └── alptis/
│       ├── alptis_login.hl.json
│       └── alptis_sante_select_pro_full.hl.json
├── schemas/                    # JSON Schema definitions
│   ├── flow.schema.json        # Flow step schema (v1)
│   ├── lead.schema.json        # Lead data schema
│   └── field-definition.schema.json
├── carriers/                   # Carrier-specific UI configurations
│   ├── swisslifeone.ui.json    # SwissLife One form configuration
│   └── alptis.ui.json          # Alptis form configuration
├── field-definitions/          # Carrier field/selector mappings
│   ├── swisslifeone.json       # Field keys, selectors, types
│   └── alptis.json
└── domain/
    └── base.domain.json        # Universal domain model (2 versions)
```

### `scripts/` Directory - Database & Management
```
scripts/
├── db/
│   ├── core/                   # Database utilities
│   │   ├── connection.mjs
│   │   ├── migrator.mjs        # Migration runner
│   │   └── seeder.mjs          # Seed runner
│   ├── migrations/             # 25+ migration files
│   │   ├── 001_initial_schema.mjs
│   │   ├── 002_add_leads_tables.mjs
│   │   ├── 003_add_flows_tables.mjs
│   │   ├── 020_create_execution_tables.mjs
│   │   ├── 024_create_email_tables.mjs
│   │   └── ...
│   ├── seeds/                  # Seed data
│   │   ├── 01_platforms.mjs
│   │   ├── 04_credentials.mjs
│   │   └── 05_profiles.mjs
│   ├── migrate.mjs
│   ├── reset.mjs               # Full database reset
│   ├── seed.mjs                # Run seeds
│   ├── status.mjs              # Database status report
│   └── dump.mjs                # Export schema/data
├── flows/                      # Flow management CLI
│   ├── add_flow.mjs
│   ├── export_flow.mjs
│   ├── update_flow.mjs
│   ├── delete_flow.mjs
│   ├── lint_flows.mjs
│   └── lib/flows_io.mjs
├── platforms/                  # Carrier field management
│   ├── import_ui_form.mjs
│   ├── import_field_definitions.mjs
│   └── export_field_definitions.mjs
└── verify_sync.mjs             # Verification utilities
```

---

## 2. EXISTING PARSERS - Location & Purpose

### Parser Architecture
**Location:** `/home/user/mutuelles_v3/src/main/services/leadParsing/`

**Pattern:** Multi-parser orchestration with provider detection

```typescript
// Parser Hierarchy:
ILeadParser (interface)
  ├── BaseLeadParser (abstract)
  │   ├── AssurProspectParser (AssurProspect email format)
  │   ├── AssurleadParser (AssurLead email format)
  │   └── GenericStructuredParser (Fallback parser)
```

### Key Parser Components:

1. **ParserOrchestrator.ts** - Coordinates parsing pipeline
   - Detects provider type (assurprospect, assurlead, generic)
   - Runs applicable parsers
   - Scores results
   - Returns best match

2. **ProviderDetector.ts** - Auto-detects email/lead format
   - Analyzes structure (tabular, sections, keywords)
   - Calculates confidence (0-100)
   - Provides detection reasoning

3. **ContentCleaner.ts** - Pre-processing
   - Strips HTML/CSS/scripts
   - Decodes entities
   - Normalizes whitespace

4. **FieldExtractor.ts** - Regex-based field extraction
   - Identity extraction (civility, names, birth dates)
   - Contact info (email, phone, address)
   - Professional info (regime, status, profession)
   - Family info (spouse, children)
   - Project needs (dates, plans, toggles)

5. **Concrete Parsers:**
   - **AssurProspectParser.ts** (100 lines) - Structured section parsing
   - **AssurleadParser.ts** - Tabular format parsing
   - **GenericStructuredParser.ts** - Generic fallback

### Parsed Output Structure
```typescript
interface ParsedLeadData {
  subscriber?: { civility, lastName, firstName, birthDate, email, ... }
  spouse?: { ... }
  children?: Array<{ birthDate, gender, ... }>
  project?: { name, dateEffet, plan, couverture, ... }
  metadata: { parserUsed, confidence, parsedFieldsCount, ... }
}
```

---

## 3. CURRENT DATA MODELS/TYPES

### Lead Data Structure
**File:** `/home/user/mutuelles_v3/src/shared/types/leads.ts`

```typescript
// Main Lead Structure
interface Lead {
  id: string
  data: LeadData
  metadata: Record<string, any>
  createdAt: string
}

interface LeadData {
  subscriber: SubscriberInfo
  spouse?: SpouseInfo
  children?: ChildInfo[]
  project: ProjectInfo
  platformData?: PlatformData  // Platform-specific extensions
}

// Key nested types
interface SubscriberInfo {
  civility?: string
  lastName?: string
  firstName?: string
  birthDate?: string
  telephone?: string
  email?: string
  address?: string
  postalCode?: string
  city?: string
  departmentCode?: string | number
  regime?: string
  category?: string
  status?: string
  profession?: string
  workFramework?: string
  childrenCount?: number
}

interface SpouseInfo {
  civility?: string
  firstName?: string
  lastName?: string
  birthDate?: string
  regime?: string
  category?: string
  status?: string
  profession?: string
  workFramework?: string
}

interface ChildInfo {
  birthDate?: string
  gender?: string
  regime?: string
  ayantDroit?: string
}

interface ProjectInfo {
  name?: string
  dateEffet?: string
  plan?: string
  couverture?: boolean
  ij?: boolean
  simulationType?: string
  madelin?: boolean
  resiliation?: boolean
  reprise?: boolean
  currentlyInsured?: boolean
  ranges?: string[]
  levels?: { medicalCare?, hospitalization?, optics?, dental? }
}
```

### Automation/Execution Types
**File:** `/home/user/mutuelles_v3/src/shared/types/automation.ts`

```typescript
interface ExecutionMatrix {
  items: ExecutionMatrixItem[]
  createdAt: string
  totalCount: number
}

interface ExecutionSettings {
  mode: 'headless' | 'dev' | 'dev_private'
  concurrency: number
  timeout: number
  keepBrowserOpen: boolean
  screenshotFrequency: 'all' | 'errors' | 'none'
  retryFailed: boolean
  maxRetries: number
}

interface ExecutionRun {
  runId: string
  status: 'starting' | 'running' | 'completed' | 'error' | 'stopped'
  items: ExecutionItem[]
  settings: ExecutionSettings
  startedAt: string
  completedAt?: string
  totalItems: number
  completedItems: number
  successItems: number
  errorItems: number
  durationMs?: number
}

interface ExecutionItem {
  id: string
  runId: string
  leadId: string
  leadName: string
  platform: string
  flowSlug?: string
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled'
  startedAt?: Date
  completedAt?: Date
  durationMs?: number
}

interface FlowRun {
  id: string
  slug: string
  platform: string
  leadId?: string
  status: 'success' | 'error' | 'running' | 'stopped'
  startedAt: string
  finishedAt?: string
  runDir: string
  mode: ExecutionMode
  stepsTotal?: number
  stepsCompleted?: number
}
```

### Flow Definition (High-Level DSL)
**Schema:** `/home/user/mutuelles_v3/data/schemas/flow.schema.json`

```json
{
  "version": 1,
  "platform": "swisslifeone",
  "slug": "swisslifeone_login",
  "name": "Connexion SwissLifeOne",
  "trace": "retain-on-failure",
  "steps": [
    { "type": "goto", "url": "...", "label": "..." },
    { "type": "waitForField", "field": "field_key", "label": "..." },
    { "type": "fillField", "field": "field_key", "value": "{credentials.username}", "label": "..." },
    { "type": "clickField", "field": "field_key", "label": "..." }
  ]
}
```

### Domain Model (Carrier Configuration)
**File:** `/home/user/mutuelles_v3/data/domain/base.domain.json`

```json
{
  "version": 2,
  "domains": {
    "project": {
      "name": { "type": "text", "label": "Nom du projet", "required": true },
      "dateEffet": { "type": "date", "label": "Date d'effet", "format": "DD/MM/YYYY" },
      "plan": { "type": "select", "label": "Gamme/Produit", "carrierSpecific": true },
      "couverture": { "type": "toggle", "label": "Couverture individuelle" },
      "madelin": { "type": "toggle", "label": "Loi Madelin" }
    },
    "subscriber": { ... },
    "spouse": { ... },
    "children": { ... }
  }
}
```

---

## 4. CURRENT UI COMPONENTS

### Framework & Stack
- **Framework:** React 18.3 + TypeScript
- **Styling:** Tailwind CSS 4.0
- **Icons:** Lucide React
- **Routing:** React Router v6
- **State:** React Context (ToastContext)
- **Build:** Electron-Vite (Vite 5.4 + React plugin)

### UI Component Structure (75+ components)

#### Page Components (5)
- **Dashboard.tsx** - System overview & stats
- **AutomationV3.tsx** - Flow execution orchestration
- **Leads.tsx** - Lead management & CRUD
- **Config.tsx** - Settings, credentials, profiles
- **Admin.tsx** - Development & debug utilities

#### Automation Components (36 in `/components/automation/v3/`)
```
ExecutionDashboard, ExecutionCurrentView, ExecutionHistoryView
ExecutionFoldersView, ExecutionHistoryFoldersView
ExecutionFolder, ExecutionItemCard
FlowPlatformList, FlowDetailsModal, FlowTestModal, FlowsBrowserPanel
LeadSelector, LeadStatusIcon
ScreenshotThumbnail, ScreenshotTimeline
RunDetailsModal, RunHistoryCard
HistoryFilters, HistoryItemCard
AdvancedModeTab, SettingsModal, SettingsExecutionSection, SettingsVisibilitySection
DuplicateWarningBanner
ReplayFailuresButton, ReplayFailuresModal
GlobalTimeTracker, TimeEstimator
CompactStats, AutoPreviewModal
```

#### Form Components (18 in `/components/forms/`)
```
DynamicFormField, RepeatableFieldSet, PlatformSpecificSection
CommonFieldsSection, PlatformBadge, CivilitySwitch

Field types:
  TextField, NumberField, DateField
  SelectField, RadioField, ToggleField, FieldWrapper

Sections:
  SubscriberFieldsSection, SpouseSection
  ChildrenSection, ProjectFieldsSection
```

#### Import Panel Components (7)
```
ImportPanel, ImportSettings, SettingsModal
EmailImportView, EmailList, EmailListItem, EmailDateRangePicker
KnownSendersManager, SenderSuggestionsModal
LeadEditButton, LeadPreviewCard, LeadPreviewList, LeadSelectionHeader
```

#### Lead Management Components (4)
```
LeadsTable, LeadsFilters, LeadModal, SmartAddModal
```

#### Config Components (3)
```
CredentialsContent, PlatformsContent, ProfileContent
```

#### Base Components (8)
```
Button, Modal, ConfirmModal, Tabs, Toast, ThemeToggle, ErrorBoundary
ToggleableSectionWrapper
```

### Custom Hooks (20+)
```
Core:
  useAutomation - Automation state & control
  useToast - Toast notifications
  useConfirmation - Confirmation dialogs
  useNow - Current time tracking

Form:
  useLeadForm - Form state & validation
  useFormSchema - Dynamic schema loading
  useEmailToLead - Email parsing

Automation:
  useExecution - Execution tracking
  useHistory - Run history
  useFlowFiltering - Flow filtering
  useSettings - Execution settings
  useSelection - Item selection

Email:
  useEmailImport - Email fetching & import
  useSmartParsing - Smart lead extraction

Other:
  useRunDetails - Run manifest loading
  duplicateDetector - Duplicate detection
```

---

## 5. DATABASE SCHEMA

### Storage
- **Type:** SQLite3 (better-sqlite3)
- **Location (Dev):** `./dev-data/mutuelles.sqlite3` (or `$MUTUELLES_DB_DIR`)
- **WAL Mode:** Enabled
- **Foreign Keys:** Enabled
- **Migrations:** 25+ idempotent migrations

### Schema Tables

#### Core Catalog Tables
```sql
platforms_catalog(
  id, slug UNIQUE, name, status, base_url, website_url,
  notes, selected, created_at, updated_at
)

platform_pages(
  id, platform_id → platforms_catalog,
  slug, name, type, url, status, order_index, active
)

platform_fields(
  id, page_id → platform_pages,
  key, label, type, required, secure, order_index
)

platform_credentials(
  platform_id PRIMARY KEY → platforms_catalog,
  username, password_encrypted BLOB, updated_at
)

profiles(
  id, name, user_data_dir, browser_channel,
  created_at, initialized_at
)
```

#### Lead & Data Tables
```sql
raw_leads(
  id PRIMARY KEY, raw_content TEXT, metadata TEXT, extracted_at
)

clean_leads(
  id PRIMARY KEY,
  raw_lead_id → raw_leads,
  data TEXT (JSON),          # Complete lead structure
  metadata TEXT (JSON),      # Source, flags, version
  created_at, updated_at
)

platform_leads(
  id PRIMARY KEY,
  clean_lead_id → clean_leads,
  platform_id → platforms_catalog,
  adapted_data TEXT (JSON),
  status, adapted_at, processed_at, error_message
)
```

#### Email Configuration Tables
```sql
gmail_configs(
  id, name, email, refresh_token BLOB,
  provider_settings TEXT (JSON),
  active, created_at
)

email_imports(
  id, config_id → gmail_configs,
  query, days_back, settings TEXT (JSON),
  status, message, last_run_at, created_at
)

email_known_senders(
  id, config_id → gmail_configs,
  sender_email, sender_name, is_trusted,
  created_at
)
```

#### Execution Tracking Tables
```sql
execution_runs(
  id PRIMARY KEY,
  status ('running', 'completed', 'failed', 'stopped'),
  mode, concurrency, total_items,
  success_items, error_items, pending_items, cancelled_items,
  started_at, completed_at, duration_ms,
  settings_snapshot TEXT (JSON),
  created_at, updated_at
)

execution_items(
  id PRIMARY KEY,
  run_id → execution_runs,
  lead_id, lead_name, platform, platform_name,
  flow_slug, flow_name,
  status ('pending', 'running', 'success', 'error', 'cancelled'),
  error_message, current_step, total_steps,
  run_dir, started_at, completed_at, duration_ms,
  attempt_number, created_at, updated_at
)

execution_steps(
  id, item_id → execution_items,
  step_index, step_type, step_label,
  status ('success', 'error', 'skipped'),
  error_message, duration_ms, screenshot_path, executed_at
)

execution_attempts(
  id, item_id → execution_items,
  attempt_number, status ('success', 'error'),
  error_message, started_at, completed_at, duration_ms
)
```

#### System Tables
```sql
settings(key, value)  # theme, chrome_path, etc.

_migrations(
  id, version UNIQUE, name, executed_at
)
```

### Key Indexes
- `execution_runs(status)`, `execution_runs(started_at DESC)`
- `execution_items(run_id)`, `execution_items(status)`, `execution_items(lead_id)`, `execution_items(platform)`
- `execution_steps(item_id)`, `execution_steps(item_id, step_index)`
- `execution_attempts(item_id)`

---

## 6. EXISTING ADAPTERS/PLATFORM INTEGRATIONS

### Playwright-Based Browser Automation

**Location:** `/home/user/mutuelles_v3/automation/engine/`

#### Core Execution Flow
```
CLI Entry (run.mjs)
  → FlowRunner (core/FlowRunner.mjs)
    → BrowserManager (launchPersistentContext)
    → CommandRegistry (14 command types)
    → Command Execution Loop
      → FieldResolver (field key → selector)
      → ValueResolver (lead data → form value)
      → TemplateResolver ({credentials.username} expansion)
      → ConditionEvaluator (conditional steps)
      → ScreenshotManager (artifact capture)
```

#### Supported Command Types (14)
1. **Navigation**
   - `GotoCommand` - Navigate to URL
   - `WaitForFieldCommand` - Wait for selector/field
   - `WaitNetworkIdleCommand` - Wait for network idle

2. **Form Interaction**
   - `FillFieldCommand` - Fill text input
   - `ClickFieldCommand` - Click button/element
   - `SelectFieldCommand` - Select dropdown option
   - `ToggleFieldCommand` - Toggle checkbox
   - `TypeFieldCommand` - Type with delays

3. **Frame Management**
   - `EnterFrameCommand` - Switch to iframe
   - `ExitFrameCommand` - Exit iframe

4. **User Interaction**
   - `AcceptConsentCommand` - Accept consent/cookies
   - `ScrollIntoViewCommand` - Scroll to element
   - `PressKeyCommand` - Press keyboard keys

5. **Utility**
   - `SleepCommand` - Pause execution
   - `CommentCommand` - Comments (no-op)

#### Flow Step Resolution
**Field Mapping Chain:**
```
flow.steps[].field → FieldResolver
  → Look up in field-definitions.json (field key → selector)
  → Resolve selector (with template substitution)
  → Get active context (main page or frame)
  → Execute on resolved element
```

**Value Resolution:**
```
flow.steps[].value → ValueResolver
  → Expand templates: {credentials.username}, {lead.subscriber.firstName}
  → Look up value mappings (if configured)
  → Validate format (date, select option, etc.)
  → Pass to command for filling
```

#### Supported Carriers & Flows

**SwissLife One (swisslifeone)**
- Flows:
  - `swisslifeone_login` - Login & authentication
  - `swisslifeone_slsis` - SLSIS form completion
  - `swisslifeone_slsis_inspect` - Data inspection
- Configuration: `/home/user/mutuelles_v3/data/field-definitions/swisslifeone.json` (90+ fields)

**Alptis (alptis)**
- Flows:
  - `alptis_login` - Login & authentication
  - `alptis_sante_select_pro_full` - Full health insurance form
- Configuration: `/home/user/mutuelles_v3/data/field-definitions/alptis.json`

#### Selector & Field Resolution
**Files:**
- `/home/user/mutuelles_v3/data/field-definitions/swisslifeone.json` - 90+ field definitions
- `/home/user/mutuelles_v3/automation/engine/resolvers/FieldResolver.mjs`
- `/home/user/mutuelles_v3/automation/engine/utils/selectorBuilder.mjs`

**Structure:**
```json
{
  "platform": "swisslifeone",
  "fields": [
    {
      "key": "login_username",
      "type": "text",
      "label": "Username",
      "selector": "#userNameInput",
      "domainKey": "auth.username"
    }
  ]
}
```

#### Browser & OS Detection
**File:** `/home/user/mutuelles_v3/automation/engine/browser/ChromeDetector.mjs`
- Detects Chrome installations across Windows/Mac/Linux
- Returns path for `channel: 'chrome'` in Playwright

#### Artifacts Collection
**ScreenshotManager** (`/automation/engine/artifacts/ScreenshotManager.mjs`)
- Captures screenshots at each step
- Saves to: `runs/<flowSlug>/<timestamp>/screenshots/`
- Tracks step indices & labels

**DomCollector** (`/automation/engine/artifacts/DomCollector.mjs`)
- Captures DOM snapshots
- Optional detailed tracing (Playwright inspector)

---

## 7. CONFIGURATION FILES & JSON PILOTS

### Configuration Data Files

#### 1. **Flow Definitions (JSON Pilot)**
**Location:** `/home/user/mutuelles_v3/data/flows/<platform>/<slug>.hl.json`

**Example:** `swisslifeone_login.hl.json`
```json
{
  "version": 1,
  "platform": "swisslifeone",
  "slug": "swisslifeone_login",
  "name": "Connexion SwissLifeOne (HL)",
  "trace": "retain-on-failure",
  "steps": [
    {
      "type": "goto",
      "url": "https://www.swisslifeone.fr/",
      "label": "accueil"
    },
    {
      "type": "waitForField",
      "field": "login_username",
      "label": "wait-sso-form"
    },
    {
      "type": "fillField",
      "field": "login_username",
      "value": "{credentials.username}",
      "label": "fill-user"
    },
    {
      "type": "clickField",
      "field": "login_submit",
      "label": "submit"
    }
  ]
}
```

**Management Commands:**
```bash
npm run flows:export              # Export all flows from DB
npm run flows:export:slug <slug>  # Export specific flow
npm run flows:add -- <file.json>  # Import new flow
npm run flows:update -- <file.json> # Update flow
npm run flows:delete -- --slug <slug> [--hard]
npm run flows:lint               # Validate all flow files
npm run flows:sync -- [--apply]  # Sync files ↔ DB
```

#### 2. **Field Definitions (Platform Mapping)**
**Location:** `/home/user/mutuelles_v3/data/field-definitions/<platform>.json`

**Structure:**
```json
{
  "platform": "swisslifeone",
  "fields": [
    {
      "key": "login_username",
      "domainKey": "auth.username",
      "type": "text",
      "label": "Username",
      "selector": "#userNameInput"
    },
    {
      "key": "slsis_date_naissance",
      "domainKey": "subscriber.birthDate",
      "type": "text",
      "label": "Date de naissance",
      "selector": "#contratSante-dateNaissance",
      "format": "DD/MM/YYYY"
    }
  ]
}
```

**Import/Export:**
```bash
npm run platforms:fields:import -- <platform> <file.json>
npm run platforms:fields:export -- <platform>
```

#### 3. **Carrier UI Configuration**
**Location:** `/home/user/mutuelles_v3/data/carriers/<carrier>.ui.json`

**Example:** `swisslifeone.ui.json`
```json
{
  "carrier": "swisslifeone",
  "version": 1,
  "extends": "base.domain.json@2",
  "sections": [
    {
      "id": "projet",
      "title": "Projet",
      "step": "Contrat",
      "fields": [
        { "domainKey": "project.name", "required": true },
        "project.dateEffet",
        "project.plan",
        "project.couverture",
        "project.madelin"
      ]
    },
    {
      "id": "souscripteur",
      "title": "Souscripteur",
      "fields": [
        "subscriber.civility",
        "subscriber.lastName",
        "subscriber.firstName"
      ]
    }
  ]
}
```

#### 4. **Domain Model (Universal Schema)**
**Location:** `/home/user/mutuelles_v3/data/domain/base.domain.json`

**Purpose:** Single source of truth for all field definitions across carriers

**Structure:**
```json
{
  "version": 2,
  "domains": {
    "project": {
      "name": {
        "type": "text",
        "label": "Nom du projet",
        "required": true,
        "validations": { "minLength": 2, "maxLength": 120 }
      },
      "dateEffet": {
        "type": "date",
        "label": "Date d'effet",
        "format": "DD/MM/YYYY",
        "defaultExpression": "firstOfNextMonth"
      }
    },
    "subscriber": { ... },
    "spouse": { ... },
    "children": { ... }
  }
}
```

#### 5. **JSON Schemas (Validation)**
**Location:** `/home/user/mutuelles_v3/data/schemas/`

- **flow.schema.json** - Validates flow JSON structure
- **lead.schema.json** - Validates lead data structure
- **field-definition.schema.json** - Validates field mappings

#### 6. **Package Configuration**
**File:** `/home/user/mutuelles_v3/package.json`

**Key Scripts:**
```json
{
  "dev": "electron-vite dev",
  "build": "electron-vite build && electron-builder",
  "flows:export": "npm run flows:export:all",
  "flows:run": "electron automation/cli/run.mjs",
  "db:reset:seed": "electron scripts/db/reset.mjs --seed",
  "db:migrate": "electron scripts/db/migrate.mjs"
}
```

#### 7. **Electron Configuration**
**Files:**
- `/home/user/mutuelles_v3/electron.vite.config.ts` - Vite config for Electron
- `/home/user/mutuelles_v3/electron-builder.yml` - NSIS build config
- `/home/user/mutuelles_v3/tsconfig.json` - TypeScript strict mode

---

## SUMMARY TABLE

| Component | Location | Purpose | Key Files |
|-----------|----------|---------|-----------|
| **Parser System** | `src/main/services/leadParsing/` | Email/text → Lead data | BaseLeadParser, AssurProspectParser, ParserOrchestrator |
| **Lead Management** | `src/main/services/leads.ts` | CRUD, duplication, enrichment | LeadsService (3 parsers + validation) |
| **Automation Runner** | `src/main/services/scenarios/runner/` | Flow execution orchestration | ScenariosRunner (1009 LOC), 11 support modules |
| **Playwright Engine** | `automation/engine/` | Step execution & browser control | FlowRunner, 14 commands, 3 resolvers |
| **Flow DSL** | `data/flows/` | High-level automation config | 5 .hl.json flow files |
| **Field Mapping** | `data/field-definitions/` | Field → Selector mapping | Platform-specific JSON |
| **Domain Model** | `data/domain/base.domain.json` | Universal field schema | Single source of truth |
| **UI Components** | `src/renderer/components/` | React UI (75+ components) | Automation, Forms, Import, Leads |
| **Database** | SQLite + migrations | Leads, executions, email | 25+ migrations, 10+ tables |
| **IPC Handlers** | `src/main/ipc/` | Electron IPC API | 9 handler modules |

---

## KEY ARCHITECTURAL INSIGHTS FOR REFACTORING

1. **Modular Parser System** - Easy to add new email format parsers (implement `ILeadParser`)
2. **Command Pattern** - Automation commands follow `BaseCommand` pattern (extensible)
3. **JSON-Driven Configuration** - Flows, field mappings, domain models all JSON (no code changes needed)
4. **Separation of Concerns** - Clear split: parser (email→data), runner (data→browser), UI (React components)
5. **Database-Backed** - All data persisted with migrations, support for versioning
6. **Type Safety** - Full TypeScript, shared types between frontend/backend
7. **Stateless Frontend** - All state in database, frontend reads from DB via IPC
8. **Provider Detection** - Automatic email format detection before parsing
9. **High-Level DSL** - Flow steps use field names, not selectors (abstraction layer)
10. **Extensible Resolvers** - Template, field, value, condition resolvers can be customized

---

**Last Updated:** 2025-10-31
**Files Analyzed:** 183 TypeScript + 50+ automation + 25+ migrations + configuration files
