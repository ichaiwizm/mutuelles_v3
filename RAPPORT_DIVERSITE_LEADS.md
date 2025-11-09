# Rapport d'Analyse - Diversité des Données Leads

**Date:** 2025-11-09
**Base de données:** dev-data/mutuelles.sqlite3
**Nombre total de leads:** 12

---

## 1. Tableau Récapitulatif des Leads

| ID (8 car.) | Nom                   | Régime             | Catégorie                           | Statut | Profession          | Conjoint | Enfants | CP    | Dpt |
|-------------|----------------------|--------------------|-------------------------------------|--------|---------------------|----------|---------|-------|-----|
| 01861431    | Ndretsa RATSIMBA     | TNS                | PROFESSIONS_LIBERALES_ET_ASSIMILES | TNS    | Artisan             | Oui      | 0       | 34725 | 34  |
| c391bf7b    | Nicolas KISS         | TNS                | PROFESSIONS_LIBERALES_ET_ASSIMILES | TNS    | Profession libérale | Oui      | 1       | 91360 | 91  |
| 4e0ccbf6    | Pierre LAURENT       | SECURITE_SOCIALE   | PROFESSIONS_LIBERALES_ET_ASSIMILES | TNS    | Profession libérale | Non      | 0       | 75008 | 75  |
| ec9ae7ed    | Xavier PINELLI       | SECURITE_SOCIALE   | PROFESSIONS_LIBERALES_ET_ASSIMILES | TNS    | Profession libérale | Non      | 0       | 13120 | 13  |
| b01b596b    | Liana NAVOYAN        | TNS                | PROFESSIONS_LIBERALES_ET_ASSIMILES | TNS    | Chef d'entreprise   | Oui      | 1       | 06000 | 06  |
| ad22ec3e    | Baptiste DESCHAMPS   | TNS                | PROFESSIONS_LIBERALES_ET_ASSIMILES | TNS    | Chef d'entreprise   | Oui      | 3       | 44300 | 44  |
| a1d8f1c5    | Emilie DELEAU        | TNS                | PROFESSIONS_LIBERALES_ET_ASSIMILES | TNS    | Profession libérale | Non      | 1       | 35230 | 35  |
| e3167c26    | Sandrine VIJOUL      | TNS                | PROFESSIONS_LIBERALES_ET_ASSIMILES | TNS    | Profession libérale | Non      | 1       | 69006 | 69  |
| 709b4fb8    | Christine DAIRE      | TNS                | PROFESSIONS_LIBERALES_ET_ASSIMILES | TNS    | Profession libérale | Non      | 0       | 59570 | 59  |
| cac4e6d2    | Mathieu BAZZI        | TNS                | PROFESSIONS_LIBERALES_ET_ASSIMILES | TNS    | Chef d'entreprise   | Non      | 3       | 06110 | 06  |
| 9bbfe9c6    | Ali DUPONT           | TNS                | PROFESSIONS_LIBERALES_ET_ASSIMILES | TNS    | Artisan             | Non      | 0       | 92100 | 92  |
| a6ae9f78    | Marion WATRAS        | TNS                | PROFESSIONS_LIBERALES_ET_ASSIMILES | TNS    | Profession libérale | Non      | 3       | 29200 | 29  |

---

## 2. Statistiques de Diversité

### 2.1 Sources des Leads
- **Email:** 12 leads (100.0%)

**Observation:** Tous les leads proviennent de l'import d'emails, aucun lead n'a été généré via le seed.

### 2.2 Régimes Obligatoires (Souscripteur)
- **TNS:** 10 leads (83.3%)
- **SECURITE_SOCIALE:** 2 leads (16.7%)
- **Diversité:** 2 régimes différents

### 2.3 Catégories Socio-Professionnelles (Souscripteur)
- **PROFESSIONS_LIBERALES_ET_ASSIMILES:** 12 leads (100.0%)
- **Diversité:** 1 catégorie (CRITIQUE)

