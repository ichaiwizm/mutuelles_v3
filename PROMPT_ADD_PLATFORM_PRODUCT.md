# PROMPT: Add New Insurance Platform and Products to Database

## MISSION
You are tasked with adding a new insurance platform (carrier) and its products to this automated insurance quotation system. You will use MCP Playwright to browse the platform's website, extract product information, create all necessary configuration files, and insert data into the database.

---

## SYSTEM ARCHITECTURE OVERVIEW

### Technology Stack
- **Runtime**: Electron application (Node.js backend + React frontend)
- **Database**: SQLite3 with better-sqlite3 driver
- **Automation**: Playwright (Chromium) for browser automation
- **Configuration**: JSON-based declarative system

### Core Components
```
┌─────────────────────────────────────────────────────────────┐
│                    MAIN PROCESS (Node.js)                   │
│  • Database: /mutuelles.db                                  │
│  • Services: LeadsService, PlatformLeadsService, etc        │
│  • Automation Engine: Playwright via admin/engine/engine.mjs│
├─────────────────────────────────────────────────────────────┤
│              CONFIGURATION FILES (JSON)                      │
│  • admin/field-definitions/{platform}.json                  │
│  • admin/carriers/{platform}.ui.json                        │
│  • admin/flows/{platform}/*.hl.json                         │
│  • admin/domain/base.domain.json (universal model)          │
├─────────────────────────────────────────────────────────────┤
│                    DATABASE SCHEMA                           │
│  • platforms_catalog (platforms + JSON configs)             │
│  • flows_catalog (automation flows)                         │
│  • clean_leads (lead data)                                  │
│  • lead_flow_assignments (execution tracking)               │
│  • flow_selection_rules (conditional routing)               │
└─────────────────────────────────────────────────────────────┘
```

---

## DATABASE SCHEMA REFERENCE

### Table: `platforms_catalog`
Stores platform metadata and all configuration as JSON columns.

```sql
CREATE TABLE platforms_catalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,                    -- Lowercase identifier (e.g., 'platformname')
  name TEXT NOT NULL,                           -- Display name (e.g., 'Platform Name')
  status TEXT NOT NULL DEFAULT 'ready',         -- 'ready' | 'beta' | 'disabled'
  base_url TEXT,                                -- Optional: platform login URL
  website_url TEXT,                             -- Optional: public website URL
  notes TEXT,                                   -- Optional: internal notes
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  field_definitions_json TEXT DEFAULT NULL,     -- JSON: Field mappings (see below)
  ui_form_json TEXT DEFAULT NULL,               -- JSON: UI form structure (see below)
  value_mappings_json TEXT DEFAULT NULL,        -- JSON: Value transformations (optional)
  selected INTEGER NOT NULL DEFAULT 1           -- 1=active, 0=inactive
);
```

### Table: `flows_catalog`
Stores automation flows for each platform.

```sql
CREATE TABLE flows_catalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_id INTEGER NOT NULL,                 -- FK to platforms_catalog.id
  slug TEXT NOT NULL UNIQUE,                    -- 'platform_flowname'
  name TEXT NOT NULL,                           -- Display name
  active INTEGER NOT NULL DEFAULT 1,            -- 1=enabled, 0=disabled
  created_at TEXT DEFAULT (datetime('now')),
  flow_json TEXT DEFAULT NULL,                  -- JSON: Flow definition (see below)
  steps_count INTEGER DEFAULT 0,                -- Auto-calculated
  updated_at TEXT DEFAULT NULL,
  FOREIGN KEY(platform_id) REFERENCES platforms_catalog(id) ON DELETE CASCADE
);
```

### Table: `platform_credentials`
Stores encrypted credentials for platform login.

```sql
CREATE TABLE platform_credentials (
  platform_id INTEGER PRIMARY KEY,
  username TEXT NOT NULL,
  password_encrypted BLOB NOT NULL,             -- Encrypted via Electron.safeStorage
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(platform_id) REFERENCES platforms_catalog(id) ON DELETE CASCADE
);
```

---

## CONFIGURATION FILE STRUCTURES

### 1. FIELD DEFINITIONS (`admin/field-definitions/{platform}.json`)

Maps platform-specific form fields to universal domain model.

**Structure:**
```json
{
  "platform": "platformslug",
  "fields": [
    {
      "key": "platform_field_identifier",
      "domainKey": "domain.model.path",
      "type": "text|password|date|select|radio-group|toggle|button",
      "label": "Human readable label",
      "selector": "CSS selector to locate field on website",
      "required": true|false,
      "defaultValue": "optional default",
      "options": { /* field-type specific options */ },
      "metadata": { /* type-specific metadata */ },
      "valueMappings": { /* optional value transformations */ }
    }
  ]
}
```

**Field Types & Options:**

**Text/Password/Date Fields:**
```json
{
  "key": "login_username",
  "domainKey": "auth.username",
  "type": "text",
  "selector": "#username-input",
  "required": true,
  "metadata": {
    "method": "default|jquery",
    "triggerEvents": ["change", "blur"]
  }
}
```

**Select Fields (Dropdown with items):**
```json
{
  "key": "subscriber_category",
  "domainKey": "subscriber.category",
  "type": "select",
  "selector": "#category-field",
  "options": {
    "open_selector": "#category-dropdown-trigger",
    "items": [
      {
        "value": "CADRES",
        "label": "Cadres",
        "option_selector": ".dropdown-item:has-text('Cadres')"
      }
    ]
  }
}
```

**Select Fields (Template-based):**
```json
{
  "key": "subscriber_regime",
  "domainKey": "subscriber.regime",
  "type": "select",
  "selector": "#regime-select",
  "options": {
    "open_selector": "#regime-dropdown",
    "option_selector_template": ".option[data-value='{{value}}']"
  }
}
```

**Radio Group:**
```json
{
  "key": "subscriber_civility",
  "domainKey": "subscriber.civility",
  "type": "radio-group",
  "options": [
    {
      "value": "MONSIEUR",
      "label": "Monsieur",
      "selector": "#civility-male"
    },
    {
      "value": "MADAME",
      "label": "Madame",
      "selector": "#civility-female"
    }
  ]
}
```

**Toggle Fields:**
```json
{
  "key": "spouse_present",
  "domainKey": "spouse.present",
  "type": "toggle",
  "label": "Conjoint présent",
  "metadata": {
    "toggle": {
      "click_selector": "#spouse-toggle-button",
      "state_on_selector": "#spouse-toggle.active"
    }
  }
}
```

**Dynamic/Repeatable Fields (Arrays):**
```json
{
  "key": "child_{i}_birthdate",
  "domainKey": "children[].birthDate",
  "type": "date",
  "selector": "#child-{i}-birthdate",
  "metadata": {
    "dynamicIndex": {
      "placeholder": "{i}",
      "indexBase": 0
    }
  }
}
```

