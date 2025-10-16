# Add New Insurance Platform - Configuration Guide

## Your Mission

Create JSON configuration files for a new insurance platform by analyzing its website with MCP Playwright.

**What you'll deliver:** 3 JSON files + screenshots
**What you won't touch:** Existing files, database, or code

---

## What This System Does

This is an automated insurance quotation system that:
- Uses **MCP Playwright** to fill forms on insurance websites
- Stores configuration in **JSON files** (not code)
- Maps platform-specific fields to a **universal domain model**

You're adding a new platform to the system by creating its configuration files.

---

## The 3 Files You'll Create

### 1. Field Definitions (`admin/field-definitions/{platformname}.json`)

Maps every field on the platform's website to the universal domain model.

**Example:**
```json
{
  "platform": "newplatform",
  "fields": [
    {
      "key": "login_email",
      "domainKey": "auth.username",
      "type": "text",
      "selector": "#email-input",
      "label": "Email",
      "required": true
    },
    {
      "key": "category_select",
      "domainKey": "subscriber.category",
      "type": "select",
      "selector": "#category-dropdown",
      "label": "Professional Category",
      "options": {
        "open_selector": "#category-btn",
        "items": [
          { "value": "CADRES", "label": "Cadres", "option_selector": ".option-cadres" }
        ]
      }
    }
  ]
}
```

### 2. UI Form (`admin/carriers/{platformname}.ui.json`)

Organizes fields into sections for the user interface.

**Example:**
```json
{
  "carrier": "newplatform",
  "version": 1,
  "extends": "base.domain.json@2",
  "meta": {
    "name": "New Platform Name",
    "description": "Health insurance quotation",
    "lastUpdated": "2025-10-17"
  },
  "sections": [
    {
      "id": "subscriber",
      "title": "Your Information",
      "fields": ["subscriber.lastName", "subscriber.birthDate", "subscriber.category"]
    }
  ],
  "leadMapping": {
    "subscriber.lastName": "adherent.nom",
    "subscriber.birthDate": "adherent.date_naissance"
  }
}
```

### 3. Automation Flows (`admin/flows/{platformname}/*.hl.json`)

Step-by-step browser automation scripts.

**Example:**
```json
{
  "version": 1,
  "platform": "newplatform",
  "slug": "newplatform_login",
  "name": "New Platform - Login",
  "steps": [
    {
      "type": "goto",
      "url": "https://platform.com/login",
      "label": "navigate-login"
    },
    {
      "type": "fillField",
      "field": "login_email",
      "value": "{credentials.username}",
      "label": "fill-email"
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
    }
  ]
}
```

---

## How to Extract Information with MCP Playwright

### Step 1: Navigate & Screenshot

```javascript
mcp__playwright__browser_navigate({ url: "https://platform.com/login" })
mcp__playwright__browser_take_screenshot({
  fullPage: true,
  filename: "platform_login.png"
})
```

### Step 2: Get Field Structure (Snapshot)

```javascript
mcp__playwright__browser_snapshot()
```

**Returns YAML like:**
```yaml
- textbox "Email:" [ref=e15]: ""
- textbox "Password:" [ref=e18]: ""
- button "Sign In" [ref=e21]
- combobox "Category" [ref=e30]:
  - option "Cadres" [selected]
```

**Key info:** Field type, label, ref (for clicking)

### Step 3: Get CSS Selectors (JavaScript)

```javascript
mcp__playwright__browser_evaluate({
  function: `() => {
    const fields = Array.from(document.querySelectorAll('input, select, button'));
    return fields.map(f => ({
      type: f.type,
      id: f.id,
      name: f.name,
      selector: f.id ? '#' + f.id : '[name="' + f.name + '"]',
      label: f.labels?.[0]?.textContent || f.placeholder || ''
    }));
  }`
})
```

**Returns:** CSS selectors, IDs, names for each field

### Step 4: Get Dropdown Options

```javascript
mcp__playwright__browser_evaluate({
  function: `() => {
    return Array.from(document.querySelectorAll('select')).map(s => ({
      name: s.name,
      id: s.id,
      options: Array.from(s.options).map(o => ({
        value: o.value,
        text: o.textContent.trim()
      }))
    }));
  }`
})
```

### Step 5: Interact & Explore

For custom dropdowns or multi-page forms:

```javascript
// Click dropdown
mcp__playwright__browser_click({ element: "Category dropdown", ref: "e30" })

// Wait for options to appear
mcp__playwright__browser_wait_for({ time: 1 })

// Snapshot again to see options
mcp__playwright__browser_snapshot()

// Navigate to next page
mcp__playwright__browser_click({ element: "Next button", ref: "e45" })
```

---

## Domain Model Reference

Map platform fields to these universal keys:

### Authentication
- `auth.username` - Login email/username
- `auth.password` - Login password

