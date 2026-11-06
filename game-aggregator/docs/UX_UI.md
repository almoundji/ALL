# Nom, UX et charte graphique — Agrégateur de jeux

## 1. Nom proposé

### Recommandation : **YOON**

*Yoon* signifie **le chemin** en wolof. C'est exactement ce qu'est un agrégateur : un seul chemin qui relie
tous les opérateurs à tous les jeux.

- 4 lettres, se prononce de la même façon en wolof, en français et en anglais.
- Fonctionne seul (« Yoon »), en sous-marques (*Yoon Wallet*, *Yoon Studio*, *Yoon Connect*) et en nom d'API (`api.yoon.sn`).
- Signature : **« Un seul chemin vers tous les jeux. »** / *« One path to every game. »*
- Logotype : les deux « o » forment un chemin ou une piste, le « n » final en couleur d'accent.

### Alternatives

| Nom | Sens | Point fort | Réserve |
| --- | --- | --- | --- |
| **Dalal** | « Bienvenue » (*dalal ak jamm*) | Chaleureux, grand public | Plus B2C que B2B |
| **Gaïndé** | Le lion, emblème national | Identité forte, prestige | Très associé à l'équipe nationale |
| **Siggi** | « Lève la tête », fierté | Court, positif | Tréma peu pratique en nom de domaine |
| **Jëf** | « L'acte », l'action | Évoque le jeu, le geste | Même problème de caractère spécial |

Avant de trancher : vérifier la disponibilité du nom de domaine (`.sn`, `.com`), de la marque à l'OAPI et des
réseaux sociaux.

---

## 2. UX : les principes SAP Fiori appliqués à Yoon

Fiori repose sur cinq principes : **basé sur les rôles, adaptatif, cohérent, simple, agréable**. Voici leur traduction.

### 2.1 Basé sur les rôles : un lanceur (launchpad) par métier

L'écran d'accueil est un **lanceur de tuiles**. Chaque utilisateur ne voit que les tuiles de son rôle, et chaque tuile
affiche un **chiffre vivant** (indicateur) avant même d'être ouverte.

| Rôle | Tuiles du lanceur |
| --- | --- |
| **Administrateur Yoon** | Opérateurs, Fournisseurs, Catalogue, Supervision, Journal d'audit, Utilisateurs |
| **Opérateur** (casino, site de paris) | Mes jeux actifs, Joueurs, Sessions en cours, GGR du jour, Bonus, Factures |
| **Fournisseur** (studio) | Mes jeux, Tours joués, RTP constaté, Incidents de callback, Revenus |
| **Conformité** | Limites et auto-exclusions, Alertes LCB-FT, Contrôles d'âge, Journal d'audit, Rapports régulateur |
| **Finance** | GGR, Partage de revenus, Rapprochement quotidien, Factures, Litiges |

### 2.2 Les gabarits d'écran (floorplans) Fiori à réutiliser

| Gabarit Fiori | Usage dans Yoon |
| --- | --- |
| **Launchpad** | Page d'accueil en tuiles, groupées par domaine |
| **Shell bar** | Barre supérieure fixe : logo, recherche globale (`Ctrl+K`), notifications, profil, sélecteur de rôle |
| **List Report** | Toutes les listes : jeux, joueurs, transactions, sessions. Barre de filtres en haut, tableau en dessous, actions en bas à droite |
| **Object Page** | Fiche d'un objet (un jeu, un joueur, un tour) : en-tête avec indicateurs, puis sections ancrées (Général, Transactions, Historique, Audit) |
| **Analytical List Page** | Reporting GGR : indicateurs clés en haut, graphiques au milieu, tableau détaillé en bas |
| **Overview Page** | Tableau de bord opérateur : cartes synthétiques (GGR, joueurs actifs, alertes) |
| **Wizard** | Intégration d'un nouvel opérateur ou fournisseur en 4 étapes |
| **Worklist** | File des tâches de conformité (alertes à traiter, limites à valider) |
| **Message Page** | États vides et erreurs, toujours avec une action proposée |

### 2.3 Règles d'interface

1. **Une action principale par écran**, en bas à droite, en couleur d'accent. Le reste en boutons secondaires.
2. **Les montants** : toujours alignés à droite, séparateur de milliers, devise explicite (`125 000 FCFA`), jamais en police proportionnelle dans les tableaux.
3. **Couleurs sémantiques réservées** : vert = positif, orange = à surveiller, rouge = bloquant, bleu = information. Jamais pour la décoration.
4. **Statuts en texte + couleur** (pas seulement la couleur) : `● Actif`, `● Suspendu`, `● Auto-exclu`.
5. **Adaptatif** : lanceur et fiches utilisables sur tablette (agents terrain, support), tableaux lisibles sur mobile en mode cartes.
6. **Temps réel discret** : les indicateurs des tuiles se rafraîchissent sans rechargement ; une pastille signale les alertes.
7. **Navigation par ancres** dans les fiches, fil d'Ariane dans la shell bar, retour toujours possible.
8. **Conformité visible** : toute action sensible (limite, auto-exclusion, remboursement) demande une confirmation avec motif, et affiche « Journalisé » après validation.