**Value Mappings (Domain → Platform transformation):**
```json
{
  "key": "child_beneficiary",
  "domainKey": "children[].ayantDroit",
  "type": "select",
  "selector": "#child-beneficiary",
  "valueMappings": {
    "platformslug": {
      "1": "SUBSCRIBER",
      "2": "SPOUSE"
    }
  }
}
```

---

### 2. UI FORM STRUCTURE (`admin/carriers/{platform}.ui.json`)

Defines how fields are organized in the user interface.

**Structure:**
```json
{
  "carrier": "platformslug",
  "version": 1,
  "extends": "base.domain.json@2",
  "meta": {
    "name": "Platform Display Name",
    "description": "Form description",
    "lastUpdated": "2025-10-17"
  },
  "sections": [
    {
      "id": "project_section",
      "title": "Project Information",
      "step": "Project",
      "fields": [
        "project.name",
        "project.dateEffet",
        "project.plan",
        {
          "domainKey": "project.couverture",
          "label": "Coverage Type"
        }
      ]
    },
    {
      "id": "subscriber_section",
      "title": "Subscriber Information",
      "step": "Identity",
      "fields": [
        "subscriber.civility",
        "subscriber.lastName",
        "subscriber.firstName",
        "subscriber.birthDate",
        "subscriber.category",
        "subscriber.regime"
      ]
    },
    {
      "id": "spouse_section",
      "title": "Spouse Information",
      "step": "Family",
      "visibleWhen": {
        "equals": {
          "spouse.present": true
        }
      },
      "fields": [
        "spouse.firstName",
        "spouse.lastName",
        "spouse.birthDate",
        "spouse.regime"
      ]
    },
    {
      "id": "children_section",
      "title": "Children",
      "step": "Family",
      "repeatable": {
        "min": 0,
        "max": 10,
        "itemLabelTemplate": "Child #{index}"
      },
      "visibleWhen": {
        "greaterThan": {
          "children.count": 0
        }
      },
      "fields": [
        "children[].birthDate",
        "children[].regime",
        "children[].ayantDroit"
      ]
    }
  ],
  "leadMapping": {
    "subscriber.civility": "adherent.civilite",
    "subscriber.lastName": "adherent.nom",
    "subscriber.firstName": "adherent.prenom",
    "subscriber.birthDate": "adherent.date_naissance",
    "spouse.birthDate": "conjoint.date_naissance",
    "children[].birthDate": "enfants[].date_naissance"
  }
}
```

**Visibility Conditions:**
- `equals`: Field equals specific value
- `greaterThan`: Numeric comparison
- `oneOf`: Value in array
- `and`: Multiple conditions (all must be true)

---

### 3. AUTOMATION FLOWS (`admin/flows/{platform}/*.hl.json`)

Defines step-by-step browser automation for platform interaction.

**Flow Structure:**
```json
{
  "version": 1,
  "platform": "platformslug",
  "slug": "platform_productname_action",
  "name": "Platform - Product Name - Action",
  "trace": "retain-on-failure",
  "steps": [
    {
      "type": "goto",
      "url": "https://platform.example.com/login",
      "label": "navigate-to-login",
      "timeout_ms": 10000
    },
    {
      "type": "fillField",
      "field": "login_username",
      "value": "{credentials.username}",
      "label": "fill-username"
    },
    {
      "type": "fillField",
      "field": "login_password",
      "value": "{credentials.password}",
      "label": "fill-password"
    },
    {
      "type": "clickField",
      "field": "login_submit",
      "label": "click-login"
    },
    {
      "type": "waitForNetworkIdle",
      "timeout_ms": 5000,
      "label": "wait-after-login"
    },
    {
      "type": "fillField",
      "domainField": "subscriber.lastName",
      "leadKey": "subscriber.lastName",
      "label": "fill-subscriber-lastname"
    },
    {
      "type": "selectField",
      "domainField": "subscriber.category",
      "leadKey": "subscriber.category",
      "label": "select-category"
    },
    {
      "type": "toggleField",
      "domainField": "spouse.present",
      "state": "on",
      "label": "enable-spouse",
      "skipIfNot": "spouse"
    }
  ]
}
```

**Step Types Reference:**

| Type | Purpose | Key Parameters |
|------|---------|----------------|
| `goto` | Navigate to URL | `url`, `timeout_ms` |
| `fillField` | Fill text input | `field`/`domainField`, `value`/`leadKey` |
| `clickField` | Click element | `field`/`domainField` |
| `selectField` | Select dropdown option | `domainField`, `leadKey` |
| `toggleField` | Toggle switch/checkbox | `domainField`, `state: "on"\|"off"` |
| `waitForField` | Wait for field to appear | `field`/`domainField`, `timeout_ms` |
| `waitForNetworkIdle` | Wait for AJAX completion | `timeout_ms` |
| `sleep` | Pause execution | `timeout_ms` |
| `enterFrame` | Enter iframe | `selector` |
| `exitFrame` | Exit iframe | (no params) |
| `scrollIntoView` | Scroll to element | `field`/`domainField` |
| `acceptConsent` | Accept cookie banner | `selector` |
| `pressKey` | Press keyboard key | `key: "Enter"\|"Tab"\|...` |

**Value Templates:**
- `{credentials.username}` - Platform username from DB
- `{credentials.password}` - Platform password (encrypted)
- `{lead.path.to.field}` - Lead data via dot notation
- `{env.VAR_NAME}` - Environment variable

**Conditional Execution:**
- `optional: true` - Don't fail if field missing
- `skipIfNot: "fieldPath"` - Skip if lead field is empty/false
- `skipIf: { "field": "...", "isEmpty": true }` - Complex conditions

---

### 4. DOMAIN MODEL (`admin/domain/base.domain.json`)

Universal data model shared across all platforms. **DO NOT MODIFY** - platforms adapt to this model.

**Key Sections:**
```
project.*        - Project metadata (name, dateEffet, plan, couverture, ij, madelin)
subscriber.*     - Main subscriber (civility, names, birthDate, category, regime, status, profession)
spouse.*         - Spouse information (same fields as subscriber)
children[].*     - Array of children (birthDate, regime, ayantDroit)
contact.*        - Contact info (telephone, email, address)
```

**Example Domain Keys:**
- `subscriber.civility` → "MONSIEUR" | "MADAME"
- `subscriber.category` → "CADRES" | "ARTISANS" | "TNS" | etc.
- `subscriber.birthDate` → "DD/MM/YYYY"
- `children[].ayantDroit` → "1" (subscriber) | "2" (spouse)

---