### Project
- `project.name` - Simulation name
- `project.plan` - Product/plan name
- `project.dateEffet` - Start date (DD/MM/YYYY)

### Subscriber
- `subscriber.civility` - "MONSIEUR" | "MADAME"
- `subscriber.lastName` - Last name
- `subscriber.firstName` - First name
- `subscriber.birthDate` - Birth date (DD/MM/YYYY)
- `subscriber.category` - Professional category (see values below)
- `subscriber.regime` - Social security regime

### Spouse (optional)
- `spouse.present` - true/false toggle
- `spouse.firstName`, `spouse.lastName`, `spouse.birthDate` - Same as subscriber

### Children (array, repeatable)
- `children[].birthDate` - Child birth date
- `children[].regime` - Child's regime
- `children[].ayantDroit` - "1" (subscriber) | "2" (spouse)

### Category Values
```
AGRICULTEURS_EXPLOITANTS, ARTISANS, CADRES, COMMERCANTS, EMPLOYES,
FONCTIONNAIRES, PROFESSIONS_INTERMEDIAIRES, PROFESSIONS_LIBERALES,
RETRAITES, SANS_ACTIVITE, TNS
```

---

## Field Types Reference

### Text Fields
```json
{
  "key": "subscriber_lastname",
  "domainKey": "subscriber.lastName",
  "type": "text",
  "selector": "#lastname-input",
  "label": "Last Name",
  "required": true
}
```

### Select Dropdowns (Native)
```json
{
  "key": "category_select",
  "domainKey": "subscriber.category",
  "type": "select",
  "selector": "#category",
  "options": {
    "items": [
      { "value": "CADRES", "label": "Cadres", "option_selector": "option[value='CADRES']" }
    ]
  }
}
```

### Custom Dropdowns
```json
{
  "key": "regime_dropdown",
  "domainKey": "subscriber.regime",
  "type": "select",
  "selector": "#regime-field",
  "options": {
    "open_selector": "#regime-trigger-btn",
    "option_selector_template": ".dropdown-item:has-text('{{value}}')"
  }
}
```

### Radio Buttons
```json
{
  "key": "civility_radio",
  "domainKey": "subscriber.civility",
  "type": "radio-group",
  "options": [
    { "value": "MONSIEUR", "label": "Monsieur", "selector": "#civility-m" },
    { "value": "MADAME", "label": "Madame", "selector": "#civility-f" }
  ]
}
```

### Toggles/Checkboxes
```json
{
  "key": "spouse_toggle",
  "domainKey": "spouse.present",
  "type": "toggle",
  "label": "Add spouse",
  "metadata": {
    "toggle": {
      "click_selector": "#spouse-toggle-btn",
      "state_on_selector": "#spouse-toggle.active"
    }
  }
}
```

### Repeatable Fields (Children)
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

---

## Flow Step Types

### Navigation
```json
{ "type": "goto", "url": "https://...", "label": "navigate-to-page" }
{ "type": "waitForNetworkIdle", "timeout_ms": 5000, "label": "wait-for-load" }
{ "type": "sleep", "timeout_ms": 1000, "label": "pause" }
```

### Form Filling
```json
{ "type": "fillField", "field": "login_email", "value": "{credentials.username}", "label": "fill-email" }
{ "type": "fillField", "domainField": "subscriber.lastName", "leadKey": "subscriber.lastName", "label": "fill-lastname" }
{ "type": "selectField", "domainField": "subscriber.category", "leadKey": "subscriber.category", "label": "select-category" }
{ "type": "toggleField", "domainField": "spouse.present", "state": "on", "label": "enable-spouse" }
```

### Interaction
```json
{ "type": "clickField", "field": "submit_btn", "label": "click-submit" }
{ "type": "pressKey", "key": "Enter", "label": "press-enter" }
```

### Conditionals
```json
{
  "type": "fillField",
  "domainField": "spouse.birthDate",
  "leadKey": "spouse.birthDate",
  "skipIfNot": "spouse",
  "optional": true,
  "label": "fill-spouse-birthdate"
}
```

**`skipIfNot`**: Skip this step if lead doesn't have this field
**`optional`**: Don't fail the flow if this step fails

---

## Workflow Summary

**1. Explore the website**
- Navigate with Playwright
- Take screenshots
- Use snapshot + evaluate to extract all fields

**2. Map to domain model**
- Match platform fields to domain keys
- Note any platform-specific fields
- Document dropdown options

**3. Create field definitions JSON**
- One entry per field
- Include CSS selectors
- Add options for selects

**4. Create UI form JSON**
- Organize fields into sections
- Add visibility conditions (spouse, children)
- Map to storage keys

**5. Create automation flows JSON**
- Login flow (reusable)
- Product flow (main quotation)
- Test selectors are correct

