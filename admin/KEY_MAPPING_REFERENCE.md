# Table de Mapping - Normalisation des Clés

**Date de création :** 2025-10-10
**Objectif :** Uniformiser les clés entre Flows, Field Definitions et Leads DB

---

## 📐 Règles Générales

### Convention de nommage
- **Format** : camelCase
- **Dates** : DD/MM/YYYY (format français)
- **Structure** : Alignée sur la base de données

### Structure cible (Leads DB)
```json
{
  "contact": { "civilite", "nom", "prenom", "telephone", "email", "adresse", "codePostal", "ville" },
  "souscripteur": { "dateNaissance", "profession", "regimeSocial", "nombreEnfants", "categorie", "statut" },
  "conjoint": { "civilite", "prenom", "nom", "dateNaissance", "profession", "regimeSocial", "statut" },
  "enfants": [{ "dateNaissance", "sexe", "regime", "ayantDroit" }],
  "besoins": { "dateEffet", "madelin", "niveaux": { ... } }
}
```

---

## 🔄 Table de Mapping Complète

### Section CONTACT (Informations d'identité)

| Clé actuelle (flows) | Clé normalisée (DB) | Transformation | Statut DB | Notes |
|----------------------|---------------------|----------------|-----------|-------|
| `adherent.civilite` | `contact.civilite` | Déplacement de section | ✅ Existe | Donnée d'identité générale |
| `adherent.nom` | `contact.nom` | Déplacement de section | ✅ Existe | Donnée d'identité générale |
| `adherent.prenom` | `contact.prenom` | Déplacement de section | ✅ Existe | Donnée d'identité générale |
| `adherent.code_postal` | `contact.codePostal` | Déplacement + camelCase | ✅ Existe | Donnée de localisation |
| N/A | `contact.telephone` | - | ✅ Existe | Non utilisé dans flows actuels |
| N/A | `contact.email` | - | ✅ Existe | Non utilisé dans flows actuels |
| N/A | `contact.adresse` | - | ✅ Existe | Non utilisé dans flows actuels |
| N/A | `contact.ville` | - | ✅ Existe | Non utilisé dans flows actuels |

**Justification :** Les données nom/prénom/civilité/code postal sont des informations d'identité générale qui appartiennent à la section `contact`, pas à la section métier `souscripteur`.

---

### Section SOUSCRIPTEUR (Données administratives)

| Clé actuelle (flows) | Clé normalisée (DB) | Transformation | Statut DB | Notes |
|----------------------|---------------------|----------------|-----------|-------|
| `adherent.date_naissance` | `souscripteur.dateNaissance` | Renommage section + camelCase | ✅ Existe | Date de naissance du souscripteur |
| `adherent.profession` | `souscripteur.profession` | Renommage section | ✅ Existe | Profession du souscripteur |
| `adherent.regime` | `souscripteur.regimeSocial` | Renommage section + propriété | ✅ Existe | Régime de sécurité sociale |
| `adherent.categorie` | `souscripteur.categorie` | Renommage section | ⚠️ **À AJOUTER EN DB** | Catégorie socio-professionnelle |
| `adherent.statut` | `souscripteur.statut` | Renommage section | ⚠️ **À AJOUTER EN DB** | Statut professionnel (TNS, SALARIE) |
| `adherent.departement` | `contact.departement` OU calcul | Déplacement | ⚠️ **À AJOUTER EN DB** ou calculer depuis `codePostal.substring(0,2)` |
| `projet.nb_enfants` | `souscripteur.nombreEnfants` OU calcul | Renommage section | ✅ Existe (ou calculé : `enfants.length`) | Nombre d'enfants |

---

### Section CONJOINT

| Clé actuelle (flows) | Clé normalisée (DB) | Transformation | Statut DB | Notes |
|----------------------|---------------------|----------------|-----------|-------|
| `conjoint.present` | `conjoint !== undefined` | Calcul dynamique | ✅ Calculé | Présence déduite de l'existence de l'objet |
| `conjoint.date_naissance` | `conjoint.dateNaissance` | camelCase | ✅ Existe | Date de naissance du conjoint |
| `conjoint.regime` | `conjoint.regimeSocial` | Renommage propriété | ✅ Existe | Régime social du conjoint |
| `conjoint.profession` | `conjoint.profession` | Aucune | ✅ Existe | Profession du conjoint |
| `conjoint.categorie` | `conjoint.categorie` | Aucune | ⚠️ **À AJOUTER EN DB** | Catégorie socio-professionnelle (Alptis uniquement) |
| `conjoint.statut` | `conjoint.statut` | Aucune | ⚠️ **À AJOUTER EN DB** | Statut professionnel (SwissLife uniquement) |