## WORKFLOW: ADD NEW PLATFORM & PRODUCT

### PHASE 1: RECONNAISSANCE
Use MCP Playwright to systematically explore and extract information from the platform's website.

---

#### Understanding MCP Playwright Tools

**Key Concepts:**
- **Snapshot**: Returns an accessibility tree (YAML format) showing interactive elements with labels and ephemeral references
- **References (`ref=eXX`)**: Temporary identifiers for elements, valid only until next navigation/snapshot
- **Screenshots**: Visual documentation saved to `.playwright-mcp/` directory
- **Evaluate**: Execute JavaScript to extract detailed form attributes

---

#### Step 1: Initial Navigation & Visual Documentation

**Navigate to the platform:**
```javascript
mcp__playwright__browser_navigate({ url: "https://platform-url.com/login" })
```

**Returns:**
- Final URL (after redirects)
- Page title
- Initial accessibility snapshot

**Take full-page screenshot for documentation:**
```javascript
mcp__playwright__browser_take_screenshot({
  fullPage: true,
  filename: "platform_01_login_page.png"
})
```

**Location:** `.playwright-mcp/platform_01_login_page.png`

---

#### Step 2: Extract Form Structure via Snapshot

**Capture accessibility tree:**
```javascript
mcp__playwright__browser_snapshot()
```

**What you get (YAML format):**
```yaml
- textbox "Email address:" [ref=e15]: ""
- textbox "Password:" [ref=e18]: ""
- button "Sign In" [ref=e21]
- checkbox "Remember me" [ref=e24]
- combobox "Select category" [ref=e30]:
  - option "Cadres" [selected]
  - option "Artisans"
- radio "Male" [ref=e45]
- radio "Female" [ref=e48]
- slider "Age" [ref=e52]: "35"
```

**Key Information from Snapshot:**
1. **Element Type**: textbox, button, checkbox, radio, combobox, slider
2. **Label**: Human-readable text (between quotes)
3. **Reference**: `[ref=eXX]` - use this for interactions
4. **Current Value**: After colon (e.g., `: "value"`)
5. **State**: `[checked]`, `[selected]`, `[disabled]`, `[cursor=pointer]`

---

#### Step 3: Extract Detailed Form Attributes

Snapshots don't show CSS selectors, IDs, names, or classes. Use JavaScript evaluation:

```javascript
mcp__playwright__browser_evaluate({
  function: `() => {
    const form = document.querySelector('form');
    if (!form) return { error: 'No form found' };

    const fields = Array.from(form.elements);
    return fields.map(field => ({
      tag: field.tagName,
      type: field.type,
      name: field.name,
      id: field.id,
      placeholder: field.placeholder,
      value: field.value,
      required: field.required,
      disabled: field.disabled,
      checked: field.checked,
      className: field.className,

      // Extract label
      label: field.labels?.[0]?.textContent?.trim() ||
             field.getAttribute('aria-label') ||
             field.getAttribute('placeholder') ||
             'No label',

      // Build CSS selector
      selector: field.id ? '#' + field.id :
                field.name ? '[name="' + field.name + '"]' :
                '.' + field.className.split(' ')[0]
    }));
  }`
})
```

**Returns JSON array:**
```json
[
  {
    "tag": "INPUT",
    "type": "text",
    "name": "username",
    "id": "login-email",
    "placeholder": "Enter your email",
    "value": "",
    "required": true,
    "disabled": false,
    "label": "Email address:",
    "selector": "#login-email",
    "className": "form-control"
  },
  {
    "tag": "SELECT",
    "type": "select-one",
    "name": "category",
    "id": "subscriber-category",
    "value": "CADRES",
    "required": true,
    "label": "Professional Category",
    "selector": "#subscriber-category"
  }
]
```

---

#### Step 4: Extract Dropdown/Select Options

**For each select field, extract available options:**

```javascript
mcp__playwright__browser_evaluate({
  function: `() => {
    const selects = document.querySelectorAll('select');
    return Array.from(selects).map(select => ({
      name: select.name,
      id: select.id,
      label: select.labels?.[0]?.textContent?.trim(),
      options: Array.from(select.options).map(opt => ({
        value: opt.value,
        text: opt.textContent.trim(),
        selected: opt.selected
      }))
    }));
  }`
})
```

**Returns:**
```json
[
  {
    "name": "category",
    "id": "subscriber-category",
    "label": "Professional Category",
    "options": [
      { "value": "", "text": "-- Select --", "selected": false },
      { "value": "CADRES", "text": "Cadres", "selected": true },
      { "value": "ARTISANS", "text": "Artisans, commerçants", "selected": false },
      { "value": "TNS", "text": "Travailleurs non-salariés", "selected": false }
    ]
  }
]
```

---

#### Step 5: Interactive Field Discovery

**For custom dropdowns (non-native select):**

1. **Identify trigger element in snapshot:**
   ```yaml
   - button "Select category" [ref=e30] [cursor=pointer]
   ```

2. **Click to open dropdown:**
   ```javascript
   mcp__playwright__browser_click({
     element: "Select category button",
     ref: "e30"
   })
   ```

3. **Capture opened dropdown:**
   ```javascript
   mcp__playwright__browser_snapshot()
   ```

4. **Extract visible options:**
   ```yaml
   - list:
     - listitem "Cadres" [ref=e35]
     - listitem "Artisans" [ref=e36]
     - listitem "TNS" [ref=e37]
   ```

5. **Take screenshot of dropdown:**
   ```javascript
   mcp__playwright__browser_take_screenshot({
     filename: "platform_02_category_dropdown.png"
   })
   ```

---

#### Step 6: Navigate Through Multi-Step Forms

**If form has multiple pages/steps:**

1. **Document current page:**
   ```javascript
   mcp__playwright__browser_snapshot()
   mcp__playwright__browser_take_screenshot({ filename: "step1.png" })
   ```

2. **Find "Next" button in snapshot:**
   ```yaml
   - button "Continue" [ref=e50]
   ```

3. **Click to next step:**
   ```javascript
   mcp__playwright__browser_click({
     element: "Continue button",
     ref: "e50"
   })
   ```

4. **Wait for page load (if needed):**
   ```javascript
   mcp__playwright__browser_wait_for({ time: 2 })
   ```

5. **Repeat snapshot + screenshot for each step**

---

#### Step 7: Handle Authentication Pages

**If you need to test the quotation form (requires login):**

1. **Take snapshot of login page**
2. **Identify username field:**
   ```yaml
   - textbox "Email:" [ref=e12]
   ```

3. **Fill credentials (if available):**
   ```javascript
   mcp__playwright__browser_type({
     element: "Email field",
     ref: "e12",
     text: "test@example.com"
   })
   ```

