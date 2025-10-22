# Scripts de Gestion de Base de Données

## Table des matières
- [Vue d'ensemble](#vue-densemble)
- [Scripts disponibles](#scripts-disponibles)
- [Préservation de tables lors du reset](#préservation-de-tables-lors-du-reset)
- [Exemples d'utilisation](#exemples-dutilisation)

## Vue d'ensemble

Ce dossier contient tous les scripts de gestion de la base de données SQLite pour le projet Mutuelles.

## Scripts disponibles

### `npm run db:reset` - Reset de la base de données

Reset complet de la base de données. **Supprime toutes les données** et recrée le schéma.

**Options:**
- `--seed` : Exécute les seeders après le reset
- `--dry-run` : Mode simulation (affiche ce qui serait fait sans l'exécuter)
- `--only <seeders>` : N'exécute que les seeders spécifiés (séparés par des virgules)
- `--skip <seeders>` : Ignore les seeders spécifiés (séparés par des virgules)
- `--preserve-tables <tables>` : **NOUVEAU** Préserve les tables spécifiées lors du reset
- `--keep-tables <tables>` : Alias pour `--preserve-tables`
- `--help, -h` : Affiche l'aide

### `npm run db:migrate` - Exécution des migrations

Exécute les migrations de schéma.

### `npm run db:seed` - Peuplement de la base de données

Peuple la base de données avec des données de test/développement.

**Options:**
- `--dry-run` : Mode simulation
- `--only <seeders>` : N'exécute que les seeders spécifiés
- `--skip <seeders>` : Ignore les seeders spécifiés
- `--force` : Force le re-seed même si les données existent déjà
- `--list` : Liste les seeders disponibles

### `npm run db:dump` - Dump de la base de données

Crée un dump SQL de la base de données.

**Options:**
- `--schema-only` : Exporte uniquement le schéma (pas de données)
- `--data-only` : Exporte uniquement les données (pas de schéma)
- `--output, -o <fichier>` : Nom du fichier de sortie personnalisé

### `npm run db:status` - Statut de la base de données

Affiche l'état actuel de la base de données (migrations, statistiques, etc.).

## Préservation de tables lors du reset

### Pourquoi préserver des tables ?

Lors du développement, vous pouvez vouloir :
- Reset le schéma sans perdre vos données de test
- Conserver certaines configurations (credentials, platforms, profiles)
- Réinitialiser uniquement certaines parties de la DB

### Comment ça marche ?

Le script de reset avec l'option `--preserve-tables` fonctionne en 4 étapes :

1. **Backup** : Sauvegarde les données des tables spécifiées en mémoire
2. **Delete** : Supprime complètement la base de données
3. **Rebuild** : Recrée le schéma via les migrations
4. **Restore** : Restaure les données sauvegardées dans les nouvelles tables

### Tables disponibles

Voici les principales tables que vous pouvez préserver :

- `platforms_catalog` : Catalogue des plateformes (Alptis, SwissLife, etc.)
- `platform_credentials` : Identifiants de connexion aux plateformes
- `profiles` : Profils de navigateur Chrome
- `clean_leads` : Leads nettoyés
- `settings` : Paramètres de l'application
- `execution_runs` : Historique des exécutions
- `execution_items` : Items d'exécution
- `execution_steps` : Étapes d'exécution
- `execution_attempts` : Tentatives d'exécution

> **Note** : Pour voir la liste complète des tables, utilisez `npm run db:status`

### Limitations

- Les tables doivent exister dans le nouveau schéma (après migrations)
- Si le schéma de la table a changé, la restauration peut échouer
- Les relations (foreign keys) doivent être cohérentes

## Exemples d'utilisation

### Reset basique

```bash
# Reset complet (perd toutes les données)
npm run db:reset

# Reset + seed automatique
npm run db:reset --seed

# Simulation
npm run db:reset --dry-run
```

### Reset avec préservation de tables

```bash
# Préserver les credentials et platforms
npm run db:reset -- --preserve-tables "platforms_catalog,platform_credentials"

# Préserver plusieurs tables
npm run db:reset -- --preserve-tables "platforms_catalog,platform_credentials,profiles,settings"

# Préserver + seed (les seeders ne remplaceront pas les données préservées)
npm run db:reset -- --seed --preserve-tables "platforms_catalog"

# Mode simulation pour voir ce qui sera fait
npm run db:reset -- --dry-run --preserve-tables "clean_leads"
```

**⚠️ Important :** 
- Utilisez `--` avant les options pour les passer au script
- Mettez les noms de tables entre **guillemets** si vous en spécifiez plusieurs (séparées par des virgules)

### Seed sélectif

```bash
# Seed uniquement les platforms
npm run db:seed:platforms

# Seed tous sauf credentials
npm run db:seed -- --skip credentials

# Force re-seed même si les données existent
npm run db:seed -- --force
```

### Dump et restauration

```bash
# Dump complet
npm run db:dump

# Dump uniquement le schéma
npm run db:dump:schema

# Dump avec nom personnalisé
npm run db:dump -- --output backup_avant_modif.sql
```

### Workflow typique de développement

```bash
# 1. Vérifier l'état actuel
npm run db:status

# 2. Faire un backup de sécurité
npm run db:dump -- --output backup_$(date +%Y%m%d).sql

# 3. Reset en préservant les données importantes
npm run db:reset -- --preserve-tables "platforms_catalog,platform_credentials,profiles"

# 4. Vérifier que tout est OK
npm run db:status

# 5. Lancer l'app
npm run dev
```

## Variables d'environnement

Pour les seeders de credentials :

```bash
ALPTIS_USERNAME=votre_username
ALPTIS_PASSWORD=votre_password
SWISSLIFE_USERNAME=votre_username
SWISSLIFE_PASSWORD=votre_password
```

## Dépannage

### Erreur "EBUSY: resource busy or locked"

La base de données est verrouillée par un autre processus.

**Solution** : Fermez tous les processus qui utilisent la DB (notamment l'application Electron).

### Erreur "Table 'xxx' does not exist"

La table que vous essayez de préserver n'existe pas dans la base de données actuelle.

**Solution** : Vérifiez le nom exact de la table avec `npm run db:status` ou en inspectant un dump.

### Les données préservées ne sont pas restaurées

La table existe peut-être dans la nouvelle DB mais avec un schéma différent.

**Solution** : Vérifiez que le schéma de la table n'a pas changé dans les migrations récentes.

## Debug

Pour activer le mode debug :

```bash
DEBUG=1 npm run db:reset --preserve-tables ...
```

Cela affichera la stack trace complète en cas d'erreur.
