# Guide de création des JSON pour une nouvelle provider

Ce guide explique comment configurer une nouvelle assurance (provider) dans le système de formulaire agnostique.

## Table des matières

1. [Architecture des fichiers JSON](#architecture-des-fichiers-json)
2. [Étape 1: Définir le domaine métier](#étape-1-définir-le-domaine-métier)
3. [Étape 2: Créer les field-definitions](#étape-2-créer-les-field-definitions)
4. [Étape 3: Créer la configuration UI](#étape-3-créer-la-configuration-ui)
5. [Types de champs disponibles](#types-de-champs-disponibles)
6. [Système de validations](#système-de-validations)
7. [Conditions d'affichage (showIf)](#conditions-daffichage-showif)
8. [Valeurs par défaut](#valeurs-par-défaut)
9. [Champs répétables](#champs-répétables)
10. [Bonnes pratiques](#bonnes-pratiques)

---

## Architecture des fichiers JSON

Le système repose sur une architecture en **3 couches** :

```
admin/
├── domain/
│   └── base.domain.json          # Modèle de domaine universel
├── field-definitions/
│   ├── alptis.json                # Mappings sélecteurs HTML → domainKey
│   └── swisslifeone.json          # (un par provider)
└── carriers/
    ├── alptis.ui.json             # Configuration UI et sections
    └── swisslifeone.ui.json       # (un par provider)
```

### Rôle de chaque couche

| Fichier | Rôle | Contient |
|---------|------|----------|
| **base.domain.json** | Définit le modèle métier universel | Types de champs, labels, validations, options |
| **field-definitions/*.json** | Mappe le domaine aux sélecteurs HTML | Sélecteurs CSS, actions, timeouts |
| **carriers/*.ui.json** | Organise l'interface utilisateur | Sections, ordre des champs, lead mappings |

---

## Étape 1: Définir le domaine métier

Le fichier `admin/domain/base.domain.json` contient la définition de **tous les champs** utilisés par **toutes les providers**.

### Structure générale

```json
{
  "version": 2,
  "meta": {
    "id": "health-insurance-domain",
    "title": "Domain Model - Assurance Santé",
    "lastUpdated": "2025-01-15",
    "supportedCarriers": ["alptis", "swisslifeone", "nouvelle-provider"]
  },
  "domains": {
    "project": { ... },
    "subscriber": { ... },
    "spouse": { ... },
    "children": { ... }
  }
}
```

### Les 4 domaines principaux

1. **project** : Informations sur le projet/simulation
2. **subscriber** : Données du souscripteur (assuré principal)
3. **spouse** : Données du conjoint
4. **children** : Données des enfants (champs répétables)

### Anatomie d'un champ

```json
{
  "domains": {
    "subscriber": {
      "birthDate": {
        "type": "date",
        "label": "Date de naissance",
        "format": "DD/MM/YYYY",
        "required": true,
        "carriers": ["alptis", "swisslifeone", "nouvelle-provider"],
        "notes": "Date de naissance du souscripteur principal"
      }
    }
  }
}
```

#### Propriétés obligatoires

| Propriété | Description | Exemple |
|-----------|-------------|---------|
| `type` | Type du champ | `"text"`, `"date"`, `"select"`, `"radio"`, `"number"`, `"toggle"` |
| `label` | Label affiché à l'utilisateur | `"Date de naissance"` |
| `carriers` | Liste des providers qui utilisent ce champ | `["alptis", "swisslifeone"]` |

#### Propriétés optionnelles

| Propriété | Description | Exemple |
|-----------|-------------|---------|
| `required` | Champ obligatoire | `true` ou `false` |
| `default` | Valeur par défaut statique | `"MONSIEUR"`, `true`, `75` |
| `defaultExpression` | Expression pour calculer le défaut | `"firstOfNextMonth"`, `"today"` |
| `defaultsByCarrier` | Defaults différents par provider | `{"alptis": "value1", "swisslifeone": "value2"}` |
| `disabled` | Champ non modifiable | `true` (avec un default) |
| `placeholder` | Texte d'aide dans le champ | `"Entrez votre code postal"` |
| `validations` | Règles de validation | `{"min": 1000, "max": 99999}` |
| `showIf` | Condition d'affichage | `{"field": "subscriber.status", "oneOf": ["TNS"]}` |
| `options` | Liste des options (select/radio) | `[{"value": "M", "label": "Monsieur"}]` |
| `optionSets` | Options différentes par carrier | `{"alptis": [...], "swisslifeone": [...]}` |
| `notes` | Documentation développeur | `"Ce champ impacte les tarifs..."` |
| `carrierSpecific` | Flag indiquant des comportements différents | `true` |
| `autoGenerate` | Peut être généré automatiquement | `true` |
| `template` | Template de génération | `"Simulation {subscriber.lastName}"` |

---

## Étape 2: Créer les field-definitions

Le fichier `admin/field-definitions/nouvelle-provider.json` mappe les champs du domaine vers les sélecteurs HTML du site web de la provider.

### Structure générale

```json
{
  "version": 1,
  "meta": {
    "carrier": "nouvelle-provider",
    "lastUpdated": "2025-01-15",
    "notes": "Field definitions pour Nouvelle Provider"
  },
  "fields": [
    {
      "selector": "#prenom",
      "type": "input",
      "domainKey": "subscriber.firstName",
      "waitForSelector": true,
      "timeout": 5000
    }
  ]
}
```

### Anatomie d'une field-definition

```json
{
  "selector": "#date-naissance",
  "type": "date-input",
  "domainKey": "subscriber.birthDate",
  "waitForSelector": true,
  "timeout": 5000,
  "format": "DD/MM/YYYY",
  "notes": "Champ date avec calendrier"
}
```

#### Propriétés obligatoires

| Propriété | Description | Exemple |
|-----------|-------------|---------|
| `selector` | Sélecteur CSS du champ | `"#prenom"`, `"input[name='nom']"` |
| `type` | Type d'interaction | `"input"`, `"select"`, `"click"`, `"radio"` |
| `domainKey` | Référence au champ dans base.domain.json | `"subscriber.firstName"` |

#### Propriétés optionnelles

| Propriété | Description | Exemple |
|-----------|-------------|---------|
| `waitForSelector` | Attendre que l'élément soit présent | `true` |
| `timeout` | Timeout en ms | `5000` |
| `format` | Format des données | `"DD/MM/YYYY"` |
| `clearBefore` | Vider le champ avant de remplir | `true` |
| `trigger` | Événement à déclencher après remplissage | `"change"`, `"input"` |
| `notes` | Documentation | `"Utilise un datepicker personnalisé"` |

### Types d'interaction disponibles

| Type | Description | Exemple d'utilisation |
|------|-------------|----------------------|
| `input` | Champ texte standard | Nom, prénom, email |
| `select` | Liste déroulante | Régime, statut, profession |
| `radio` | Bouton radio | Civilité (M/Mme) |
| `checkbox` | Case à cocher | Acceptation CGU |
| `click` | Bouton cliquable | Bouton de validation |
| `date-input` | Champ date | Date de naissance, date d'effet |
| `toggle` | Interrupteur ON/OFF | Oui/Non |

### Champs spéciaux

#### Champs d'authentification

```json
{
  "selector": "#username",
  "type": "input",
  "domainKey": "auth.username",
  "notes": "Credentials viennent de la table platform_credentials"
}
```

#### Champs répétables (enfants)

```json
{
  "selector": "#enfant-1-date-naissance",
  "type": "date-input",
  "domainKey": "children[0].birthDate",
  "notes": "Index dynamique basé sur children.count"
}
```

---

## Étape 3: Créer la configuration UI

Le fichier `admin/carriers/nouvelle-provider.ui.json` définit l'organisation des sections et le mapping vers la base de données.

### Structure générale

```json
{
  "version": 1,
  "meta": {
    "carrier": "nouvelle-provider",
    "name": "Nouvelle Provider",
    "description": "Configuration UI pour Nouvelle Provider",
    "lastUpdated": "2025-01-15"
  },
  "sections": {
    "project": {
      "title": "Projet",
      "order": 1,
      "fields": [
        "project.name",
        "project.dateEffet"
      ]
    },
    "subscriber": {
      "title": "Souscripteur",
      "order": 2,
      "fields": [
        "subscriber.civility",
        "subscriber.lastName",
        "subscriber.firstName"
      ]
    }
  },
  "leadMapping": {
    "project.name": "project_name",
    "subscriber.lastName": "subscriber_last_name"
  }
}
```

### Structure d'une section

```json
{
  "sections": {
    "subscriber": {
      "title": "Souscripteur",
      "order": 2,
      "description": "Informations sur l'assuré principal",
      "collapsible": true,
      "defaultExpanded": true,
      "fields": [
        "subscriber.civility",
        "subscriber.lastName",
        "subscriber.firstName",
        "subscriber.birthDate"
      ]
    }
  }
}
```

### Lead Mapping

Le `leadMapping` définit comment les champs du formulaire sont sauvegardés dans la base de données.

```json
{
  "leadMapping": {
    "project.name": "project_name",
    "project.dateEffet": "date_effet",
    "subscriber.civility": "subscriber_civility",
    "subscriber.lastName": "subscriber_last_name",
    "subscriber.firstName": "subscriber_first_name",
    "subscriber.birthDate": "subscriber_birth_date",
    "spouse.birthDate": "spouse_birth_date",
    "children[].birthDate": "child_{index}_birth_date"
  }
}
```

#### Conventions de nommage dans la DB

- Format snake_case (ex: `subscriber_last_name`)
- Préfixes par domaine : `project_`, `subscriber_`, `spouse_`
- Champs enfants : `child_{index}_` où `{index}` sera remplacé par 0, 1, 2...

---

## Types de champs disponibles

### 1. text (Champ texte)

```json
{
  "lastName": {
    "type": "text",
    "label": "Nom",
    "required": true,
    "placeholder": "Dupont",
    "validations": {
      "minLength": 2,
      "maxLength": 50,
      "pattern": "^[A-Za-zÀ-ÿ\\s-']+$"
    },
    "carriers": ["nouvelle-provider"]
  }
}
```

**Propriétés spécifiques:**
- `placeholder` : Texte d'aide
- `inputMode` : `"text"`, `"email"`, `"tel"`, `"url"`
- `pattern` : Regex de validation

### 2. date (Champ date)

```json
{
  "birthDate": {
    "type": "date",
    "label": "Date de naissance",
    "format": "DD/MM/YYYY",
    "required": true,
    "defaultExpression": "today",
    "carriers": ["nouvelle-provider"]
  }
}
```

**Propriétés spécifiques:**
- `format` : Format d'affichage (généralement `"DD/MM/YYYY"`)
- `defaultExpression` : `"today"`, `"firstOfNextMonth"`, `"currentMonth"`

### 3. select (Liste déroulante)

```json
{
  "regime": {
    "type": "select",
    "label": "Régime",
    "required": true,
    "default": "SECURITE_SOCIALE",
    "carriers": ["nouvelle-provider"],
    "options": [
      { "value": "SECURITE_SOCIALE", "label": "Sécurité sociale" },
      { "value": "ALSACE_MOSELLE", "label": "Alsace / Moselle" },
      { "value": "AMEXA", "label": "Amexa" }
    ]
  }
}
```

**OU avec options différentes par carrier:**

```json
{
  "regime": {
    "type": "select",
    "label": "Régime",
    "required": true,
    "carrierSpecific": true,
    "defaultsByCarrier": {
      "alptis": "SECURITE_SOCIALE",
      "nouvelle-provider": "REGIME_GENERAL"
    },
    "carriers": ["alptis", "nouvelle-provider"],
    "optionSets": {
      "alptis": [
        { "value": "SECURITE_SOCIALE", "label": "Sécurité sociale" }
      ],
      "nouvelle-provider": [
        { "value": "REGIME_GENERAL", "label": "Régime général" }
      ]
    }
  }
}
```

### 4. radio (Bouton radio)

```json
{
  "civility": {
    "type": "radio",
    "label": "Civilité",
    "required": true,
    "default": "MONSIEUR",
    "carriers": ["nouvelle-provider"],
    "options": [
      { "value": "MONSIEUR", "label": "Monsieur" },
      { "value": "MADAME", "label": "Madame" }
    ]
  }
}
```

### 5. number (Champ numérique)

```json
{
  "postalCode": {
    "type": "number",
    "label": "Code postal",
    "required": true,
    "carriers": ["nouvelle-provider"],
    "validations": {
      "min": 1000,
      "max": 99999
    }
  }
}
```

### 6. toggle (Interrupteur)

```json
{
  "madelin": {
    "type": "toggle",
    "label": "Loi Madelin",
    "required": false,
    "default": true,
    "carriers": ["nouvelle-provider"],
    "showIf": {
      "field": "subscriber.status",
      "oneOf": ["TNS", "EXPLOITANT_AGRICOLE"]
    }
  }
}
```

---

## Système de validations

### Validations disponibles

#### Pour les champs texte

```json
{
  "validations": {
    "minLength": 2,
    "maxLength": 50,
    "pattern": "^[A-Za-z]+$"
  }
}
```

#### Pour les champs numériques

```json
{
  "validations": {
    "min": 0,
    "max": 100
  }
}
```

#### Validations métier

Le système applique automatiquement des validations métier selon le `domainKey`:

| Pattern domainKey | Validation appliquée |
|-------------------|---------------------|
| `*.birthDate` | Âge entre 0 et 120 ans |
| `subscriber.birthDate` | Âge minimum 18 ans |
| `spouse.birthDate` | Âge minimum 18 ans |
| `children[].birthDate` | Âge maximum 25 ans |
| `*postalCode*` | 5 chiffres exactement |
| `*departmentCode*` | 1 à 3 chiffres |

### Personnaliser les validations

Pour ajouter une validation custom, modifier `src/renderer/utils/formValidation.ts`:

```typescript
// Ajouter dans validateField()
if (field.domainKey.includes('votre-champ-special')) {
  if (value.length !== 10) {
    return 'Doit contenir exactement 10 caractères'
  }
}
```

---

## Conditions d'affichage (showIf)

Le système `showIf` permet d'afficher un champ uniquement si une condition est remplie.

### Syntaxe `equals` (égalité simple)

```json
{
  "spouse": {
    "birthDate": {
      "type": "date",
      "label": "Date de naissance du conjoint",
      "showIf": {
        "field": "spouse.present",
        "equals": true
      }
    }
  }
}
```

**Affiche le champ seulement si `spouse.present === true`**

### Syntaxe `oneOf` (valeur dans une liste)

```json
{
  "subscriber": {
    "workFramework": {
      "type": "radio",
      "label": "Cadre d'exercice",
      "showIf": {
        "field": "subscriber.category",
        "oneOf": [
          "CHEFS_D_ENTREPRISE",
          "PROFESSIONS_LIBERALES_ET_ASSIMILES",
          "ARTISANS",
          "COMMERCANTS_ET_ASSIMILES"
        ]
      },
      "options": [
        { "value": "SALARIE", "label": "Salarié" },
        { "value": "INDEPENDANT", "label": "Indépendant" }
      ]
    }
  }
}
```

**Affiche le champ seulement si `subscriber.category` est dans la liste**

### Règles importantes

1. Le champ référencé dans `"field"` doit exister dans le domaine
2. La condition est évaluée en temps réel lors de la saisie
3. Si la condition devient fausse, le champ disparaît ET sa valeur est supprimée
4. Les validations ne s'appliquent que si le champ est visible

---

## Valeurs par défaut

### 1. Valeur statique simple

```json
{
  "default": "MONSIEUR"
}
```

### 2. Valeur par expression

```json
{
  "defaultExpression": "firstOfNextMonth"
}
```

**Expressions disponibles:**
- `"today"` : Date du jour (DD/MM/YYYY)
- `"firstOfNextMonth"` : 1er jour du mois prochain (DD/MM/YYYY)
- `"currentMonth"` : 1er jour du mois en cours (DD/MM/YYYY)

### 3. Valeur différente par carrier

```json
{
  "defaultsByCarrier": {
    "alptis": "SECURITE_SOCIALE",
    "swisslifeone": "TNS",
    "nouvelle-provider": "REGIME_GENERAL"
  }
}
```

### 4. Valeur calculée dynamiquement

Pour une logique plus complexe, modifier `src/renderer/utils/defaultValueService.ts`:

```typescript
// Dans computeDefaultValue()
if (field.domainKey === 'votre.champ' && currentValues) {
  const autreChamp = currentValues['autre.champ']
  if (autreChamp === 'CONDITION') {
    return 'VALEUR_CALCULEE'
  }
  return 'VALEUR_PAR_DEFAUT'
}
```

### 5. Champ disabled avec valeur fixe

```json
{
  "ij": {
    "type": "toggle",
    "label": "Indemnités journalières",
    "default": false,
    "disabled": true,
    "notes": "Figé à NON (non modifiable)"
  }
}
```

---

## Champs répétables

Pour les champs qui se répètent (enfants, bénéficiaires, etc.), utiliser la notation `[]`.

### Dans base.domain.json

```json
{
  "children": {
    "[]": {
      "birthDate": {
        "type": "date",
        "label": "Date de naissance",
        "format": "DD/MM/YYYY",
        "required": false,
        "repeat": {
          "countField": "children.count"
        },
        "showIf": {
          "field": "children.present",
          "equals": true
        },
        "carriers": ["nouvelle-provider"]
      }
    }
  }
}
```

**Propriétés importantes:**
- `repeat.countField` : Champ contenant le nombre d'occurrences
- La notation `[]` indique un champ répétable
- Dans le formulaire, sera référencé comme `children[0].birthDate`, `children[1].birthDate`, etc.

### Dans field-definitions

```json
{
  "selector": "#enfant-1-date-naissance",
  "type": "date-input",
  "domainKey": "children[0].birthDate"
},
{
  "selector": "#enfant-2-date-naissance",
  "type": "date-input",
  "domainKey": "children[1].birthDate"
}
```

### Dans carriers UI

```json
{
  "sections": {
    "children": {
      "title": "Enfants",
      "order": 4,
      "repeatable": true,
      "fields": [
        "children[].birthDate",
        "children[].regime"
      ]
    }
  },
  "leadMapping": {
    "children[].birthDate": "child_{index}_birth_date",
    "children[].regime": "child_{index}_regime"
  }
}
```

---

## Bonnes pratiques

### 1. Nommage des domainKeys

**✅ Bon:**
```
subscriber.firstName
subscriber.birthDate
project.dateEffet
spouse.regime
children[].birthDate
```

**❌ Mauvais:**
```
prenom
date_naissance
dateEffet
regimeConjoint
enfant1DateNaissance
```

**Conventions:**
- Format camelCase
- Préfixe par domaine (project, subscriber, spouse, children)
- Notation `[]` pour les champs répétables
- Anglais pour les propriétés techniques, français pour les valeurs métier

### 2. Organisation des sections

**Ordre recommandé:**
1. Project (informations générales)
2. Subscriber (souscripteur)
3. Spouse (conjoint - optionnel)
4. Children (enfants - optionnel)
5. Platform-specific fields (champs spécifiques)

### 3. Documentation

Toujours remplir les `notes` pour documenter:
- L'usage métier du champ
- Les particularités techniques
- Les impacts sur d'autres champs
- Les règles de gestion

```json
{
  "madelin": {
    "type": "toggle",
    "label": "Loi Madelin",
    "notes": "Option Loi Madelin: permet la déductibilité fiscale des cotisations pour les TNS (Travailleurs Non Salariés). Champ critique pour les indépendants. Visible uniquement si statut = TNS ou EXPLOITANT_AGRICOLE."
  }
}
```

### 4. Gestion des carriers

**Ajouter un champ existant à votre provider:**
```json
{
  "subscribers": {
    "birthDate": {
      "carriers": ["alptis", "swisslifeone", "nouvelle-provider"]
    }
  }
}
```

**Créer un champ spécifique à votre provider:**
```json
{
  "project": {
    "numeroContrat": {
      "type": "text",
      "label": "Numéro de contrat",
      "required": false,
      "carriers": ["nouvelle-provider"],
      "notes": "Spécifique à Nouvelle Provider"
    }
  }
}
```

### 5. Tests de cohérence

Avant de déployer, vérifier:

- [ ] Tous les `domainKey` dans field-definitions existent dans base.domain.json
- [ ] Tous les champs de carriers UI existent dans base.domain.json
- [ ] Les `showIf.field` référencent des champs existants
- [ ] Les `repeat.countField` référencent des champs numériques existants
- [ ] Les `carriers` incluent bien votre provider partout où nécessaire
- [ ] Le leadMapping couvre tous les champs à sauvegarder

### 6. Validation manuelle

Pour tester votre configuration:

1. Lancer l'application en mode dev
2. Ouvrir le formulaire de lead
3. Vérifier que tous les champs s'affichent
4. Tester les conditions showIf
5. Cliquer sur "Remplir par défaut" pour tester les defaults
6. Soumettre le formulaire et vérifier les données en DB

---

## Checklist complète pour ajouter une nouvelle provider

### Étape 1: base.domain.json
- [ ] Ajouter `"nouvelle-provider"` dans `meta.supportedCarriers`
- [ ] Pour chaque champ à utiliser, ajouter `"nouvelle-provider"` dans `carriers`
- [ ] Créer les champs spécifiques à cette provider si nécessaire
- [ ] Définir les defaults appropriés
- [ ] Configurer les showIf si nécessaire

### Étape 2: field-definitions/nouvelle-provider.json
- [ ] Créer le fichier avec la structure de base
- [ ] Mapper tous les champs vers les sélecteurs HTML du site
- [ ] Définir les types d'interaction corrects
- [ ] Configurer les timeouts si nécessaire
- [ ] Documenter les champs complexes

### Étape 3: carriers/nouvelle-provider.ui.json
- [ ] Créer le fichier avec la structure de base
- [ ] Définir les sections et leur ordre
- [ ] Lister tous les champs par section
- [ ] Créer le leadMapping complet
- [ ] Vérifier la cohérence avec base.domain.json

### Étape 4: Code TypeScript (modifications minimales)
- [ ] Ajouter l'import dans `formSchemaGenerator.ts`
- [ ] Ajouter le type dans les unions TypeScript
- [ ] Ajouter l'entrée dans `PlatformBadge.tsx`
- [ ] Ajouter l'entrée dans `PlatformSpecificSection.tsx`

### Étape 5: Tests
- [ ] Le formulaire se génère sans erreur
- [ ] Tous les champs sont visibles
- [ ] Les defaults fonctionnent
- [ ] Les showIf fonctionnent
- [ ] La validation fonctionne
- [ ] La sauvegarde en DB fonctionne

---

## Exemples complets

### Exemple 1: Provider simple avec champs communs

**base.domain.json** (ajouter votre provider):
```json
{
  "meta": {
    "supportedCarriers": ["alptis", "swisslifeone", "exemple-simple"]
  },
  "domains": {
    "subscriber": {
      "lastName": {
        "carriers": ["alptis", "swisslifeone", "exemple-simple"]
      },
      "firstName": {
        "carriers": ["alptis", "swisslifeone", "exemple-simple"]
      }
    }
  }
}
```

**field-definitions/exemple-simple.json**:
```json
{
  "version": 1,
  "meta": {
    "carrier": "exemple-simple",
    "lastUpdated": "2025-01-15"
  },
  "fields": [
    {
      "selector": "#nom",
      "type": "input",
      "domainKey": "subscriber.lastName",
      "waitForSelector": true
    },
    {
      "selector": "#prenom",
      "type": "input",
      "domainKey": "subscriber.firstName",
      "waitForSelector": true
    }
  ]
}
```

**carriers/exemple-simple.ui.json**:
```json
{
  "version": 1,
  "meta": {
    "carrier": "exemple-simple",
    "name": "Exemple Simple"
  },
  "sections": {
    "subscriber": {
      "title": "Assuré",
      "order": 1,
      "fields": [
        "subscriber.lastName",
        "subscriber.firstName"
      ]
    }
  },
  "leadMapping": {
    "subscriber.lastName": "subscriber_last_name",
    "subscriber.firstName": "subscriber_first_name"
  }
}
```

### Exemple 2: Provider avec champs spécifiques

**base.domain.json**:
```json
{
  "domains": {
    "project": {
      "numeroAdhesion": {
        "type": "text",
        "label": "Numéro d'adhésion",
        "required": false,
        "carriers": ["exemple-specifique"],
        "notes": "Champ unique à cette provider"
      }
    }
  }
}
```

Puis suivre les mêmes étapes que l'exemple 1.

---

## Support et dépannage

### Erreur: "Field not found in domain"

**Cause:** Un champ référencé dans field-definitions ou carriers UI n'existe pas dans base.domain.json

**Solution:**
1. Vérifier l'orthographe du domainKey
2. Ajouter le champ dans base.domain.json
3. S'assurer que votre provider est dans la liste `carriers`

### Erreur: "showIf field not found"

**Cause:** Le champ référencé dans `showIf.field` n'existe pas

**Solution:**
1. Vérifier que le champ existe dans base.domain.json
2. Utiliser la notation complète (ex: `subscriber.status` et non `status`)

### Les defaults ne s'appliquent pas

**Cause:** Le bouton "Remplir par défaut" n'applique que les champs vides

**Solution:**
1. Vérifier que `default` ou `defaultExpression` est défini
2. Vider le champ manuellement ou cocher `overwrite: true`

### Les champs ne s'affichent pas

**Cause:** Plusieurs possibilités

**Solutions:**
1. Vérifier que votre provider est dans `carriers`
2. Vérifier les conditions `showIf`
3. Vérifier l'ordre des champs dans carriers UI
4. Regarder la console navigateur pour les erreurs

---

## Ressources

- **Code source:** `/src/renderer/utils/formSchemaGenerator.ts`
- **Validations:** `/src/renderer/utils/formValidation.ts`
- **Defaults:** `/src/renderer/utils/defaultValueService.ts`
- **Composants:** `/src/renderer/components/forms/`

---

**Dernière mise à jour:** 2025-01-15
**Version du guide:** 1.0
**Auteur:** Système de documentation automatique