4. **Fill password:**
   ```javascript
   mcp__playwright__browser_type({
     element: "Password field",
     ref: "e15",
     text: "password123"
   })
   ```

5. **Submit login:**
   ```javascript
   mcp__playwright__browser_click({
     element: "Sign In button",
     ref: "e18"
   })
   ```

6. **Wait for dashboard:**
   ```javascript
   mcp__playwright__browser_wait_for({ time: 3 })
   ```

**Note:** Only do this if you have valid test credentials!

---

#### Step 8: Combine Data Sources

**Create comprehensive field mapping:**

For each form field, combine information from:
1. **Snapshot** → Field label, type, current value
2. **Evaluate** → CSS selector, name, id, attributes
3. **Screenshots** → Visual context, layout

**Example mapping:**
```json
{
  "snapshot_label": "Email address:",
  "snapshot_type": "textbox",
  "snapshot_ref": "e15",
  "html_tag": "INPUT",
  "html_type": "email",
  "html_id": "login-email",
  "html_name": "username",
  "css_selector": "#login-email",
  "placeholder": "Enter your email",
  "required": true,
  "visual_context": "Top of login form, above password field"
}
```

---

#### Complete Reconnaissance Workflow

```javascript
// 1. Navigate
mcp__playwright__browser_navigate({ url: "https://platform.com/login" })

// 2. Screenshot
mcp__playwright__browser_take_screenshot({
  fullPage: true,
  filename: "01_login_page.png"
})

// 3. Snapshot for structure
mcp__playwright__browser_snapshot()

// 4. Extract form details
mcp__playwright__browser_evaluate({
  function: `() => {
    // [JavaScript from Step 3 above]
  }`
})

// 5. Extract select options
mcp__playwright__browser_evaluate({
  function: `() => {
    // [JavaScript from Step 4 above]
  }`
})

// 6. Test custom dropdowns (if any)
mcp__playwright__browser_click({ element: "dropdown", ref: "eXX" })
mcp__playwright__browser_snapshot()
mcp__playwright__browser_take_screenshot({ filename: "02_dropdown_open.png" })

// 7. Navigate to quotation form (if different page)
mcp__playwright__browser_navigate({ url: "https://platform.com/quotation" })

// 8. Repeat steps 2-5 for quotation form
```

---

#### Deliverables Checklist

After reconnaissance, you should have:

**Screenshots (in `.playwright-mcp/`):**
- [ ] Login page (full page)
- [ ] Each form step/page (full page)
- [ ] Each custom dropdown in opened state
- [ ] Product selection interface
- [ ] Quotation results page (if accessible)

**Field Inventory (JSON/Spreadsheet):**
- [ ] All text inputs (email, text, password, date, number)
- [ ] All select dropdowns (with full option lists)
- [ ] All checkboxes (with labels)
- [ ] All radio buttons (grouped by name)
- [ ] All buttons (submit, next, cancel)
- [ ] All toggles/switches

**Per Field Documentation:**
- [ ] Snapshot label (human-readable)
- [ ] Snapshot type (textbox, combobox, checkbox, etc.)
- [ ] HTML tag and type
- [ ] CSS selector (ID > name > class)
- [ ] Name attribute
- [ ] ID attribute
- [ ] Placeholder text
- [ ] Required status
- [ ] Default value (if any)
- [ ] For selects: Full list of options (value + display text)

**Platform Information:**
- [ ] Login URL
- [ ] Quotation tool URL
- [ ] Available products/plans
- [ ] Form flow (steps, navigation)
- [ ] Authentication requirements
- [ ] Any iframes or special components

---

#### Common Pitfalls & Solutions

**Pitfall 1: "Ref not found" errors**
- **Cause:** References become stale after navigation or page changes
- **Solution:** Always capture fresh snapshot before interactions

**Pitfall 2: Missing form fields in snapshot**
- **Cause:** Fields may be hidden or non-interactive
- **Solution:** Use `evaluate()` to extract all form elements, even hidden ones

**Pitfall 3: Custom dropdowns show no options**
- **Cause:** Options load dynamically on click
- **Solution:** Click dropdown → wait briefly → snapshot to capture options

**Pitfall 4: Cannot identify CSS selector**
- **Cause:** Element has no ID, name, or stable class
- **Solution:** Use parent elements or data attributes; document in notes

**Pitfall 5: Multi-page forms lose context**
- **Cause:** Navigation clears previous snapshots
- **Solution:** Screenshot + evaluate BEFORE navigating to next step

---

#### Example: Complete Login Page Extraction

**Input:**
```
Platform: "Example Insurance"
URL: https://example-insurance.com/pro/login
```

**Process:**
```javascript
// Navigate
mcp__playwright__browser_navigate({
  url: "https://example-insurance.com/pro/login"
})

// Screenshot
mcp__playwright__browser_take_screenshot({
  fullPage: true,
  filename: "exampleinsurance_01_login.png"
})

// Snapshot
mcp__playwright__browser_snapshot()
/* Returns:
- textbox "Email professionnel:" [ref=e10]: ""
- textbox "Mot de passe:" [ref=e12]: ""
- checkbox "Rester connecté" [ref=e14]
- button "Se connecter" [ref=e16]
- link "Mot de passe oublié ?" [ref=e18]
*/

// Extract attributes
mcp__playwright__browser_evaluate({
  function: `() => {
    return Array.from(document.querySelectorAll('input, button')).map(el => ({
      type: el.type,
      name: el.name,
      id: el.id,
      selector: el.id ? '#' + el.id : '[name="' + el.name + '"]',
      label: el.labels?.[0]?.textContent || el.getAttribute('aria-label') || ''
    }));
  }`
})
/* Returns:
[
  { type: "email", name: "email", id: "login-email",
    selector: "#login-email", label: "Email professionnel:" },
  { type: "password", name: "password", id: "login-password",
    selector: "#login-password", label: "Mot de passe:" },
  { type: "checkbox", name: "remember", id: "remember-me",
    selector: "#remember-me", label: "Rester connecté" },
  { type: "submit", name: "", id: "login-submit",
    selector: "#login-submit", label: "" }
]
*/
```

**Output: Field Mapping Table**
```
| Label                | Snapshot Type | Snapshot Ref | HTML Type | ID             | Name     | Selector        | Required |
|----------------------|---------------|--------------|-----------|----------------|----------|-----------------|----------|
| Email professionnel: | textbox       | e10          | email     | login-email    | email    | #login-email    | true     |
| Mot de passe:        | textbox       | e12          | password  | login-password | password | #login-password | true     |
| Rester connecté      | checkbox      | e14          | checkbox  | remember-me    | remember | #remember-me    | false    |
| Se connecter         | button        | e16          | submit    | login-submit   | (none)   | #login-submit   | N/A      |
```