### 2.4 Statuts Professionnels (Souscripteur)
- **TNS:** 12 leads (100.0%)
- **Diversité:** 1 statut (CRITIQUE)

### 2.5 Professions (Souscripteur)
- **Profession libérale:** 7 leads (58.3%)
- **Chef d'entreprise:** 3 leads (25.0%)
- **Artisan:** 2 leads (16.7%)
- **Diversité:** 3 professions différentes

### 2.6 Présence de Conjoint
- **Avec conjoint:** 4 leads (33.3%)
- **Sans conjoint:** 8 leads (66.7%)

#### Régimes des conjoints (pour les 4 leads avec conjoint)
- **SECURITE_SOCIALE:** 3 conjoints (75.0%)
- **TNS:** 1 conjoint (25.0%)

#### Catégories des conjoints
- **PROFESSIONS_LIBERALES_ET_ASSIMILES:** 4 conjoints (100.0%)

### 2.7 Nombre d'Enfants
- **0 enfant:** 5 leads (41.7%)
- **1 enfant:** 4 leads (33.3%)
- **3 enfants:** 3 leads (25.0%)

### 2.8 Diversité Géographique
- **Codes postaux différents:** 12 (excellente diversité)
- **Départements différents:** 11 (excellente diversité)

---

## 3. Problèmes Critiques Identifiés

### 3.1 Manque de Diversité - Catégories
**Problème:** 100% des leads ont la même catégorie socio-professionnelle (PROFESSIONS_LIBERALES_ET_ASSIMILES)

**Cause identifiée:**
- **Fichier:** `/src/shared/domain/form-metadata.ts`
- **Ligne 124:** `defaultValue: 'PROFESSIONS_LIBERALES_ET_ASSIMILES'`

Cette valeur par défaut est appliquée systématiquement lors de l'enrichissement des leads importés par email (voir `DataEnricher.enrich()` dans `/src/main/services/leadParsing/DataEnricher.ts`).

### 3.2 Manque de Diversité - Statuts
**Problème:** 100% des leads ont le même statut professionnel (TNS)

**Cause identifiée:**
- **Fichier:** `/src/shared/domain/form-metadata.ts`
- **Ligne 94:** `defaultValue: 'TNS'`

Cette valeur est également renforcée par la fonction `inferStatusFromRegime()` dans `/src/shared/businessRules/computedValues.ts` (ligne 80-82) qui définit automatiquement le statut à 'TNS' si le régime est 'TNS'.

### 3.3 Faible Diversité - Régimes
**Problème:** Seulement 2 régimes différents (TNS: 83.3%, SECURITE_SOCIALE: 16.7%)

**Observation:** La diversité est limitée car les emails importés ne contiennent probablement pas cette information de manière systématique, donc les valeurs par défaut sont appliquées.

---

## 4. Analyse du Code

### 4.1 Flux de Création des Leads par Email

1. **Parsing Email** (`src/main/services/leadParsing/`)
   - Les emails sont parsés par différents parsers (AssurProspect, Assurlead, Generic)
   - Les données extraites sont stockées dans un objet `ParsedLeadData`

2. **Enrichissement** (`DataEnricher.enrich()`)
   ```typescript
   // Ligne 313 dans DataEnricher.ts
   const defaultedFields = applyDefaults(currentValues)
   ```
   - La fonction `applyDefaults()` applique les valeurs par défaut du `formMetadata`
   - Elle remplit TOUS les champs vides avec les valeurs par défaut

3. **Application des Valeurs par Défaut** (lignes 163-191)
   ```typescript
   for (const [section, fields] of Object.entries(formMetadata)) {
     for (const [fieldName, metadata] of Object.entries(fields)) {
       if (metadata.defaultValue) {
         setIfEmpty(section, fieldName, metadata.defaultValue)
       }
     }
   }
   ```

### 4.2 Valeurs par Défaut Hardcodées

Dans `/src/shared/domain/form-metadata.ts`:

