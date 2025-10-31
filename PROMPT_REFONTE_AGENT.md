MANIFESTE DE REFONTE : PROJET "BROKER-AUTOMATION" (v2.0)

À LIRE AVANT CHAQUE ACTION. CECI EST VOTRE UNIQUE SOURCE DE VÉRITÉ.

1. Contexte & Objectif Principal

Vous êtes l'architecte et le développeur principal chargé de la refonte complète d'une application desktop pour courtiers en assurance. L'objectif est de remplacer une architecture monolithique, fragile (basée sur un "gros JSON" de pilotage) et difficile à maintenir par un système modulaire, robuste et découplé.

Votre mission : Exécuter une refonte totale (back-end et front-end). L'ancienne architecture doit être entièrement démantelée. Aucune trace de l'ancien design (ni UI, ni logique de pilotage) ne doit subsister.

Tolérance zéro pour la dette technique.

2. L'Architecture Cible (Non Négociable)

Nous adoptons une architecture découplée "Cerveau / Traducteurs / Ouvriers".

A. Le "Modèle Canonique" (La Donnée)

Action : Définir un modèle de données unique et générique pour un "Lead" (ex: LeadGenerique). Ce modèle contient TOUS les champs possibles (prospect, conjoint, enfants, besoins, etc.) sous une forme standardisée.

Règle : C'est la seule structure de données de lead utilisée dans l'application (UI, base de données, file d'attente).

B. Le "Cerveau" (Le Cœur & l'UI)

Action : Le Cerveau est l'application desktop.

Rôle (UI) : L'interface utilisateur est "idiote". Elle ne fait qu'afficher les LeadGenerique et l'état des tâches.

Rôle (Logique) :

Prendre un LeadGenerique (via saisie, import, API).

Permettre à l'utilisateur de sélectionner des "Tâches" (ex: "Swisslife - Santé Pro", "Alptis - Santé Plus").

Placer ces tâches dans une file d'attente (base de données SQLite).

Piloter un "Worker" qui exécute les tâches de manière asynchrone.

Mettre à jour l'UI avec les résultats (Succès, Échec, Logs, PDF).

C. Les "Traducteurs" (Mappers)

Action : Créer un répertoire /src/mappers.

Règle : Un (1) module/fichier par produit de plateforme (ex: swisslife-sante-pro.mapper.ts).

Rôle : Fonction pure. Prend un LeadGenerique en entrée, retourne un objet de données spécifique à ce produit (ex: { sl_nom: "...", sl_date_naiss: "..." }).

D. Les "Ouvriers" (Adapters)

Action : Créer un répertoire /src/adapters.

Règle : Un (1) module/fichier par plateforme (ex: swisslife.adapter.ts).

Rôle : Contient toute la logique Playwright pour une plateforme. Expose des méthodes claires (ex: async login(), async remplirDevisSantePro(donneesSpecifiques), async recupererResultat()).

Règle : L'Adapter ne connaît pas le LeadGenerique. Il ne consomme que les données spécifiques fournies par le "Traducteur".

3. Directives de Refonte UX/UI

L'ancien formulaire "fourre-tout" est supprimé.

Action : Implémenter une nouvelle interface de type "Tableau de Bord à 3 panneaux".

Panneau Gauche : Liste des Leads (basée sur le LeadGenerique). Boutons d'import et de saisie.

Panneau Central : Affiche le LeadGenerique sélectionné. En dessous, une checklist des "Actions" (tâches) disponibles pour ce lead. Un gros bouton "Lancer".

Panneau Droit : Historique et statut en temps réel des tâches pour le lead sélectionné (En attente, En cours, Succès, Échec + lien vers résultats).

Règle : L'UI de saisie/édition de lead est 100% basée sur le LeadGenerique.

4. Directives Techniques & Qualité (Intransigeance)

A. Récupération vs. Suppression

À SUPPRIMER :

L'ancienne structure de base de données.

L'ancien formulaire UI.

Le "gros JSON" de pilotage et son moteur d'exécution.

À GARDER & ADAPTER :

La logique pure des parsers (Email, CSV, etc.) est conservée.

Action : Modifier ces parsers pour qu'ils génèrent et retournent un LeadGenerique parfaitement typé.

B. Base de Données & Sécurité

Données : SQLite est validé.

Schéma : Refonte totale. Une table pour les Leads (stockant le LeadGenerique), une table pour les Taches (liée au Lead, avec statut, logs, chemin_resultat).

Sécurité (Impératif) : Les identifiants des plateformes (login/mdp) ne doivent JAMAIS être stockés dans SQLite.

Action : Utiliser le gestionnaire de secrets natif de l'OS (Keychain sur macOS, Windows Credential Manager) via une librairie adaptée (ex: keytar).

C. Standards de Code

Structure des Fichiers : Chaque chose à sa place. La structure de dossiers doit refléter l'architecture (ex: /src/core, /src/ui, /src/adapters, /src/mappers, /src/shared/types, /src/main).

Limite de Fichiers : Aucun fichier de code ne doit dépasser 100 lignes (hors fichiers de configuration, de mapping pur, ou de types). Si c'est le cas, il doit être décomposé.

Typage : TypeScript est utilisé en mode strict. Aucune erreur TypeScript n'est tolérée.

Tests : Vous devez tester les builds (npm run build ou équivalent) régulièrement pour valider l'absence d'erreurs de compilation.

5. Méta-Instruction

Relis ce manifeste.

Commence par définir la structure des dossiers et les types de données (LeadGenerique, Tache, etc.).

Attaque la refonte, en commençant par le Cœur, puis l'UI, et enfin en re-câblant les Adapters et les Mappers.

À chaque étape majeure, relis ce manifeste pour garantir la conformité.