---

**Next Step:** Proceed to PHASE 2: DATA MODELING with this extracted information.

---

### PHASE 2: DATA MODELING

Map platform fields to domain model.

**Steps:**
1. Create mapping table:
   ```
   Platform Field Label → Domain Key → Field Type → CSS Selector
   "Nom du souscripteur" → subscriber.lastName → text → #subscriber-name
   "Date de naissance"   → subscriber.birthDate → date → #birthdate-input
   "Catégorie socio-professionnelle" → subscriber.category → select → #category-dropdown
   ```

2. Identify unmapped fields (platform-specific):
   - Fields that don't fit domain model
   - Add to `platformData` section for storage

3. Document value transformations:
   - If platform uses different values than domain model
   - Example: Domain "MONSIEUR" → Platform "M" or "Homme"

**Domain Model Categories Reference:**
```
SUBSCRIBER CATEGORIES (subscriber.category):
- AGRICULTEURS_EXPLOITANTS
- ARTISANS
- CADRES
- COMMERCANTS
- EMPLOYES
- FONCTIONNAIRES
- PROFESSIONS_INTERMEDIAIRES
- PROFESSIONS_LIBERALES
- RETRAITES
- SANS_ACTIVITE
- TNS

REGIMES (subscriber.regime, spouse.regime, children[].regime):
Platform-specific options - map to closest equivalent

CIVILITY (subscriber.civility, spouse.civility):
- MONSIEUR
- MADAME

STATUS (subscriber.status, spouse.status):
- SALARIE
- TNS
- EXPLOITANT_AGRICOLE
- ETUDIANT
- SANS_EMPLOI
- RETRAITE
- AUTRE
```

---

### PHASE 3: CREATE FIELD DEFINITIONS

Create `admin/field-definitions/{platform}.json`.

**Process:**
1. Start with template structure
2. Add authentication fields first (login_username, login_password, login_submit)
3. Add project fields (project.name, project.plan, etc.)
4. Add subscriber fields
5. Add spouse fields (if applicable)
6. Add children fields (if repeatable)
7. Add platform-specific fields

**Validation Rules:**
- Each field MUST have: `key`, `domainKey`, `type`, `selector`, `label`
- Selectors MUST be valid CSS (test with Playwright)
- For select fields: provide either `items` array OR `option_selector_template`
- For toggle fields: provide `metadata.toggle.click_selector` and `state_on_selector`
- For dynamic fields: provide `metadata.dynamicIndex` with placeholder and indexBase

**Testing:**
Use Playwright to validate each selector works:
```javascript
mcp__playwright__browser_snapshot()  // Get page structure
// Verify ref attribute matches your selector
```

**Example Construction:**
```json
{
  "platform": "newplatform",
  "fields": [
    {
      "key": "login_username",
      "domainKey": "auth.username",
      "type": "text",
      "label": "Username",
      "selector": "#login-email",
      "required": true
    },
    {
      "key": "subscriber_lastname",
      "domainKey": "subscriber.lastName",
      "type": "text",
      "label": "Subscriber Last Name",
      "selector": "#assure-nom",
      "required": true
    },
    {
      "key": "subscriber_category",
      "domainKey": "subscriber.category",
      "type": "select",
      "label": "Socio-professional Category",
      "selector": "#categorie-select",
      "options": {
        "open_selector": "#categorie-dropdown",
        "items": [
          {
            "value": "CADRES",
            "label": "Cadres",
            "option_selector": ".dropdown-option[data-value='cadres']"
          }
        ]
      }
    }
  ]
}
```

---

### PHASE 4: CREATE UI FORM

Create `admin/carriers/{platform}.ui.json`.

**Process:**
1. Organize fields into logical sections (Project, Identity, Family)
2. Define section visibility rules (spouse, children conditional)
3. Map domain keys to lead storage paths (leadMapping)

**Section Organization Best Practices:**
- **Project Section**: project.*, plan selection, coverage options
- **Subscriber Section**: subscriber.* core fields (names, birthDate, category, regime)
- **Spouse Section**: spouse.* (visibleWhen spouse.present = true)
- **Children Section**: children[].* (repeatable, visibleWhen children.count > 0)

**Example:**
```json
{
  "carrier": "newplatform",
  "version": 1,
  "extends": "base.domain.json@2",
  "meta": {
    "name": "New Platform Name",
    "description": "Health insurance quotation form",
    "lastUpdated": "2025-10-17"
  },
  "sections": [
    {
      "id": "project",
      "title": "Project Information",
      "step": "Project",
      "fields": [
        "project.name",
        "project.dateEffet",
        "project.plan",
        "project.couverture"
      ]
    },
    {
      "id": "subscriber",
      "title": "Subscriber",
      "step": "Identity",
      "fields": [
        "subscriber.civility",
        "subscriber.lastName",
        "subscriber.firstName",
        "subscriber.birthDate",
        "subscriber.category",
        "subscriber.regime"
      ]
    }
  ],
  "leadMapping": {
    "subscriber.lastName": "adherent.nom",
    "subscriber.firstName": "adherent.prenom",
    "subscriber.birthDate": "adherent.date_naissance",
    "project.name": "projet.nom"
  }
}
```

---

### PHASE 5: CREATE AUTOMATION FLOWS

Create flow files in `admin/flows/{platform}/`.

**Recommended Flows:**
1. `{platform}_login.hl.json` - Authentication flow (reusable)
2. `{platform}_{product}_quotation.hl.json` - Full quotation process
3. `{platform}_{product}_inspect.hl.json` - Optional: result inspection

**Flow Construction Process:**
1. **Plan the flow**: Write out manual steps you'd take
2. **Map to step types**: Convert each action to a step type
3. **Add waits**: Network idles after navigation, sleeps after clicks
4. **Test selectors**: Use Playwright snapshot to verify refs
5. **Add conditionals**: Handle optional fields (spouse, children)
6. **Add error handling**: Mark optional steps appropriately

**Example Login Flow:**
```json
{
  "version": 1,
  "platform": "newplatform",
  "slug": "newplatform_login",
  "name": "New Platform - Login",
  "trace": "retain-on-failure",
  "steps": [
    {
      "type": "goto",
      "url": "https://platform.example.com/pro/login",
      "label": "navigate-login-page",
      "timeout_ms": 10000
    },
    {
      "type": "acceptConsent",
      "selector": "#cookie-accept-btn",
      "label": "accept-cookies",
      "optional": true
    },
    {
      "type": "fillField",
      "field": "login_username",
      "value": "{credentials.username}",
      "label": "fill-username"
    },
    {
      "type": "fillField",
      "field": "login_password",
      "value": "{credentials.password}",
      "label": "fill-password"
    },
    {
      "type": "clickField",
      "field": "login_submit",
      "label": "submit-login"
    },
    {
      "type": "waitForNetworkIdle",
      "timeout_ms": 5000,
      "label": "wait-login-complete"
    }
  ]
}
```

