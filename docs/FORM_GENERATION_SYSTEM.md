# Documentation technique - Système de génération de formulaire

Ce document explique le fonctionnement interne du système de génération de formulaire agnostique.

## Table des matières

1. [Architecture globale](#architecture-globale)
2. [Flux de données](#flux-de-données)
3. [Modules principaux](#modules-principaux)
4. [Génération du schéma](#génération-du-schéma)
5. [Composants React](#composants-react)
6. [Système de validation](#système-de-validation)
7. [Gestion des valeurs par défaut](#gestion-des-valeurs-par-défaut)
8. [Transformation des données](#transformation-des-données)
9. [Extension du système](#extension-du-système)

---

## Architecture globale

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                    JSON Configuration Files                  │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ base.domain    │  │ field-defs   │  │ carriers.ui     │ │
│  │   .json        │  │   /*.json    │  │   /*.json       │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              formSchemaGenerator.ts                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Charge les JSON → Parse → Génère FormSchema         │  │
│  │ - classifyFields()                                    │  │
│  │ - buildFormFieldDefinition()                          │  │
│  │ - shouldShowField()                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    useFormSchema Hook                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ État: loading, error, schema                          │  │
│  │ Appelle generateFormSchema() au chargement           │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    useLeadForm Hook                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Gère l'état du formulaire (values, errors, touched) │  │
│  │ - handleFieldChange()                                 │  │
│  │ - handleFillDefaults()                                │  │
│  │ - handleSubmit()                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│               React Components (UI)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ CommonFieldsSection                                   │  │
│  │  ├─ ProjectFieldsSection                              │  │
│  │  ├─ SubscriberFieldsSection                           │  │
│  │  ├─ SpouseSection                                     │  │
│  │  └─ ChildrenSection                                   │  │
│  │                                                        │  │
│  │ PlatformSpecificSection (Alptis, SwissLife)          │  │
│  │                                                        │  │
│  │ DynamicFormField (Router)                             │  │
│  │  ├─ TextField                                          │  │
│  │  ├─ DateField                                          │  │
│  │  ├─ SelectField                                        │  │
│  │  ├─ RadioField                                         │  │
│  │  ├─ NumberField                                        │  │
│  │  └─ ToggleField                                        │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  Validation & Transformation                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ formValidation.ts → validateForm()                    │  │
│  │ formDataTransformer.ts → transformToCleanLead()      │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                     Database (SQLite)                        │
│  clean_leads table                                           │
└─────────────────────────────────────────────────────────────┘
```

### Principes de conception

1. **Data-driven**: Tout est généré depuis les fichiers JSON
2. **Agnostique**: Aucun hardcoding provider-specific dans la logique
3. **Type-safe**: TypeScript utilisé partout pour la sécurité des types
4. **Composable**: Composants atomiques réutilisables
5. **Extensible**: Nouveau provider = nouveaux JSON, pas de code

---

## Flux de données

### 1. Chargement initial

```typescript
// Dans AddLeadModal.tsx (composant parent)
const { schema, loading, error } = useFormSchema()
```

**Séquence:**
1. `useFormSchema()` s'initialise
2. Appelle `generateFormSchema()` via `useEffect`
3. Charge les 3 types de fichiers JSON
4. Parse et génère le `FormSchema`
5. Retourne `{ schema, loading: false, error: null }`

### 2. Rendu du formulaire

```typescript
// Le schema est passé aux composants
<CommonFieldsSection
  commonFields={schema.common}
  values={formState.values}
  onChange={handleFieldChange}
  errors={formState.errors}
/>
```

**Séquence:**
1. Les sections reçoivent les champs depuis `schema.common` ou `schema.platformSpecific`
2. Filtrent les champs visibles via `shouldShowField(field, values)`
3. Pour chaque champ, rendent un `<DynamicFormField>`
4. `DynamicFormField` route vers le bon composant atomique (`TextField`, `SelectField`, etc.)

### 3. Saisie utilisateur

```typescript
// Quand l'utilisateur tape dans un champ
onChange={(value) => handleFieldChange(field.domainKey, value)}
```

**Séquence:**
1. L'utilisateur modifie un champ
2. Le composant atomique appelle `onChange(newValue)`
3. `handleFieldChange(domainKey, value)` met à jour `formState.values`
4. React re-rend les composants impactés
5. Les `showIf` sont réévalués → champs apparaissent/disparaissent

### 4. Validation et soumission

```typescript
// Quand l'utilisateur clique "Créer le lead"
const errors = validateForm(schema, formState.values)
const cleanLead = transformToCleanLead(formState.values)
await window.api.leads.create(cleanLead)
```

**Séquence:**
1. `validateForm()` vérifie tous les champs visibles et requis
2. Si erreurs → affichage sous les champs
3. Si OK → `transformToCleanLead()` normalise les données
4. Appel IPC vers le main process
5. Sauvegarde en base de données SQLite

---

## Modules principaux

### formSchemaGenerator.ts

**Rôle:** Génère le schéma TypeScript depuis les fichiers JSON

**Exports principaux:**

```typescript
export interface FormFieldDefinition {
  domainKey: string          // Ex: "subscriber.firstName"
  type: FieldType            // "text" | "date" | "select" | ...
  label: string              // "Prénom"
  required: boolean
  default?: any
  options?: Array<{value: string, label: string}>
  showIf?: {
    field: string
    equals?: any
    oneOf?: any[]
  }
  platform?: 'alptis' | 'swisslifeone'
  // ... autres propriétés
}

export interface FormSchema {
  common: FormFieldDefinition[]
  platformSpecific: {
    alptis: FormFieldDefinition[]
    swisslifeone: FormFieldDefinition[]
  }
}

export function generateFormSchema(carrier?: string): FormSchema
export function shouldShowField(field: FormFieldDefinition, values: Record<string, any>): boolean
```

**Logique interne:**

```typescript
function generateFormSchema(carrier?: string): FormSchema {
  // 1. Charger les JSON
  const domainModel = baseDomainJson
  const alptisConfig = alptisConfigJson
  const swisslifeConfig = swisslifeConfigJson

  // 2. Classifier les champs
  const { common, alptis, swisslifeone } = classifyFields(
    domainModel,
    carrier
  )

  // 3. Construire les FormFieldDefinition
  const commonFields = common.map(field => buildFormFieldDefinition(field))
  const alptisFields = alptis.map(field => buildFormFieldDefinition(field, 'alptis'))
  const swisslifeFields = swisslifeone.map(field => buildFormFieldDefinition(field, 'swisslifeone'))

  // 4. Retourner le schema
  return {
    common: commonFields,
    platformSpecific: {
      alptis: alptisFields,
      swisslifeone: swisslifeFields
    }
  }
}
```

**Fonction de classification:**

```typescript
function classifyFields(domainModel, carrier?) {
  const common = []
  const alptis = []
  const swisslifeone = []

  // Parcourir tous les domaines (project, subscriber, spouse, children)
  for (const [domain, fields] of Object.entries(domainModel.domains)) {
    for (const [fieldName, fieldDef] of Object.entries(fields)) {
      const carriers = fieldDef.carriers || []

      // Classer selon le nombre de carriers
      if (carriers.length === 0 || carriers.length > 1) {
        common.push({ domain, fieldName, ...fieldDef })
      } else if (carriers[0] === 'alptis') {
        alptis.push({ domain, fieldName, ...fieldDef })
      } else if (carriers[0] === 'swisslifeone') {
        swisslifeone.push({ domain, fieldName, ...fieldDef })
      }
    }
  }

  return { common, alptis, swisslifeone }
}
```

**Fonction shouldShowField:**

```typescript
export function shouldShowField(
  field: FormFieldDefinition,
  values: Record<string, any>
): boolean {
  if (!field.showIf) {
    return true  // Pas de condition = toujours visible
  }

  const fieldValue = values[field.showIf.field]

  // Condition "equals"
  if (field.showIf.equals !== undefined) {
    return fieldValue === field.showIf.equals
  }

  // Condition "oneOf"
  if (field.showIf.oneOf !== undefined) {
    if (!fieldValue) return false
    return field.showIf.oneOf.includes(fieldValue)
  }

  return true
}
```

### defaultValueService.ts

**Rôle:** Calcule les valeurs par défaut des champs

**Exports principaux:**

```typescript
export function computeDefaultValue(
  field: FormFieldDefinition,
  currentValues?: Record<string, any>
): any

export function getAllDefaults(schema: FormSchema): Record<string, any>

export function applyDefaultsToForm(
  currentValues: Record<string, any>,
  defaults: Record<string, any>,
  options?: ApplyDefaultsOptions
): Record<string, any>
```

**Priorité des defaults (dans computeDefaultValue):**

```typescript
function computeDefaultValue(field, currentValues?) {
  // 1. HIGHEST PRIORITY: Explicit default from JSON
  if (field.default !== undefined) {
    return field.default
  }

  // 2. Default expression (today, firstOfNextMonth, etc.)
  if (field.defaultExpression) {
    return evaluateDefaultExpression(field.defaultExpression)
  }

  // 3. Disabled fields → first option
  if (field.disabled && field.options?.length > 0) {
    return field.options[0].value
  }

  // 4. Select fields → intelligent fallback
  if (field.type === 'select' && field.options?.length > 0) {
    // Préférence: SECURITE_SOCIALE > CADRES > SALARIE > AUTRE > first
    const securiteSociale = field.options.find(opt => opt.value === 'SECURITE_SOCIALE')
    if (securiteSociale) return 'SECURITE_SOCIALE'

    const cadres = field.options.find(opt => opt.value === 'CADRES')
    if (cadres) return 'CADRES'

    const salarie = field.options.find(opt => opt.value === 'SALARIE')
    if (salarie) return 'SALARIE'

    const autre = field.options.find(opt => opt.value === 'AUTRE')
    if (autre) return 'AUTRE'

    return field.options[0].value
  }

  // 5. Radio fields → first option
  if (field.type === 'radio' && field.options?.length > 0) {
    return field.options[0].value
  }

  return undefined
}
```

**Expressions de default:**

```typescript
function evaluateDefaultExpression(expression: DefaultExpression): string {
  switch (expression) {
    case 'firstOfNextMonth': {
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      nextMonth.setDate(1)
      return `01/${String(nextMonth.getMonth() + 1).padStart(2, '0')}/${nextMonth.getFullYear()}`
    }

    case 'today': {
      const today = new Date()
      return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
    }

    case 'currentMonth': {
      const now = new Date()
      return `01/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
    }
  }
}
```

### formValidation.ts

**Rôle:** Valide les données du formulaire avant soumission

**Export principal:**

```typescript
export function validateForm(
  schema: FormSchema,
  values: Record<string, any>
): Record<string, string>
```

**Logique de validation:**

```typescript
function validateForm(schema: FormSchema, values: Record<string, any>) {
  const errors: Record<string, string> = {}

  // Collecter tous les champs
  const allFields = [
    ...schema.common,
    ...schema.platformSpecific.alptis,
    ...schema.platformSpecific.swisslifeone
  ]

  // Valider chaque champ
  for (const field of allFields) {
    // Skip si le champ n'est pas visible (showIf)
    if (!shouldValidateField(field, values)) {
      continue
    }

    const error = validateField(field, values[field.domainKey], values)
    if (error) {
      errors[field.domainKey] = error
    }
  }

  return errors
}
```

**Validations par type de champ:**

```typescript
function validateField(field, value, allValues) {
  // 1. Required check
  if (field.required && !value) {
    return `${field.label} est requis`
  }

  if (!value) return null  // Champ vide mais non requis = OK

  // 2. Type-specific validations
  switch (field.type) {
    case 'text':
      if (field.validation?.minLength && value.length < field.validation.minLength) {
        return `Minimum ${field.validation.minLength} caractères`
      }
      if (field.validation?.maxLength && value.length > field.validation.maxLength) {
        return `Maximum ${field.validation.maxLength} caractères`
      }
      if (field.validation?.pattern) {
        const regex = new RegExp(field.validation.pattern)
        if (!regex.test(value)) {
          return 'Format invalide'
        }
      }
      break

    case 'number':
      const num = Number(value)
      if (isNaN(num)) {
        return 'Doit être un nombre'
      }
      if (field.validation?.min !== undefined && num < field.validation.min) {
        return `Minimum ${field.validation.min}`
      }
      if (field.validation?.max !== undefined && num > field.validation.max) {
        return `Maximum ${field.validation.max}`
      }
      break

    case 'date':
      // Validations métier basées sur le domainKey
      if (field.domainKey === 'subscriber.birthDate') {
        const age = calculateAge(value)
        if (age < 18) {
          return 'Le souscripteur doit avoir au moins 18 ans'
        }
      }
      break
  }

  // 3. Domain-specific validations
  if (field.domainKey.includes('postalCode')) {
    if (!/^\d{5}$/.test(value)) {
      return 'Code postal invalide (5 chiffres)'
    }
  }

  return null
}
```

### formDataTransformer.ts

**Rôle:** Transforme les données du formulaire vers le format de la base de données

**Export principal:**

```typescript
export function transformToCleanLead(
  formValues: Record<string, any>
): CleanLeadData
```

**Logique de transformation:**

```typescript
function transformToCleanLead(formValues) {
  // Structure de base
  const cleanLead = {
    project_name: formValues['project.name'] || '',
    date_effet: formValues['project.dateEffet'] || '',

    // Subscriber
    subscriber_civility: formValues['subscriber.civility'] || 'MONSIEUR',
    subscriber_last_name: formValues['subscriber.lastName'] || '',
    subscriber_first_name: formValues['subscriber.firstName'] || '',
    subscriber_birth_date: formValues['subscriber.birthDate'] || '',

    // Mapping intelligent pour les champs complexes
    subscriber_category: mapCategory(formValues),
    subscriber_regime: mapRegime(formValues),
    subscriber_profession: mapProfession(formValues),

    // Spouse (si présent)
    has_spouse: formValues['conjoint'] === true,
    spouse_birth_date: formValues['spouse.birthDate'] || null,

    // Children (array)
    children: extractChildren(formValues),

    // Metadata
    created_at: new Date().toISOString(),
    quality_score: 0
  }

  return cleanLead
}
```

**Mappings intelligents:**

```typescript
// Priorité: profession > status > category
function mapProfession(values) {
  // 1. Si profession SwissLife existe, utiliser
  if (values['subscriber.profession']) {
    return values['subscriber.profession']
  }

  // 2. Si status SwissLife existe, utiliser
  if (values['subscriber.status']) {
    return values['subscriber.status']
  }

  // 3. Sinon, category Alptis
  if (values['subscriber.category']) {
    return values['subscriber.category']
  }

  return 'AUTRE'
}

function extractChildren(values) {
  const children = []
  let index = 0

  // Tant qu'il y a des enfants
  while (values[`children[${index}].birthDate`]) {
    children.push({
      birth_date: values[`children[${index}].birthDate`],
      regime: values[`children[${index}].regime`] || null,
      ayant_droit: values[`children[${index}].ayantDroit`] || '1'
    })
    index++
  }

  return children
}
```

---

## Composants React

### Architecture des composants

```
AddLeadModal (container)
│
├── CommonFieldsSection
│   ├── ProjectFieldsSection
│   │   └── DynamicFormField[] (civility, lastName, firstName, birthDate, dateEffet, name)
│   │
│   ├── SubscriberFieldsSection
│   │   └── DynamicFormField[] (category, regime, postalCode, workFramework...)
│   │
│   ├── SpouseSection
│   │   ├── ToggleableSectionWrapper (avec toggle)
│   │   └── DynamicFormField[] (birthDate, regime, category, workFramework...)
│   │
│   └── ChildrenSection
│       ├── ToggleableSectionWrapper (avec toggle + add/remove)
│       └── RepeatableFieldSet[]
│           └── DynamicFormField[] (birthDate, regime, ayantDroit)
│
└── PlatformSpecificSection (Alptis)
    └── DynamicFormField[] (champs spécifiques Alptis)

└── PlatformSpecificSection (SwissLife)
    └── DynamicFormField[] (champs spécifiques SwissLife)
```

### DynamicFormField (Router)

**Rôle:** Router qui délègue au bon composant atomique selon `field.type`

```typescript
export default function DynamicFormField({
  field,
  value,
  onChange,
  error
}: DynamicFormFieldProps) {
  // Ajouter le badge platform si nécessaire
  const labelWithBadge = field.platform ? (
    <span className="flex items-center gap-2">
      {field.label}
      <PlatformBadge platform={field.platform} />
    </span>
  ) : field.label

  // Router vers le bon composant
  switch (field.type) {
    case 'text':
      return <TextField label={labelWithBadge} value={value} onChange={onChange} error={error} {...field} />

    case 'date':
      return <DateField label={labelWithBadge} value={value} onChange={onChange} error={error} {...field} />

    case 'select':
      return <SelectField label={labelWithBadge} value={value} onChange={onChange} options={field.options} error={error} {...field} />

    case 'radio':
      return <RadioField label={labelWithBadge} value={value} onChange={onChange} options={field.options} error={error} {...field} />

    case 'number':
      return <NumberField label={labelWithBadge} value={value} onChange={onChange} error={error} {...field} />

    case 'toggle':
    case 'checkbox':
      return <ToggleField label={labelWithBadge} value={value === true} onChange={onChange} error={error} {...field} />

    default:
      return null
  }
}
```

### Composants atomiques

Chaque type de champ a son composant dédié. Exemple avec `TextField`:

```typescript
export default function TextField({
  label,
  value,
  onChange,
  error,
  required = false,
  placeholder,
  disabled = false,
  inputMode = 'text',
  pattern,
  canGenerate = false,
  onGenerate
}: TextFieldProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          inputMode={inputMode}
          pattern={pattern}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          aria-required={required}
          className="..."
        />

        {canGenerate && onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            className="..."
          >
            Generate
          </button>
        )}
      </div>

      {error && (
        <p id={errorId} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
```

**Caractéristiques communes:**
- `useId()` pour générer des IDs uniques
- ARIA attributes pour l'accessibilité
- Gestion des erreurs avec `aria-describedby`
- Styling Tailwind cohérent
- Props typées avec TypeScript

### Sections organisatrices

#### SubscriberFieldsSection

```typescript
export default function SubscriberFieldsSection({
  subscriberFields,
  values,
  onChange,
  errors
}: SubscriberFieldsSectionProps) {
  // Filtrer les champs visibles
  const visibleFields = subscriberFields.filter(field =>
    shouldShowField(field, values)
  )

  if (visibleFields.length === 0) {
    return null
  }

  return (
    <div className="border rounded-lg p-3">
      <h3 className="text-sm font-semibold mb-3">
        Informations complémentaires
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visibleFields.map(field => (
          <DynamicFormField
            key={field.domainKey}
            field={field}
            value={values[field.domainKey]}
            onChange={(value) => onChange(field.domainKey, value)}
            error={errors[field.domainKey]}
          />
        ))}
      </div>
    </div>
  )
}
```

**Points clés:**
- Appelle `shouldShowField()` pour filtrer
- Layout responsive (grid 2 colonnes sur desktop)
- Passe le `onChange` avec le `domainKey`

#### SpouseSection

```typescript
export default function SpouseSection({
  spouseFields,
  values,
  onChange,
  errors,
  hasSpouse,
  onToggleSpouse
}: SpouseSectionProps) {
  // Organiser par platform
  const commonFields = spouseFields.filter(f => !f.platform)
  const alptisFields = spouseFields.filter(f => f.platform === 'alptis')
  const swisslifeFields = spouseFields.filter(f => f.platform === 'swisslifeone')

  return (
    <ToggleableSectionWrapper
      title="Conjoint"
      icon={Users}
      isActive={hasSpouse}
      onToggle={onToggleSpouse}
    >
      <div className="space-y-4">
        {/* Common fields */}
        {commonFields.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {commonFields.filter(f => shouldShowField(f, values)).map(field => (
              <DynamicFormField key={field.domainKey} field={field} ... />
            ))}
          </div>
        )}

        {/* Platform-specific fields */}
        <div className="grid grid-cols-2 gap-4">
          {/* Alptis box */}
          {alptisFields.filter(f => shouldShowField(f, values)).length > 0 && (
            <div className="border border-blue-200 rounded-lg p-3">
              <div className="text-xs font-semibold text-blue-700 mb-2">
                Alptis
              </div>
              {alptisFields.filter(f => shouldShowField(f, values)).map(field => (
                <DynamicFormField key={field.domainKey} field={field} hidePlatformBadge={true} ... />
              ))}
            </div>
          )}

          {/* SwissLife box */}
          {swisslifeFields.filter(f => shouldShowField(f, values)).length > 0 && (
            <div className="border border-purple-200 rounded-lg p-3">
              <div className="text-xs font-semibold text-purple-700 mb-2">
                SwissLife
              </div>
              {swisslifeFields.filter(f => shouldShowField(f, values)).map(field => (
                <DynamicFormField key={field.domainKey} field={field} hidePlatformBadge={true} ... />
              ))}
            </div>
          )}
        </div>
      </div>
    </ToggleableSectionWrapper>
  )
}
```

**Points clés:**
- Wrapper toggleable (active/inactive)
- Séparation visuelle Alptis/SwissLife
- `hidePlatformBadge={true}` car déjà dans une box colorée

---

## Système de validation

### Moment de validation

1. **À la soumission** (validation complète)
2. **En temps réel** (optionnel, après `onBlur`)

### Validation complète

```typescript
// Dans useLeadForm.ts
const handleSubmit = async () => {
  if (!schema) return

  // Valider tous les champs
  const errors = validateForm(schema, formState.values)

  if (Object.keys(errors).length > 0) {
    setFormState(prev => ({ ...prev, errors }))
    onError?.('Veuillez corriger les erreurs avant de continuer')
    return
  }

  // Si OK, soumettre
  const cleanLead = transformToCleanLead(formState.values)
  const result = await window.api.leads.create(cleanLead)

  if (result.success) {
    onSuccess()
  }
}
```

### Règles de validation métier

Les règles de validation métier sont appliquées selon des patterns de `domainKey`:

```typescript
// Postal code: 5 chiffres exactement
if (field.domainKey.includes('postalCode')) {
  if (!/^\d{5}$/.test(value)) {
    return 'Code postal invalide (5 chiffres)'
  }
}

// Department code: 1-3 chiffres
if (field.domainKey.includes('departmentCode')) {
  if (!/^\d{1,3}$/.test(value)) {
    return 'Code département invalide'
  }
}

// Subscriber birth date: 18+ years
if (field.domainKey === 'subscriber.birthDate') {
  const age = calculateAge(value)
  if (age < 18) {
    return 'Le souscripteur doit avoir au moins 18 ans'
  }
  if (age > 120) {
    return 'Âge invalide'
  }
}

// Project dateEffet: not in the past
if (field.domainKey === 'project.dateEffet') {
  const date = parseDate(value)
  if (date < new Date()) {
    return 'La date d\'effet ne peut pas être dans le passé'
  }
}
```

---

## Gestion des valeurs par défaut

### Bouton "Remplir par défaut"

Quand l'utilisateur clique sur ce bouton:

```typescript
const handleFillDefaults = () => {
  if (!schema) return

  // 1. Calculer tous les defaults
  const defaults = getAllDefaults(schema)

  // 2. Appliquer UNIQUEMENT aux champs vides
  const updatedValues = applyDefaultsToForm(
    formState.values,
    defaults,
    { overwrite: false }  // Ne pas écraser les valeurs existantes
  )

  // 3. Mettre à jour l'état
  setFormState(prev => ({
    ...prev,
    values: updatedValues
  }))
}
```

### Application des defaults

```typescript
function applyDefaultsToForm(currentValues, defaults, options = {}) {
  const { overwrite = false } = options
  const result = { ...currentValues }

  Object.entries(defaults).forEach(([key, value]) => {
    // Appliquer si:
    // - overwrite est true OU
    // - le champ est vide/undefined/null
    if (overwrite ||
        result[key] === undefined ||
        result[key] === '' ||
        result[key] === null) {
      result[key] = value
    }
  })

  return result
}
```

---

## Transformation des données

### Du formulaire vers la DB

```typescript
// Structure du formulaire (flat)
const formValues = {
  'project.name': 'Simulation Dupont Jean',
  'project.dateEffet': '01/02/2025',
  'subscriber.civility': 'MONSIEUR',
  'subscriber.lastName': 'Dupont',
  'subscriber.firstName': 'Jean',
  'subscriber.birthDate': '15/05/1980',
  'spouse.birthDate': '20/08/1982',
  'children[0].birthDate': '10/03/2010',
  'children[1].birthDate': '05/11/2012'
}

// Après transformation
const cleanLead = {
  project_name: 'Simulation Dupont Jean',
  date_effet: '01/02/2025',
  subscriber_civility: 'MONSIEUR',
  subscriber_last_name: 'Dupont',
  subscriber_first_name: 'Jean',
  subscriber_birth_date: '15/05/1980',
  has_spouse: true,
  spouse_birth_date: '20/08/1982',
  children: [
    { birth_date: '10/03/2010', regime: null, ayant_droit: '1' },
    { birth_date: '05/11/2012', regime: null, ayant_droit: '1' }
  ],
  created_at: '2025-01-15T10:30:00.000Z',
  quality_score: 0
}
```

### Logique de mapping intelligente

Le transformer utilise une logique de priorité pour gérer les champs qui existent dans plusieurs providers:

```typescript
// Profession: priorité SwissLife > Alptis
function mapProfession(values) {
  return values['subscriber.profession'] ||  // SwissLife
         values['subscriber.status'] ||      // SwissLife (fallback)
         values['subscriber.category'] ||    // Alptis
         'AUTRE'
}

// Régime: adapter selon la provider
function mapRegime(values) {
  return values['subscriber.regime'] || 'SECURITE_SOCIALE'
}
```

---

## Extension du système

### Ajouter un nouveau type de champ

1. **Créer le composant atomique:**

```typescript
// src/renderer/components/forms/fields/ColorField.tsx
export default function ColorField({
  label,
  value,
  onChange,
  error,
  required
}: ColorFieldProps) {
  return (
    <div className="space-y-1.5">
      <label>{label}</label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="text-red-500">{error}</p>}
    </div>
  )
}
```

2. **Ajouter dans DynamicFormField:**

```typescript
// src/renderer/components/forms/DynamicFormField.tsx
import ColorField from './fields/ColorField'

switch (field.type) {
  // ... autres cases
  case 'color':
    return <ColorField {...props} />
}
```

3. **Mettre à jour les types TypeScript:**

```typescript
// src/renderer/utils/formSchemaGenerator.ts
type FieldType = 'text' | 'date' | 'select' | 'radio' | 'number' | 'toggle' | 'color'
```

4. **Utiliser dans le JSON:**

```json
{
  "domains": {
    "project": {
      "brandColor": {
        "type": "color",
        "label": "Couleur de la marque",
        "default": "#0000FF",
        "carriers": ["nouvelle-provider"]
      }
    }
  }
}
```

### Ajouter une nouvelle validation métier

```typescript
// src/renderer/utils/formValidation.ts

// Dans validateField()
if (field.domainKey === 'subscriber.email') {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(value)) {
    return 'Email invalide'
  }
}
```

### Ajouter une nouvelle expression de default

```typescript
// src/renderer/utils/defaultValueService.ts

type DefaultExpression = 'firstOfNextMonth' | 'today' | 'currentMonth' | 'nextWeek'

function evaluateDefaultExpression(expression: DefaultExpression): string {
  switch (expression) {
    // ... cases existantes

    case 'nextWeek': {
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      return `${String(nextWeek.getDate()).padStart(2, '0')}/${String(nextWeek.getMonth() + 1).padStart(2, '0')}/${nextWeek.getFullYear()}`
    }
  }
}
```

Puis dans le JSON:

```json
{
  "rdvDate": {
    "type": "date",
    "label": "Date de RDV",
    "defaultExpression": "nextWeek"
  }
}
```

---

## Diagrammes de séquence

### Séquence complète: Chargement → Saisie → Soumission

```
User          AddLeadModal    useFormSchema    formSchemaGenerator    useLeadForm       API
│                  │                │                    │                 │              │
│  Open modal      │                │                    │                 │              │
│─────────────────>│                │                    │                 │              │
│                  │ Mount          │                    │                 │              │
│                  │───────────────>│                    │                 │              │
│                  │                │ generateFormSchema()│                 │              │
│                  │                │───────────────────>│                 │              │
│                  │                │                    │ Load JSON       │              │
│                  │                │                    │ Parse           │              │
│                  │                │                    │ Generate schema │              │
│                  │                │<───────────────────│                 │              │
│                  │ {schema}       │                    │                 │              │
│                  │<───────────────│                    │                 │              │
│                  │                │                    │                 │              │
│                  │ Initialize useLeadForm              │                 │              │
│                  │────────────────────────────────────────────────────>│              │
│                  │                │                    │                 │              │
│  Type in field   │                │                    │                 │              │
│─────────────────>│                │                    │                 │              │
│                  │ handleFieldChange(key, value)       │                 │              │
│                  │────────────────────────────────────────────────────>│              │
│                  │                │                    │                 │ Update state │
│                  │                │                    │                 │ Re-render    │
│                  │<────────────────────────────────────────────────────│              │
│                  │                │                    │                 │              │
│  Click submit    │                │                    │                 │              │
│─────────────────>│                │                    │                 │              │
│                  │ handleSubmit() │                    │                 │              │
│                  │────────────────────────────────────────────────────>│              │
│                  │                │                    │                 │ validateForm()│
│                  │                │                    │                 │ transform()  │
│                  │                │                    │                 │              │
│                  │                │                    │                 │ create(lead) │
│                  │                │                    │                 │─────────────>│
│                  │                │                    │                 │              │ Save to DB
│                  │                │                    │                 │<─────────────│
│                  │                │                    │                 │ {success}    │
│                  │<────────────────────────────────────────────────────│              │
│  Success toast   │                │                    │                 │              │
│<─────────────────│                │                    │                 │              │
```

---

## Performance et optimisations

### Optimisations actuelles

1. **Mémoïsation dans CommonFieldsSection:**
```typescript
const fieldCategories = useMemo(() => {
  const projectFields = commonFields.filter(f => f.domainKey.startsWith('project.'))
  const subscriberFields = commonFields.filter(f => f.domainKey.startsWith('subscriber.'))
  // ...
  return { projectFields, subscriberFields, ... }
}, [commonFields])
```

2. **Filtrage conditionnel (showIf):** Évite de rendre des champs inutiles

3. **Composants atomiques purs:** Pas d'effets de bord

### Optimisations recommandées

1. **Mémoïser les calculs coûteux:**
```typescript
const allSpouseFields = useMemo(() => [
  ...schema.common.filter(f => f.domainKey.startsWith('spouse.')),
  ...schema.platformSpecific.alptis.filter(f => f.domainKey.startsWith('spouse.')),
  ...schema.platformSpecific.swisslifeone.filter(f => f.domainKey.startsWith('spouse.'))
], [schema])
```

2. **useCallback pour les handlers:**
```typescript
const handleFieldChange = useCallback((key: string, value: any) => {
  setFormState(prev => ({
    ...prev,
    values: { ...prev.values, [key]: value }
  }))
}, [])
```

3. **React.memo pour les composants lourds:**
```typescript
export default React.memo(DynamicFormField, (prev, next) => {
  return prev.value === next.value && prev.error === next.error
})
```

---

## Debugging et troubleshooting

### Console logs utiles

Activer les logs de debug temporairement:

```typescript
// Dans handleFieldChange
console.log('Field changed:', { key, value, allValues: formState.values })

// Dans shouldShowField
console.log('Evaluating showIf:', { field: field.domainKey, condition: field.showIf, values })

// Dans validateForm
console.log('Validation errors:', errors)

// Dans getAllDefaults
console.log('Computed defaults:', defaults)
```

### Outils React DevTools

1. **Components tab:** Voir la hiérarchie des composants
2. **Profiler:** Mesurer les performances de rendu
3. **Hook state:** Inspecter `formState.values` en temps réel

### Erreurs communes

| Erreur | Cause | Solution |
|--------|-------|----------|
| "Field not found in domain" | domainKey incorrect | Vérifier l'orthographe dans base.domain.json |
| "showIf field not found" | Condition showIf référence un champ inexistant | Utiliser la notation complète (ex: `subscriber.status`) |
| Les defaults ne s'appliquent pas | Champs déjà remplis | Utiliser `overwrite: true` ou vider manuellement |
| Champ ne s'affiche pas | Condition showIf non remplie | Remplir le champ parent d'abord |
| Validation échoue | Règle métier stricte | Vérifier les règles dans formValidation.ts |

---

## Résumé architectural

### Principes clés

✅ **Séparation des responsabilités**
- JSON = Configuration
- Services = Logique métier
- Composants = UI pure

✅ **Unidirectionalité des données**
- JSON → Schema → State → UI
- User input → State → DB

✅ **Composabilité**
- Composants atomiques réutilisables
- Sections organisatrices
- Router centralisé (DynamicFormField)

✅ **Extensibilité**
- Nouveau provider = nouveaux JSON
- Nouveau type de champ = nouveau composant atomique
- Nouvelle validation = ajout dans validateField()

✅ **Type safety**
- TypeScript partout
- Interfaces strictes
- Validation à la compilation

---

## Références rapides

### Fichiers clés

| Fichier | Rôle | LOC |
|---------|------|-----|
| `formSchemaGenerator.ts` | Génération du schéma | ~300 |
| `defaultValueService.ts` | Calcul des defaults | ~250 |
| `formValidation.ts` | Validation des données | ~200 |
| `formDataTransformer.ts` | Transformation DB | ~150 |
| `useFormSchema.ts` | Hook de chargement | ~50 |
| `useLeadForm.ts` | Hook de gestion d'état | ~230 |
| `DynamicFormField.tsx` | Router de composants | ~120 |

### Types TypeScript principaux

```typescript
// Field definition
interface FormFieldDefinition {
  domainKey: string
  type: FieldType
  label: string
  required: boolean
  default?: any
  options?: OptionType[]
  showIf?: ShowIfCondition
  platform?: PlatformType
}

// Form schema
interface FormSchema {
  common: FormFieldDefinition[]
  platformSpecific: Record<PlatformType, FormFieldDefinition[]>
}

// Form state
interface FormState {
  values: Record<string, any>
  errors: Record<string, string>
  touched: Record<string, boolean>
  isSubmitting: boolean
}
```

---

**Dernière mise à jour:** 2025-01-15
**Version du système:** 3.0
**Auteur:** Système de documentation automatique
