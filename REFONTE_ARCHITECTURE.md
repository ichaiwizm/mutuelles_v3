# Architecture Refonte v2.0 - Structure "Cerveau / Traducteurs / Ouvriers"

## Vue d'ensemble

Cette refonte remplace l'architecture monolithique par une architecture découplée et modulaire.

## Structure des Dossiers

```
src/
├── core/                    # LE CERVEAU - Logique métier centrale
│   ├── models/              # Modèles de données (LeadGenerique, Tache)
│   ├── queue/               # Gestionnaire de file d'attente
│   ├── worker/              # Worker d'exécution asynchrone
│   └── services/            # Services métier (gestion leads, tâches)
│
├── mappers/                 # LES TRADUCTEURS - Conversion LeadGenerique → données spécifiques
│   ├── swisslife/
│   │   ├── sante-pro.mapper.ts
│   │   └── sante-plus.mapper.ts
│   └── alptis/
│       ├── sante-pro.mapper.ts
│       └── sante-plus.mapper.ts
│
├── adapters/                # LES OUVRIERS - Automatisation Playwright par plateforme
│   ├── swisslife.adapter.ts
│   └── alptis.adapter.ts
│
├── parsers/                 # Parsers (gardés et adaptés)
│   ├── orchestrator.ts      # Orchestrateur de parsers
│   └── providers/           # Parsers par format
│       ├── assurprospect.parser.ts
│       └── assurlead.parser.ts
│
├── ui/                      # Interface utilisateur React
│   ├── layouts/             # Layout du tableau de bord 3 panneaux
│   ├── panels/              # Les 3 panneaux principaux
│   │   ├── LeadsPanel.tsx           # Panneau gauche - Liste leads
│   │   ├── DetailPanel.tsx          # Panneau central - Détails + Actions
│   │   └── HistoryPanel.tsx         # Panneau droit - Historique
│   └── components/          # Composants réutilisables
│
├── shared/
│   ├── types/               # Types TypeScript partagés
│   │   ├── models.ts        # LeadGenerique, Tache
│   │   ├── mappers.ts       # Types pour mappers
│   │   └── adapters.ts      # Types pour adapters
│   ├── db/                  # Connexion et schéma DB
│   └── utils/               # Utilitaires
│
└── main/                    # Processus principal Electron
    ├── ipc/                 # Handlers IPC
    └── secrets/             # Gestionnaire de secrets OS
```

## Flux de Données

```
1. Import/Saisie → LeadGenerique
2. Sélection Tâche → File d'attente (DB)
3. Worker récupère Tâche
4. Mapper traduit LeadGenerique → Données spécifiques
5. Adapter exécute l'automatisation Playwright
6. Résultats → DB → UI (temps réel)
```

## Principes Architecturaux

### 1. Modèle Canonique Unique
- **LeadGenerique** est la SEULE structure de données utilisée
- Tous les parsers génèrent un LeadGenerique
- L'UI affiche et édite des LeadGenerique
- La DB stocke des LeadGenerique

### 2. Découplage Total
- Mappers : Fonctions pures (LeadGenerique → Données spécifiques)
- Adapters : Ne connaissent QUE les données spécifiques
- UI : "Idiote", affiche l'état, ne contient pas de logique métier

### 3. File d'Attente et Asynchronisme
- Toutes les tâches passent par une file d'attente DB
- Worker exécute les tâches une par une
- UI mise à jour en temps réel via événements

### 4. Zéro Configuration JSON
- Pas de "gros JSON de pilotage"
- Configuration minimale en dur dans le code
- Sécurité : secrets dans le gestionnaire OS natif

## État d'Avancement

- [x] Exploration architecture existante
- [ ] Définition types TypeScript
- [ ] Création structure dossiers
- [ ] Implémentation Core
- [ ] Implémentation UI
- [ ] Refactoring Parsers
- [ ] Création Mappers
- [ ] Refactoring Adapters
- [ ] Nouveau schéma DB
- [ ] Tests et validation