**Example Product Quotation Flow:**
```json
{
  "version": 1,
  "platform": "newplatform",
  "slug": "newplatform_health_pro",
  "name": "New Platform - Health Professional",
  "trace": "retain-on-failure",
  "steps": [
    {
      "type": "goto",
      "url": "https://platform.example.com/quotation",
      "label": "navigate-quotation"
    },
    {
      "type": "fillField",
      "domainField": "project.name",
      "value": "Simulation {lead.subscriber.lastName} {lead.subscriber.firstName}",
      "label": "fill-project-name"
    },
    {
      "type": "fillField",
      "domainField": "subscriber.lastName",
      "leadKey": "subscriber.lastName",
      "label": "fill-subscriber-lastname"
    },
    {
      "type": "fillField",
      "domainField": "subscriber.birthDate",
      "leadKey": "subscriber.birthDate",
      "label": "fill-subscriber-birthdate"
    },
    {
      "type": "selectField",
      "domainField": "subscriber.category",
      "leadKey": "subscriber.category",
      "label": "select-category"
    },
    {
      "type": "toggleField",
      "domainField": "spouse.present",
      "state": "on",
      "label": "toggle-spouse-on",
      "skipIfNot": "spouse"
    },
    {
      "type": "fillField",
      "domainField": "spouse.birthDate",
      "leadKey": "spouse.birthDate",
      "label": "fill-spouse-birthdate",
      "skipIfNot": "spouse"
    }
  ]
}
```

**Handling Repeatable Fields (Children):**
```json
{
  "type": "comment",
  "label": "Add children dynamically - note: requires loop in future"
},
{
  "type": "fillField",
  "field": "child_0_birthdate",
  "leadKey": "children[0].birthDate",
  "label": "fill-child-0-birthdate",
  "optional": true
},
{
  "type": "selectField",
  "field": "child_0_regime",
  "leadKey": "children[0].regime",
  "label": "select-child-0-regime",
  "optional": true
}
```

---

### PHASE 6: TESTING & VALIDATION

Test the complete integration.

**1. Schema Validation:**
```bash
# Validate field definitions against JSON schema
ajv validate -s admin/schemas/field-definition.schema.json -d admin/field-definitions/newplatform.json

# Validate flow against schema
ajv validate -s admin/schemas/flow.schema.json -d admin/flows/newplatform/newplatform_login.hl.json
```

**2. Flow Lint:**
```bash
# Verify all flow fields exist in field definitions
node scripts/flows/lint_flows.mjs
```

**3. Verify File Structure:**
```bash
# Check all files exist
ls -la admin/field-definitions/newplatform.json
ls -la admin/carriers/newplatform.ui.json
ls -la admin/flows/newplatform/newplatform_login.hl.json
ls -la admin/flows/newplatform/newplatform_product.hl.json

# Verify JSON is valid
cat admin/field-definitions/newplatform.json | jq .
cat admin/carriers/newplatform.ui.json | jq .
cat admin/flows/newplatform/newplatform_login.hl.json | jq .
```

---

## COMPLETE WORKFLOW CHECKLIST

Use this checklist to track progress:

### Phase 1: Reconnaissance
- [ ] Navigate to platform website with Playwright
- [ ] Identify login page and credentials requirements
- [ ] Locate quotation/tarification tool
- [ ] Screenshot all form pages (login, project, subscriber, spouse, children)
- [ ] Document all visible fields (labels + types)
- [ ] Extract CSS selectors from snapshots
- [ ] Document dropdown options
- [ ] Identify products available

### Phase 2: Data Modeling
- [ ] Create field mapping table (Platform → Domain)
- [ ] Map all fields to domain model keys
- [ ] Identify platform-specific fields (non-domain)
- [ ] Document value transformations needed
- [ ] Verify all required domain fields are covered
- [ ] Plan conditional logic (spouse, children visibility)

### Phase 3: Field Definitions
- [ ] Create `admin/field-definitions/{platform}.json`
- [ ] Add authentication fields (login_username, login_password, login_submit)
- [ ] Add project fields
- [ ] Add subscriber fields
- [ ] Add spouse fields (if applicable)
- [ ] Add children fields (if repeatable)
- [ ] Add platform-specific fields
- [ ] Add value mappings for transformed values
- [ ] Validate selectors with Playwright snapshots
- [ ] Validate JSON against schema

### Phase 4: UI Form
- [ ] Create `admin/carriers/{platform}.ui.json`
- [ ] Define meta section (name, description, lastUpdated)
- [ ] Create project section
- [ ] Create subscriber section
- [ ] Create spouse section (with visibleWhen)
- [ ] Create children section (with repeatable config)
- [ ] Add leadMapping for all fields
- [ ] Validate JSON structure

### Phase 5: Automation Flows
- [ ] Create flow directory `admin/flows/{platform}/`
- [ ] Create login flow `{platform}_login.hl.json`
- [ ] Create product flow `{platform}_{product}.hl.json`
- [ ] Plan step sequence (manual walkthrough)
- [ ] Convert to step definitions
- [ ] Add waits and network idles
- [ ] Add conditional logic (skipIfNot for spouse/children)
- [ ] Test selectors in flow with Playwright
- [ ] Validate flow JSON against schema
- [ ] Lint flow (verify field references)

### Phase 6: Testing
- [ ] Validate field definitions JSON schema
- [ ] Validate UI form JSON structure
- [ ] Validate flow JSON schema
- [ ] Lint flows (field reference check)
- [ ] Verify all files created and valid JSON
- [ ] Review field mappings for completeness
- [ ] Review flow logic and step sequence
- [ ] Verify all screenshots captured

---

## COMMON PATTERNS & SOLUTIONS

### Pattern 1: Multi-Step Forms with Navigation
```json
{
  "type": "clickField",
  "field": "next_step_button",
  "label": "click-next-step"
},
{
  "type": "waitForNetworkIdle",
  "timeout_ms": 3000,
  "label": "wait-step-load"
}
```

### Pattern 2: Dynamic Dropdowns (AJAX-loaded options)
```json
{
  "type": "clickField",
  "field": "dropdown_trigger",
  "label": "open-dropdown"
},
{
  "type": "sleep",
  "timeout_ms": 500,
  "label": "wait-options-load"
},
{
  "type": "selectField",
  "domainField": "subscriber.category",
  "leadKey": "subscriber.category",
  "label": "select-option"
}
```

