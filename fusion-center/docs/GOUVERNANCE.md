# Gouvernance, cadre juridique et conduite du changement

## 1. Cadre juridique et éthique (prérequis au sprint 0)

- **Base légale** : le traitement doit être adossé aux textes régissant les services de renseignement et les fichiers de
  souveraineté, avec un acte réglementaire décrivant finalités, catégories de données, durées de conservation, destinataires.
- **Protection des données** : consultation de la Commission de protection des données personnelles (CDP) selon le régime
  applicable aux traitements de sécurité nationale ; registre des traitements ; analyse d'impact.
- **Finalité et proportionnalité** : l'outil sert à investiguer et prévenir des menaces identifiées. Les règles de veille et
  les ingestions sont motivées et journalisées ; les requêtes exploratoires de masse sans dossier sont interdites par la charte.
- **Durées de conservation** : attribut `valid_to` sur les relations et purge planifiée par type de source (à implémenter sprint 3).
- **Droit de regard** : le journal d'audit chaîné permet un contrôle a posteriori par une autorité indépendante sans accès
  au contenu (vérification d'intégrité + statistiques d'usage par agent).

## 2. Organisation (recommandation n° 3 du rapport)

| Instance | Composition | Rôle |
| --- | --- | --- |
| Comité stratégique | Présidence (conseiller sécurité), MCTN, DG Renseignement | Finalités, budget, arbitrages juridiques, décision d'achat ou de développement |
| Comité de pilotage | MCTN, Senum, DRN, CCDOC, OSSI | Suivi du programme Scrum tous les 3 sprints |
| Cellule produit | PO DRN, Scrum Master Senum, équipe | Livraison |
| Autorité de contrôle interne | Officier de sécurité DRN + inspection | Revue mensuelle du journal d'audit, habilitations, incidents |

## 3. Conduite du changement (point central du rapport)

1. **Collaboration inter-services** : protocole d'échange de données signé par chaque FDS contributrice, avec un compartiment
   dédié par service et un officier de liaison tournant dans l'équipe Scrum.
2. **Formation** : parcours de 3 jours (ontologie, recherche, analyse de liens, dossiers, sécurité) ; fiches d'une page par
   fonctionnalité ; « super-utilisateurs » dans chaque service.
3. **Évolution des processus** : passage du compte rendu papier à la fiche d'entité sourcée ; toute hypothèse est consignée
   dans le dossier ; les décisions sont motivées et tracées.
4. **Organigramme DRN** : création d'une cellule fusion (administration de l'ontologie, qualité des données, résolution
   d'identité, veille) et d'une fonction d'officier de sécurité des données.

## 4. Exigences de souveraineté

- Hébergement sur territoire national, dans un local habilité ; aucune dépendance à un service cloud étranger.
- Code source détenu par l'État (Senum / CCDOC), licences libres uniquement, build reproductible hors ligne.
- Les éventuelles briques achetées (après tests comparatifs sur cas d'usage DRN) s'intègrent via l'API ; l'ontologie, les
  données et le journal d'audit restent dans le socle souverain.
- Réversibilité : export complet des données (JSON) et de l'audit à tout moment.

## 5. Contrôles de sécurité (état et cible)

| Contrôle | Prototype | Cible pilote |
| --- | --- | --- |
| Authentification | Mot de passe bcrypt, JWT 8 h | SSO OIDC, MFA, carte à puce |
| Cloisonnement | Niveaux + compartiments, 404 | + compartiments par dossier, durées de validité |
| Journalisation | Audit chaîné SHA-256 | + ancrage externe quotidien, SIEM |
| Chiffrement | TLS terminaison reverse-proxy | + chiffrement au repos, TLS mutuel inter-services |
| Développement | Tests automatisés, revue par pair | + analyse statique, scan de dépendances, tests d'intrusion semestriels |
| Exploitation | Docker | HA, sauvegardes chiffrées testées, PRA, supervision |