**Souscripteur:**
- `regime`: `'SECURITE_SOCIALE'` (ligne 83)
- `status`: `'TNS'` (ligne 94) ← PROBLÈME
- `profession`: `'Autre'` (ligne 112)
- `category`: `'PROFESSIONS_LIBERALES_ET_ASSIMILES'` (ligne 124) ← PROBLÈME
- `workFramework`: `'INDEPENDANT'` (ligne 133)

**Conjoint:**
- `regime`: `'SECURITE_SOCIALE'` (ligne 160)
- `status`: `'TNS'` (ligne 170) ← PROBLÈME
- `profession`: `'Autre'` (ligne 188)
- `category`: `'PROFESSIONS_LIBERALES_ET_ASSIMILES'` (ligne 200) ← PROBLÈME
- `workFramework`: `'INDEPENDANT'` (ligne 209)

### 4.3 Script de Seed (scripts/db/seeds/02_leads.mjs)

Le script de seed génère correctement des leads avec de la diversité:

```javascript
// Lignes 28-31
const REGIMES = ['SECURITE_SOCIALE', 'TNS', 'AMEXA', 'SECURITE_SOCIALE_ALSACE_MOSELLE', 'AUTRES_REGIME_SPECIAUX']
const STATUSES = ['SALARIE', 'TNS', 'EXPLOITANT_AGRICOLE', 'AUTRE']
const CATEGORIES = ['CADRES', 'NON_CADRES']
const PROFESSIONS = ['Ingénieur', 'Médecin', 'Profession libérale', 'Commerçant', 'Cadre', 'Employé', 'Ouvrier', 'Enseignant', 'Infirmier', 'Avocat']

// Lignes 131-134 - Sélection aléatoire
const regime = randomChoice(REGIMES)
const status = randomChoice(STATUSES)
const category = randomChoice(CATEGORIES)
const profession = randomChoice(PROFESSIONS)
```

**Note:** Les catégories dans le seed sont `['CADRES', 'NON_CADRES']` mais le `formMetadata` utilise des valeurs différentes comme `'PROFESSIONS_LIBERALES_ET_ASSIMILES'`. Il y a une incohérence dans les énumérations.

---

## 5. Recommandations

### 5.1 Recommandation Immédiate
**Générer des leads de test avec le seed:**

```bash
npm run db:reset:seed
```

Cela créera des leads avec une vraie diversité de régimes, statuts, catégories, etc.

### 5.2 Recommandations à Moyen Terme

#### A. Supprimer ou Rendre Optionnelles les Valeurs par Défaut pour Email Import

**Fichier:** `/src/shared/domain/form-metadata.ts`

**Option 1 - Supprimer les valeurs par défaut:**
```typescript
// Ligne 94 - Statut
status: {
  label: 'Statut',
  type: 'select' as const,
  options: [...],
  // defaultValue: 'TNS',  ← SUPPRIMER
},

// Ligne 124 - Catégorie
category: {
  label: 'Catégorie',
  type: 'select' as const,
  options: [...],
  // defaultValue: 'PROFESSIONS_LIBERALES_ET_ASSIMILES',  ← SUPPRIMER
},
```

**Option 2 - Contexte conditionnel:**
Modifier `DataEnricher.ts` pour ne pas appliquer les valeurs par défaut lors de l'import d'emails:

```typescript
function applyDefaults(values: Record<string, any>, options: { skipFields?: string[] }): string[] {
  const { skipFields = [] } = options
  const defaultedFields: string[] = []

  const setIfEmpty = (section: string, field: string, value: any) => {
    const fieldPath = `${section}.${field}`
    if (skipFields.includes(fieldPath)) return  // Skip certain fields

    if (!values[section]) values[section] = {}
    if (values[section][field] === undefined || values[section][field] === null || values[section][field] === '') {
      values[section][field] = value
      defaultedFields.push(fieldPath)
    }
  }

  // ... rest of code
}

// Then call with:
const defaultedFields = applyDefaults(currentValues, {
  skipFields: ['subscriber.status', 'subscriber.category', 'spouse.status', 'spouse.category']
})
```

#### B. Harmoniser les Énumérations