---

## 3. Charte graphique

Objectif : sobre et premium, lisible huit heures par jour, à l'opposé des interfaces criardes des sites de jeux.
Un fond clair quasi neutre, une seule couleur de marque, un accent chaud pour les actions.

### 3.1 Couleurs

| Rôle | Nom | Clair | Sombre |
| --- | --- | --- | --- |
| Marque | **Indigo Yoon** | `#1B2A6B` | `#8FA3FF` |
| Accent / action principale | **Or Sahel** | `#E0A227` | `#F2C35B` |
| Fond de page | — | `#F4F5F9` | `#0F1424` |
| Surface (cartes, tuiles) | — | `#FFFFFF` | `#182040` |
| Bordure | — | `#DDE1EC` | `#2A3357` |
| Texte principal | — | `#1A1F36` | `#E8ECFA` |
| Texte secondaire | — | `#5B6480` | `#9AA5C8` |
| Positif | — | `#1E7D4A` | `#4FCB84` |
| À surveiller | — | `#C7681B` | `#F2994A` |
| Négatif | — | `#B3261E` | `#FF6B64` |
| Information | — | `#2563EB` | `#7AA7FF` |

Règle de contraste : texte sur fond ≥ 4,5:1 (WCAG AA). L'or n'est jamais utilisé pour du texte sur blanc ;
il sert aux boutons (texte indigo foncé dessus), aux soulignements et aux mises en avant.

### 3.2 Typographie

| Usage | Police | Taille / graisse |
| --- | --- | --- |
| Interface | **Inter** (libre) | 14 px corps, 13 px tableaux, 600 pour les libellés |
| Titres | Inter | 28 px / 700 (page), 18 px / 700 (section), 13 px capitales espacées / 600 (sur-titre) |
| Chiffres clés (tuiles) | Inter, chiffres tabulaires | 40 px / 300 |
| Montants, identifiants, codes | **JetBrains Mono** | 13 px |

### 3.3 Formes et espacements

- Grille de 8 px ; marges de page 28 px ; espacement entre tuiles 16 px.
- Rayons : 10 px (tuiles, cartes), 6 px (champs, boutons), 40 px (pastilles de statut).
- Ombres : aucune au repos ; légère au survol des tuiles (`0 6px 18px rgba(27,42,107,.08)`).
- Icônes : trait fin 1,5 px, 20 px (Lucide, libre), jamais d'emoji dans l'interface.
- Mode sombre complet, choix mémorisé par utilisateur.

### 3.4 Ton éditorial

- Français clair, vouvoiement, phrases courtes. Anglais disponible pour les fournisseurs internationaux.
- Pas de jargon casino dans l'interface opérateur : « tour » plutôt que *spin*, « mise » plutôt que *bet*, « gain » plutôt que *payout*. Les termes anglais restent dans l'API.
- Les messages d'erreur disent **quoi** et **que faire** : « Le fournisseur n'a pas répondu en 5 s. Le tour est mis en attente, réessayez ou annulez-le. »

---

## 4. Place dans le calendrier Scrum

| Quand | Livrable UX/UI | Validé par |
| --- | --- | --- |
| Semaine 1 | Nom choisi, domaine et marque vérifiés, charte v1 (couleurs, typographie) | Sponsor + PO |
| Sprint 0 | Maquette du lanceur et de la shell bar, jetons de la charte dans le code, gabarits List Report / Object Page vides | PO en Sprint Review |
| Sprint 1 | Lanceur opérateur avec chiffres réels, liste et fiche jeu | PO en Sprint Review |
| Sprints 2–8 | Un gabarit par module livré (voir feuille de route dans `SCRUM.md`) | PO en Sprint Review |

Chaque maquette est préparée **au plus un sprint avant** le module qu'elle sert, discutée au *Refinement*, et entre
dans la *Definition of Done* du sprint : une story n'est finie que si son écran respecte la charte et le gabarit Fiori prévu.

## 5. Maquette

Une maquette statique du lanceur (rôle opérateur) est dans `../mockup/launchpad.html`. Elle applique la charte,
la shell bar et les tuiles à indicateurs. Elle sert de référence visuelle pour le Sprint 0.