**6. Validate**
```bash
jq . admin/field-definitions/platform.json  # Check JSON valid
ajv validate -s admin/schemas/field-definition.schema.json -d admin/field-definitions/platform.json
```

---

## What You Can Customize

✅ **Field organization** - Organize sections however makes sense
✅ **Flow structure** - Break into multiple flows if needed
✅ **Selector strategy** - Use IDs, names, classes, whatever works
✅ **Error handling** - Add optional/skipIfNot as needed
✅ **Value mappings** - Transform platform values to domain values
✅ **Field naming** - Use descriptive keys

**Just ensure:**
- All JSON is valid
- Domain keys match the universal model
- CSS selectors work
- Flow steps reference existing fields

---

## Important Rules

**DO:**
- ✅ Create new files only
- ✅ Use MCP Playwright to extract data
- ✅ Map to the universal domain model
- ✅ Test selectors before finalizing
- ✅ Take screenshots for documentation
- ✅ Validate JSON syntax

**DON'T:**
- ❌ Modify existing files
- ❌ Change the domain model (base.domain.json)
- ❌ Insert into database
- ❌ Modify application code
- ❌ Use hardcoded credentials in files

---

## Your Deliverables

Create these new files:

### 1. `admin/field-definitions/{platform}.json`
Complete mapping of all form fields

### 2. `admin/carriers/{platform}.ui.json`
UI organization and section structure

### 3. `admin/flows/{platform}/{platform}_login.hl.json`
Authentication flow

### 4. `admin/flows/{platform}/{platform}_{product}.hl.json`
Main quotation flow(s)

### 5. Screenshots (`.playwright-mcp/*.png`)
Visual documentation of all pages

### 6. Field mapping table (Markdown/Excel)
Summary of all fields with selectors and domain keys

---

## Example: Complete Minimal Platform

**admin/field-definitions/simple.json:**
```json
{
  "platform": "simple",
  "fields": [
    {
      "key": "login_email",
      "domainKey": "auth.username",
      "type": "text",
      "selector": "#email",
      "label": "Email",
      "required": true
    },
    {
      "key": "login_password",
      "domainKey": "auth.password",
      "type": "password",
      "selector": "#password",
      "required": true
    },
    {
      "key": "login_submit",
      "domainKey": "auth.submit",
      "type": "button",
      "selector": "#login-btn"
    },
    {
      "key": "subscriber_name",
      "domainKey": "subscriber.lastName",
      "type": "text",
      "selector": "#name",
      "label": "Name"
    }
  ]
}
```

**admin/carriers/simple.ui.json:**
```json
{
  "carrier": "simple",
  "version": 1,
  "extends": "base.domain.json@2",
  "meta": {
    "name": "Simple Platform",
    "description": "Minimal example",
    "lastUpdated": "2025-10-17"
  },
  "sections": [
    {
      "id": "subscriber",
      "title": "Your Info",
      "fields": ["subscriber.lastName"]
    }
  ],
  "leadMapping": {
    "subscriber.lastName": "adherent.nom"
  }
}
```

**admin/flows/simple/simple_login.hl.json:**
```json
{
  "version": 1,
  "platform": "simple",
  "slug": "simple_login",
  "name": "Simple - Login",
  "steps": [
    {
      "type": "goto",
      "url": "https://simple.com/login",
      "label": "navigate"
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
      "label": "submit"
    }
  ]
}
```

---

## Validation Commands

```bash
# Check JSON syntax
jq . admin/field-definitions/platform.json
jq . admin/carriers/platform.ui.json
jq . admin/flows/platform/platform_login.hl.json

# Validate against schemas
ajv validate -s admin/schemas/field-definition.schema.json -d admin/field-definitions/platform.json
ajv validate -s admin/schemas/flow.schema.json -d admin/flows/platform/platform_login.hl.json

# Verify files exist
ls -la admin/field-definitions/platform.json
ls -la admin/carriers/platform.ui.json
ls -la admin/flows/platform/
```

---

## Tips

- **Start simple**: Get login working first, then add complexity
- **Test selectors**: Use Playwright snapshot to verify selectors exist
- **Screenshot everything**: Visual documentation helps debugging
- **Use optional liberally**: Mark uncertain steps as optional during development
- **Iterate**: First pass doesn't need to be perfect
- **Document quirks**: Note any platform-specific behavior in comments

---

## Support Resources

**Schemas for validation:**
- `admin/schemas/field-definition.schema.json`
- `admin/schemas/flow.schema.json`
- `admin/schemas/lead.schema.json`

**Reference the domain model:**
- `admin/domain/base.domain.json`

**Look at existing examples:**
- `admin/field-definitions/alptis.json`
- `admin/carriers/swisslifeone.ui.json`
- `admin/flows/alptis/alptis_login.hl.json`

---

**Ready? Start by navigating to the platform's website with MCP Playwright and extracting field information!**