**Note sur `conjoint.present` :** Dans les flows, c'est un booléen utilisé dans `skipIfNot`. En DB, la présence du conjoint est indiquée par l'existence (ou non) de l'objet `conjoint`.

---

### Section ENFANTS

| Clé actuelle (flows) | Clé normalisée (DB) | Transformation | Statut DB | Notes |
|----------------------|---------------------|----------------|-----------|-------|
| `enfants` (boolean) | `enfants.length > 0` | Calcul dynamique | ✅ Calculé | Présence d'enfants (skipIfNot) |
| `enfants.0.date_naissance` | `enfants[0].dateNaissance` | Notation array + camelCase | ✅ Existe | Date de naissance enfant #1 |
| `enfants.1.date_naissance` | `enfants[1].dateNaissance` | Notation array + camelCase | ✅ Existe | Date de naissance enfant #2 |
| `enfants.2.date_naissance` | `enfants[2].dateNaissance` | Notation array + camelCase | ✅ Existe | Date de naissance enfant #3 |
| `enfants.0.regime` | `enfants[0].regime` | Notation array | ⚠️ **À AJOUTER EN DB** | Régime social enfant (Alptis) |
| `enfants.1.regime` | `enfants[1].regime` | Notation array | ⚠️ **À AJOUTER EN DB** | Régime social enfant (Alptis) |
| `enfants.2.regime` | `enfants[2].regime` | Notation array | ⚠️ **À AJOUTER EN DB** | Régime social enfant (Alptis) |
| `enfants.0.ayant_droit` | `enfants[0].ayantDroit` | Notation array + camelCase | ⚠️ **À AJOUTER EN DB** | Ayant droit enfant (SwissLife) |
| `enfants.1.ayant_droit` | `enfants[1].ayantDroit` | Notation array + camelCase | ⚠️ **À AJOUTER EN DB** | Ayant droit enfant (SwissLife) |
| `enfants.2.ayant_droit` | `enfants[2].ayantDroit` | Notation array + camelCase | ⚠️ **À AJOUTER EN DB** | Ayant droit enfant (SwissLife) |

**Note :** La notation change de `enfants.0.` vers `enfants[0].` pour cohérence avec la notation array JavaScript/TypeScript.

---

### Section PROJET / BESOINS

| Clé actuelle (flows) | Clé normalisée (DB) | Transformation | Statut DB | Notes |
|----------------------|---------------------|----------------|-----------|-------|
| `projet.date_effet` | `besoins.dateEffet` | Renommage section + camelCase | ✅ Existe | Date d'effet du contrat |
| `projet.nb_enfants` | `souscripteur.nombreEnfants` OU `enfants.length` | Déplacement OU calcul | ✅ Existe (ou calculé) | Redondant avec la longueur de l'array enfants |

**Note :** `projet.*` devient `besoins.*` pour cohérence avec la structure DB.

---

## 🎯 Valeurs Calculées / Dérivées

Ces clés ne sont PAS stockées directement en DB mais sont calculées dynamiquement :

| Clé (flows) | Calcul | Utilisation |
|-------------|--------|-------------|
| `conjoint.present` | `lead.conjoint !== undefined && lead.conjoint !== null` | Condition `skipIfNot` |
| `enfants` (boolean) | `lead.enfants && lead.enfants.length > 0` | Condition `skipIfNot` |
| `projet.nb_enfants` | `lead.enfants ? lead.enfants.length : 0` | Remplissage formulaire |
| `adherent.departement` | `lead.contact.codePostal.substring(0, 2)` | Dérivé du code postal |

**Important :** Ces valeurs doivent être calculées par le moteur d'exécution des flows, pas stockées en DB.

---

## ⚠️ Champs à Ajouter en DB

Pour que tous les flows fonctionnent correctement, ces champs doivent être ajoutés à la structure `LeadData` :

### Interface TypeScript à mettre à jour

```typescript
// src/shared/types/leads.ts

export interface SouscripteurInfo {
  dateNaissance?: string
  profession?: string
  regimeSocial?: string
  nombreEnfants?: number
  categorie?: string        // ⬅️ À AJOUTER
  statut?: string           // ⬅️ À AJOUTER
}

export interface ConjointInfo {
  civilite?: string
  prenom?: string
  nom?: string
  dateNaissance?: string
  profession?: string
  regimeSocial?: string
  categorie?: string        // ⬅️ À AJOUTER (Alptis uniquement)
  statut?: string           // ⬅️ À AJOUTER (SwissLife uniquement)
}

export interface EnfantInfo {
  dateNaissance?: string
  sexe?: string
  regime?: string           // ⬅️ À AJOUTER (Alptis)
  ayantDroit?: string       // ⬅️ À AJOUTER (SwissLife)
}

export interface ContactInfo {
  civilite?: string
  nom?: string
  prenom?: string
  telephone?: string
  email?: string
  adresse?: string
  codePostal?: string
  ville?: string
  departement?: string      // ⬅️ À AJOUTER OU calculer
}
```

