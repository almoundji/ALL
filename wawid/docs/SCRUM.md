# WawID — Organisation Scrum

## Rôles
- **Product Owner** : WAW Telecom, en lien avec la Direction de la Police de l'Air et des Frontières (DPAF) et la Direction de l'Automatisation des Fichiers (DAF).
- **Scrum Master** : chef de projet WAW Telecom.
- **Équipe de développement** (6–8 personnes) : back-end, front-end Fiori, biométrie, intégration matérielle, sécurité/DevOps, QA.
- **Parties prenantes** : PAF, douanes, ministère des Affaires étrangères (e-Visa), AIBD SA, BCN Interpol Dakar, CDP.

## Rituels (sprints de 2 semaines)
| Rituel | Durée | Contenu |
| --- | --- | --- |
| Sprint planning | 2 h | Objectif du sprint, sélection des user stories, découpage en tâches |
| Daily | 15 min | Avancement, obstacles |
| Revue de sprint | 1 h | Démonstration au PO et aux utilisateurs pilotes (agents AIBD) |
| Rétrospective | 1 h | Amélioration continue |
| Affinage du backlog | 1 h / semaine | Estimation (points de Fibonacci), critères d'acceptation |

## Définition de « terminé »
- Code revu, tests automatisés verts (`npm test`), aucune régression.
- Parcours vérifié dans le navigateur (clair, sombre, mobile).
- Accessibilité : statuts toujours libellés (pas de couleur seule), navigation clavier.
- Toute action sensible journalisée dans l'audit chaîné ; droits vérifiés côté serveur.
- Documentation mise à jour.

## Sprints
| Sprint | Objectif | État |
| --- | --- | --- |
| S0 | Cadrage, architecture, design system Fiori × WAW, déploiement continu | Terminé |
| S1 | MVP contrôle guichet : MRZ ICAO, biométrie, moteur de risque, passages, tableau de bord entrées/sorties/fraude | Terminé |
| S2 | eGates & ABC : kiosque, éligibilité, supervision et commandes à distance | Terminé |
| S3 | e-Visa (TAS/VMS), WawPass, portail voyageur, QR signés | Terminé |
| S4 | Renseignement & APIS : Threat Monitor, dossiers, listes Interpol/FPR/WAPIS/POI/SLTD, règles, connecteurs, recherche 360° | Terminé |
| S5 | Intégrations réelles : Interpol I-24/7 via BCN, WAPIS, FPR, SDK biométrique certifié, lecteurs RFID, eGates constructeur, PAXLST/PNRGOV | En cours |
| S6 | Sécurité & passage à l'échelle nationale : PostgreSQL + Kafka, SSO/MFA/PKI, mode hors ligne des postes, pentest, CDP (voir `ARCHITECTURE.md`) | À venir |
| S7 | Pilote AIBD : recette, test de charge (15 000 pax/h), formation, MCO | À venir |
| S8 | Généralisation : postes terrestres et maritimes, VRS/ANPR, CCTV, BI avancée | À venir |

Le détail des user stories et des points est visible dans le back-office : tuile **Projet (Scrum)**.
