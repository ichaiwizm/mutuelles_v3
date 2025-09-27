# Database Management System

Ce dossier contient le nouveau système de gestion de base de données avec migrations versionnées et seeds modulaires.

## Architecture

```
scripts/db/
├── core/
│   ├── connection.mjs      # Gestion connexion DB unifiée
│   ├── migrator.mjs        # Moteur de migrations
│   └── seeder.mjs          # Moteur de seeds
├── migrations/
│   ├── 001_initial_schema.mjs
│   ├── 002_add_leads_tables.mjs
│   ├── 003_add_flows_tables.mjs
│   └── 004_add_indexes.mjs
├── seeds/
│   ├── 01_platforms.mjs    # Plateformes (Alptis, Swisslife)
│   ├── 02_flows.mjs        # Import flows depuis JSON
│   ├── 03_leads.mjs        # Leads de test
│   ├── 04_credentials.mjs  # Credentials depuis env vars
│   └── 05_profiles.mjs     # Profils Chrome
├── reset.mjs               # Reset complet
├── migrate.mjs             # Migrations
├── seed.mjs                # Seeds
└── status.mjs              # Statut DB
```

## Commandes principales

### Reset et initialisation
```bash
# Reset complet avec structure vierge
npm run db:reset

# Reset avec toutes les données de test
npm run db:reset:seed

# Voir ce qui serait fait (dry-run)
npm run db:reset:dry
```

### Migrations
```bash
# Exécuter les migrations pendantes
npm run db:migrate

# Voir le statut des migrations
npm run db:migrate:status

# Dry-run des migrations
npm run db:migrate:dry
```

### Seeds (données de test)
```bash
# Exécuter tous les seeds
npm run db:seed

# Lister les seeds disponibles
npm run db:seed:list

# Seeds spécifiques
npm run db:seed:platforms
npm run db:seed:flows
npm run db:seed:leads
npm run db:seed:credentials
npm run db:seed:profiles

# Dry-run des seeds
npm run db:seed:dry
```

### Statut
```bash
# Vue d'ensemble de la DB
npm run db:status

# Informations détaillées
npm run db:status:verbose
```

## Seeds inclus

### 1. Plateformes (Required)
- **Alptis** et **Swisslife** avec leurs pages et champs
- Pages de connexion avec identifiant/mot de passe
- Sélection automatique des plateformes

### 2. Flows (Optional)
- Import automatique depuis le dossier `flows/`
- **Flows par défaut :**
  - `alptis_login` - Connexion Alptis
  - `alptis_sante_select_pro_full` - Alptis Santé Select – Informations projet complet

### 3. Leads (Optional)
- 3 leads de test avec données complètes
- Sources variées : manual, gmail, file
- Providers : generic, assurprospect, assurlead

### 4. Credentials (Optional)
- Lecture depuis variables d'environnement
- Chiffrement automatique avec Electron safeStorage
- Variables supportées :
  - `ALPTIS_USERNAME` / `ALPTIS_PASSWORD`
  - `SWISSLIFE_USERNAME` / `SWISSLIFE_PASSWORD`

### 5. Profiles (Optional)
- Profils Chrome de test
- Répertoires automatiquement créés
- Configuration basique pré-configurée

## Variables d'environnement

```bash
# Credentials (optionnel pour seeding)
ALPTIS_USERNAME=your_username
ALPTIS_PASSWORD=your_password
SWISSLIFE_USERNAME=your_username
SWISSLIFE_PASSWORD=your_password

# Configuration DB
MUTUELLES_DB_DIR=./dev-data  # Par défaut
```

## Utilisation dans l'application

L'application utilise désormais une approche simplifiée :

1. **Au démarrage**, elle vérifie que la DB existe
2. **Si elle n'existe pas**, affiche un message pour exécuter `npm run db:reset:seed`
3. **Les migrations et seeds sont gérés par les scripts CLI uniquement**

Cela évite la complexité de l'ancien système qui mélangeait init application et gestion de schéma.

## Extensibilité

### Ajouter une migration
1. Créer `scripts/db/migrations/00X_nom_migration.mjs`
2. Exporter un objet avec `version`, `name`, `up()` et optionnel `down()`

### Ajouter un seeder
1. Créer `scripts/db/seeds/0X_nom_seeder.mjs`
2. Exporter un objet avec `name`, `description`, `run(db, options)`

### Modifier la structure
Le système est modulaire, chaque composant peut être modifié indépendamment.