---

## 📋 Checklist de Normalisation

### Flows à modifier
- [ ] `admin/flows/alptis/alptis_sante_select_pro_full.hl.json` (16 transformations)
- [ ] `admin/flows/swisslifeone/swisslifeone_slsis.hl.json` (18 transformations)

### Field Definitions à modifier
- [ ] `admin/field-definitions/swisslifeone.json` (22 domainKey à ajouter pour enfants)
- [ ] `admin/field-definitions/alptis.json` (vérification cohérence)

### Structure DB à mettre à jour (après normalisation)
- [ ] Ajouter `souscripteur.categorie`
- [ ] Ajouter `souscripteur.statut`
- [ ] Ajouter `conjoint.categorie`
- [ ] Ajouter `conjoint.statut`
- [ ] Ajouter `enfants[].regime`
- [ ] Ajouter `enfants[].ayantDroit`
- [ ] Ajouter `contact.departement` (optionnel)

---

## 🔍 Exemples de Transformation

### Exemple 1 : fillField simple

**AVANT :**
```json
{
  "type": "fillField",
  "domainField": "subscriber.lastName",
  "leadKey": "adherent.nom",
  "label": "fill-nom"
}
```

**APRÈS :**
```json
{
  "type": "fillField",
  "domainField": "subscriber.lastName",
  "leadKey": "contact.nom",
  "label": "fill-nom"
}
```

### Exemple 2 : Template value

**AVANT :**
```json
{
  "type": "fillField",
  "domainField": "project.name",
  "value": "Simulation {lead.adherent.nom} {lead.adherent.prenom}",
  "label": "fill-nom-projet"
}
```

**APRÈS :**
```json
{
  "type": "fillField",
  "domainField": "project.name",
  "value": "Simulation {lead.contact.nom} {lead.contact.prenom}",
  "label": "fill-nom-projet"
}
```

### Exemple 3 : Condition skipIfNot

**AVANT :**
```json
{
  "type": "fillField",
  "domainField": "spouse.birthDate",
  "leadKey": "conjoint.date_naissance",
  "skipIfNot": "conjoint.present",
  "label": "fill-naissance-conjoint"
}
```

**APRÈS :**
```json
{
  "type": "fillField",
  "domainField": "spouse.birthDate",
  "leadKey": "conjoint.dateNaissance",
  "skipIfNot": "conjoint",
  "label": "fill-naissance-conjoint"
}
```

**Note :** `skipIfNot` change de `"conjoint.present"` vers `"conjoint"` car la présence est maintenant déduite de l'existence de l'objet.

### Exemple 4 : Array notation

**AVANT :**
```json
{
  "type": "fillField",
  "domainField": "children[].birthDate",
  "leadKey": "enfants.0.date_naissance",
  "label": "fill-naissance-enfant-1"
}
```

**APRÈS :**
```json
{
  "type": "fillField",
  "domainField": "children[].birthDate",
  "leadKey": "enfants[0].dateNaissance",
  "label": "fill-naissance-enfant-1"
}
```

---

## 📊 Statistiques

| Catégorie | Nombre de clés | Transformations requises |
|-----------|----------------|-------------------------|
| **Contact** (identity) | 8 | 4 déplacements + 4 non-utilisées |
| **Souscripteur** (admin) | 7 | 6 renommages + 3 à ajouter en DB |
| **Conjoint** | 6 | 3 renommages + 2 à ajouter en DB |
| **Enfants** (par enfant) | 4 | 3 renommages + 2 à ajouter en DB |
| **Projet/Besoins** | 2 | 2 renommages |
| **Valeurs calculées** | 4 | Documentation seulement |
| **TOTAL** | **31 clés distinctes** | **~34 transformations dans flows** |

---

## 🚀 Prochaines Étapes

1. ✅ **Documentation créée** (ce fichier)
2. ⏳ **Normalisation des flows** (en cours)
3. ⏳ **Correction des field definitions** (en cours)
4. ⏳ **Création des JSON Schemas** (en cours)
5. ⏹️ **Mise à jour de la structure DB** (après validation)
6. ⏹️ **Tests avec leads réels** (après réimport en DB)

---

**Dernière mise à jour :** 2025-10-10
**Auteur :** Synthèse des analyses Agents A & B