### Pattern 3: Iframe Forms
```json
{
  "type": "enterFrame",
  "selector": "iframe#quotation-form",
  "label": "enter-quotation-iframe"
},
{
  "type": "fillField",
  "domainField": "subscriber.lastName",
  "leadKey": "subscriber.lastName",
  "label": "fill-lastname-in-iframe"
},
{
  "type": "exitFrame",
  "label": "exit-iframe"
}
```

### Pattern 4: Conditional Spouse Section
```json
{
  "type": "toggleField",
  "domainField": "spouse.present",
  "state": "on",
  "label": "enable-spouse-section",
  "skipIfNot": "spouse"
},
{
  "type": "fillField",
  "domainField": "spouse.birthDate",
  "leadKey": "spouse.birthDate",
  "label": "fill-spouse-birthdate",
  "skipIfNot": "spouse"
}
```

### Pattern 5: Repeatable Children (Manual Unroll)
```json
{
  "type": "clickField",
  "field": "add_child_button",
  "label": "add-child-0",
  "optional": true
},
{
  "type": "fillField",
  "field": "child_0_birthdate",
  "leadKey": "children[0].birthDate",
  "label": "fill-child-0-birthdate",
  "optional": true
},
{
  "type": "clickField",
  "field": "add_child_button",
  "label": "add-child-1",
  "optional": true
},
{
  "type": "fillField",
  "field": "child_1_birthdate",
  "leadKey": "children[1].birthDate",
  "label": "fill-child-1-birthdate",
  "optional": true
}
```

---

## KEY CONSTRAINTS & REQUIREMENTS

### Mandatory Fields
Every platform MUST have:
- Authentication fields (login_username, login_password, login_submit)
- Core subscriber fields (civility, lastName, firstName, birthDate)
- At least one product/plan field

### Naming Conventions
- Platform slug: lowercase, alphanumeric, underscores only (e.g., `newplatform`)
- Flow slug: `{platform}_{product}_{action}` (e.g., `newplatform_health_quotation`)
- Field keys: lowercase, underscores (e.g., `subscriber_lastname`)
- Domain keys: camelCase with dots (e.g., `subscriber.lastName`)

### CSS Selector Best Practices
- Prefer IDs: `#element-id`
- Use stable attributes: `[data-testid="..."]`, `[name="..."]`
- Avoid position-based: `.class:nth-child(3)` (fragile)
- Test in Playwright snapshot before finalizing

### Flow Design Principles
- One flow = One complete user journey
- Reuse login flows across products
- Add network waits after navigation/clicks
- Mark uncertain steps as `optional: true`
- Use `skipIfNot` for conditional data (spouse, children)

### Value Mapping Strategy
- Store domain values in database (e.g., "MONSIEUR")
- Transform to platform values via valueMappings (e.g., "M")
- Document transformations in field definitions
- Prefer platform-agnostic domain values

---

## ERROR HANDLING & DEBUGGING

### Common Issues

**1. Selector Not Found**
- Symptom: "Timeout waiting for selector"
- Solution: Use Playwright snapshot to verify ref attribute
- Verify element is visible (not hidden by CSS)
- Add wait before interaction if element loads dynamically

**2. Value Not Filling**
- Symptom: Field appears empty after fillField
- Solution: Add `"metadata": { "method": "jquery" }` to field definition
- Add `"triggerEvents": ["change", "blur"]` to trigger form validation

**3. Dropdown Not Selecting**
- Symptom: Option click doesn't register
- Solution: Add sleep after opening dropdown
- Verify option_selector matches actual elements
- Try option_selector_template with exact value matching

**4. Flow Stops Mid-Execution**
- Symptom: Flow exits at specific step
- Solution: Check screenshots in run artifacts
- Verify field selector is correct
- Mark step as optional if not critical
- Add waits before/after step

**5. Conditional Steps Not Executing**
- Symptom: skipIfNot not working
- Solution: Verify lead data has the conditional field
- Check field path is correct (e.g., `spouse` not `spouse.present`)
- Use skipIf with explicit condition for complex logic

### Debugging Tools

**1. Playwright Snapshots:**
```javascript
mcp__playwright__browser_snapshot()
// Returns page structure with ref attributes
// Use ref values as CSS selectors
```

**2. Flow Execution Artifacts:**
```
admin/runs-cli/{run-id}/
├── index.json           # Step results summary
├── screenshots/         # Visual proof of each step
│   ├── step-01-*.png
│   ├── step-02-*.png
│   └── error-*.png      # Error screenshots
└── progress.ndjson      # Detailed execution log
```

**3. Console Logs:**
```bash
# Run flow with visible browser
node admin/cli/run.mjs platform_flow --lead-id <id>
# Remove --headless to see browser actions in real-time
```

**4. JSON Validation:**
```bash
# Validate JSON syntax
jq empty admin/field-definitions/platform.json && echo "Valid JSON" || echo "Invalid JSON"
jq empty admin/carriers/platform.ui.json && echo "Valid JSON" || echo "Invalid JSON"
jq empty admin/flows/platform/platform_flow.hl.json && echo "Valid JSON" || echo "Invalid JSON"

# Count fields
jq '.fields | length' admin/field-definitions/platform.json

# Check flow steps
jq '.steps | length' admin/flows/platform/platform_flow.hl.json
```

---

## EXAMPLE: COMPLETE MINI-PLATFORM

Here's a minimal working example (fictional "QuickHealth" platform):

**admin/field-definitions/quickhealth.json:**
```json
{
  "platform": "quickhealth",
  "fields": [
    {
      "key": "login_email",
      "domainKey": "auth.username",
      "type": "text",
      "label": "Email",
      "selector": "#email-input",
      "required": true
    },
    {
      "key": "login_password",
      "domainKey": "auth.password",
      "type": "password",
      "label": "Password",
      "selector": "#password-input",
      "required": true
    },
    {
      "key": "login_submit",
      "domainKey": "auth.submit",
      "type": "button",
      "label": "Login Button",
      "selector": "#login-btn"
    },
    {
      "key": "subscriber_name",
      "domainKey": "subscriber.lastName",
      "type": "text",
      "label": "Last Name",
      "selector": "#lastname"
    },
    {
      "key": "subscriber_birthdate",
      "domainKey": "subscriber.birthDate",
      "type": "date",
      "label": "Birth Date",
      "selector": "#birthdate"
    },
    {
      "key": "plan_select",
      "domainKey": "project.plan",
      "type": "select",
      "label": "Plan",
      "selector": "#plan-dropdown",
      "options": {
        "open_selector": "#plan-dropdown",
        "items": [
          {
            "value": "BASIC",
            "label": "Basic Plan",
            "option_selector": ".plan-option[data-plan='basic']"
          },
          {
            "value": "PREMIUM",
            "label": "Premium Plan",
            "option_selector": ".plan-option[data-plan='premium']"
          }
        ]
      }
    }
  ]
}
```