Il existe des incohérences entre les énumérations utilisées:

**Script de seed (02_leads.mjs):**
```javascript
const CATEGORIES = ['CADRES', 'NON_CADRES']
```

**Form metadata (form-metadata.ts):**
```typescript
options: [
  { value: 'CHEFS_D_ENTREPRISE', label: 'Chefs d\'entreprise' },
  { value: 'PROFESSIONS_LIBERALES_ET_ASSIMILES', label: 'Professions libérales et assimilés' },
  { value: 'ARTISANS', label: 'Artisans' },
  { value: 'COMMERCANTS_ET_ASSIMILES', label: 'Commerçants et assimilés' },
  { value: 'AGRICULTEURS_EXPLOITANTS', label: 'Agriculteurs exploitants' },
]
```

**Recommandation:** Créer un fichier d'énumérations centralisé:

```typescript
// src/shared/domain/enums.ts
export const CATEGORIES = [
  'CHEFS_D_ENTREPRISE',
  'PROFESSIONS_LIBERALES_ET_ASSIMILES',
  'ARTISANS',
  'COMMERCANTS_ET_ASSIMILES',
  'AGRICULTEURS_EXPLOITANTS'
] as const

export const STATUSES = [
  'SALARIE',
  'TNS',
  'EXPLOITANT_AGRICOLE',
  'AUTRE'
] as const

export const REGIMES = [
  'SECURITE_SOCIALE',
  'TNS',
  'AMEXA',
  'SECURITE_SOCIALE_ALSACE_MOSELLE',
  'AUTRES_REGIME_SPECIAUX'
] as const
```

Puis utiliser ces énumérations partout (seed, form-metadata, validators, etc.).

#### C. Améliorer l'Extraction des Champs depuis les Emails

**Fichier:** `/src/main/services/leadParsing/utils/FieldExtractor.ts`

Améliorer les patterns de regex pour mieux extraire:
- La catégorie socio-professionnelle (ligne 326-340)
- Le statut professionnel (ligne 345-361)

Actuellement, les patterns sont très limités et ne captent que rarement ces informations.

### 5.3 Recommandations à Long Terme

#### A. Système de Validation Pré-Import
Créer un système qui affiche un warning si trop de champs manquent lors de l'import d'un email:

```typescript
function validateParsedLead(parsedData: ParsedLeadData): ValidationResult {
  const missingCriticalFields = []

  if (!parsedData.subscriber.category?.value) {
    missingCriticalFields.push('subscriber.category')
  }
  if (!parsedData.subscriber.status?.value) {
    missingCriticalFields.push('subscriber.status')
  }

  return {
    isValid: missingCriticalFields.length < 3,
    warnings: missingCriticalFields.map(f => `Missing critical field: ${f}`)
  }
}
```

#### B. Interface de Revue Post-Import
Après l'import d'emails, afficher une liste des leads importés avec les champs qui ont été remplis par défaut, permettant à l'utilisateur de les corriger manuellement si nécessaire.

---

## 6. Résumé Exécutif

**Situation actuelle:**
- 12 leads dans la base de données, tous importés depuis des emails
- 100% ont la même catégorie (PROFESSIONS_LIBERALES_ET_ASSIMILES)
- 100% ont le même statut (TNS)
- Faible diversité de régimes (2 types seulement)

**Cause racine:**
Les valeurs par défaut hardcodées dans `form-metadata.ts` sont systématiquement appliquées lors de l'enrichissement des leads importés par email, écrasant la diversité naturelle des données.

**Impact:**
- Les tests d'intégration avec ces leads ne sont pas représentatifs de la réalité
- Les flux automatisés risquent de ne pas être testés sur tous les cas de figure
- Impossibilité de tester les variations de comportement selon la catégorie/statut

**Solution rapide:**
Exécuter `npm run db:reset:seed` pour générer des leads de test avec vraie diversité

**Solution durable:**
Revoir la stratégie d'application des valeurs par défaut pour l'import d'emails et harmoniser les énumérations à travers le codebase.