**admin/carriers/quickhealth.ui.json:**
```json
{
  "carrier": "quickhealth",
  "version": 1,
  "extends": "base.domain.json@2",
  "meta": {
    "name": "QuickHealth",
    "description": "Simple health insurance",
    "lastUpdated": "2025-10-17"
  },
  "sections": [
    {
      "id": "project",
      "title": "Plan Selection",
      "step": "Project",
      "fields": ["project.plan"]
    },
    {
      "id": "subscriber",
      "title": "Your Information",
      "step": "Identity",
      "fields": [
        "subscriber.lastName",
        "subscriber.birthDate"
      ]
    }
  ],
  "leadMapping": {
    "subscriber.lastName": "adherent.nom",
    "subscriber.birthDate": "adherent.date_naissance",
    "project.plan": "projet.plan"
  }
}
```

**admin/flows/quickhealth/quickhealth_basic.hl.json:**
```json
{
  "version": 1,
  "platform": "quickhealth",
  "slug": "quickhealth_basic",
  "name": "QuickHealth - Basic Quotation",
  "trace": "retain-on-failure",
  "steps": [
    {
      "type": "goto",
      "url": "https://quickhealth.example.com/login",
      "label": "navigate-login"
    },
    {
      "type": "fillField",
      "field": "login_email",
      "value": "{credentials.username}",
      "label": "fill-email"
    },
    {
      "type": "fillField",
      "field": "login_password",
      "value": "{credentials.password}",
      "label": "fill-password"
    },
    {
      "type": "clickField",
      "field": "login_submit",
      "label": "submit-login"
    },
    {
      "type": "waitForNetworkIdle",
      "timeout_ms": 3000,
      "label": "wait-dashboard"
    },
    {
      "type": "goto",
      "url": "https://quickhealth.example.com/quotation",
      "label": "navigate-quotation"
    },
    {
      "type": "fillField",
      "domainField": "subscriber.lastName",
      "leadKey": "subscriber.lastName",
      "label": "fill-lastname"
    },
    {
      "type": "fillField",
      "domainField": "subscriber.birthDate",
      "leadKey": "subscriber.birthDate",
      "label": "fill-birthdate"
    },
    {
      "type": "selectField",
      "domainField": "project.plan",
      "leadKey": "project.plan",
      "label": "select-plan"
    },
    {
      "type": "clickField",
      "field": "submit_quotation",
      "label": "submit-quotation"
    }
  ]
}
```

---

## DELIVERABLES

After completing all phases, you should have created these files:

### 1. Field Definitions
**File:** `admin/field-definitions/{platform}.json`

Contains:
- Platform slug identifier
- Complete array of field definitions
- All field types (text, select, radio, toggle, etc.)
- CSS selectors for each field
- Value mappings where needed
- Metadata for dynamic/toggle fields

### 2. UI Form Structure
**File:** `admin/carriers/{platform}.ui.json`

Contains:
- Carrier metadata (name, description, version)
- Sections array (project, subscriber, spouse, children)
- Visibility conditions for conditional sections
- Repeatable configuration for children
- Lead mapping (domain → storage)

### 3. Automation Flows
**Files:** `admin/flows/{platform}/*.hl.json`

Minimum flows:
- `{platform}_login.hl.json` - Authentication flow
- `{platform}_{product}.hl.json` - Main quotation flow

Each flow contains:
- Platform slug
- Flow metadata (version, name, trace policy)
- Complete steps array with all automation actions
- Proper waits and network idle steps
- Conditional logic for spouse/children

### 4. Documentation
**Files:** Screenshots in `.playwright-mcp/` directory

- Full-page screenshots of all form pages
- Dropdown screenshots (opened state)
- Multi-step form progression
- Login page screenshot

### 5. Field Mapping Documentation
**Format:** Spreadsheet or Markdown table

Example structure:
```markdown
| Field Label | Domain Key | Field Type | CSS Selector | Required | Options |
|-------------|------------|------------|--------------|----------|---------|
| Email       | auth.username | text | #login-email | true | - |
| Category    | subscriber.category | select | #category | true | CADRES, TNS, ... |
```

### Validation Checklist
Before submitting:
- [ ] All JSON files are valid (test with `jq`)
- [ ] All JSON files pass schema validation (ajv)
- [ ] Flows reference only fields that exist in field definitions (lint passes)
- [ ] All screenshots are captured and named clearly
- [ ] Field mapping table is complete
- [ ] All selectors are documented
- [ ] All dropdown options are listed
- [ ] Conditional logic is documented
- [ ] Value transformations are noted

---

## FINAL NOTES

- **Iterative Process**: Expect to refine selectors and flows after initial testing
- **Documentation**: Screenshot everything during reconnaissance
- **Version Control**: Commit each phase separately for easier rollback
- **JSON First**: Focus on creating complete, valid JSON files
- **Incremental Flows**: Start with login flow, then add product flows one by one
- **Error Tolerance**: Use `optional: true` liberally during development, refine later
- **Field Coverage**: Ensure all fields visible in the platform are documented
- **Mapping Accuracy**: Double-check domain key mappings against base.domain.json

**Your deliverables are JSON configuration files and documentation - not database records. The JSON files will be imported into the database by someone else.**

---

## SUPPORT RESOURCES

### Schemas
- `admin/schemas/field-definition.schema.json` - Field definitions validation
- `admin/schemas/flow.schema.json` - Flow validation
- `admin/schemas/lead.schema.json` - Lead data structure

### Validation Tools
- `jq` - JSON syntax validation and querying
- `ajv-cli` - JSON schema validation
- `scripts/flows/lint_flows.mjs` - Validate flow field references (if available)

### File Locations
- Field definitions: `admin/field-definitions/{platform}.json`
- UI forms: `admin/carriers/{platform}.ui.json`
- Flows: `admin/flows/{platform}/*.hl.json`
- Screenshots: `.playwright-mcp/*.png`
- Schemas: `admin/schemas/*.schema.json`

---

**END OF PROMPT**

When executing this prompt, work methodically through each phase. Document your progress, take screenshots, and validate JSON frequently. Your goal is to create complete, valid JSON configuration files that fully describe the platform's forms and automation workflows.

Focus on:
1. **Accuracy** - Correct CSS selectors and field mappings
2. **Completeness** - All fields documented, all form steps covered
3. **Validity** - All JSON files are syntactically correct and pass schema validation
4. **Documentation** - Clear screenshots and field mapping tables

A simple platform should take 2-4 hours of focused work. Complex platforms with iframes, multi-step forms, and custom components will take longer.
